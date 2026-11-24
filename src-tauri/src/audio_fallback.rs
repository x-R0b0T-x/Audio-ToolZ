use std::io::Cursor;
use symphonia::core::{
    audio::AudioSpec,
    codecs::{audio::AudioDecoderOptions, CodecParameters},
    formats::{probe::Hint, FormatOptions},
    io::MediaSourceStream,
    meta::MetadataOptions,
};

#[tauri::command]
pub async fn decode_audio_fallback(data: Vec<u8>) -> Result<tauri::ipc::Response, String> {
    tauri::async_runtime::spawn_blocking(move || decode(data).map(tauri::ipc::Response::new))
        .await.map_err(|e| e.to_string())?
}

fn decode(data: Vec<u8>) -> Result<Vec<u8>, String> {
    let stream = MediaSourceStream::new(Box::new(Cursor::new(data)), Default::default());
    let mut format = symphonia::default::get_probe()
        .probe(&Hint::new(), stream, FormatOptions::default(), MetadataOptions::default())
        .map_err(|e| format!("Conteneur inconnu ou endommagé : {e}"))?;
    let (id, mut decoder) = format.tracks().iter().find_map(|track| {
        let params = match track.codec_params.as_ref()? {
            CodecParameters::Audio(params) => params,
            _ => return None,
        };
        symphonia::default::get_codecs()
            .make_audio_decoder(params, &AudioDecoderOptions::default())
            .ok().map(|decoder| (track.id, decoder))
    }).ok_or("Aucune piste audio compatible.")?;

    // IPC protocol is unchanged: LE sample rate, LE channel count, interleaved f32 LE.
    let mut out = vec![0u8; 8];
    let mut spec: Option<AudioSpec> = None;
    let mut samples = Vec::<f32>::new();
    while let Some(packet) = format.next_packet().map_err(|e| e.to_string())? {
        if packet.track_id != id { continue; }
        let audio = decoder.decode(&packet).map_err(|e| e.to_string())?;
        if audio.is_empty() { continue; }
        let rate = audio.spec().rate();
        let channels = u32::try_from(audio.num_planes())
            .map_err(|_| "Nombre de canaux invalide.")?;
        if rate == 0 || channels == 0 {
            return Err("Format audio invalide.".into());
        }
        if let Some(previous) = spec.as_ref() {
            if previous != audio.spec() {
                return Err("Format audio variable non pris en charge.".into());
            }
        } else {
            spec = Some(audio.spec().clone());
            out[..4].copy_from_slice(&rate.to_le_bytes());
            out[4..8].copy_from_slice(&channels.to_le_bytes());
        }
        samples.resize(audio.samples_interleaved(), 0.0);
        audio.copy_to_slice_interleaved(&mut samples[..]);
        for sample in &samples {
            if !sample.is_finite() {
                return Err("Échantillon audio non fini.".into());
            }
            out.extend_from_slice(&sample.to_le_bytes());
        }
    }
    if out.len() == 8 { return Err("Aucun échantillon audio exploitable.".into()); }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::decode;

    fn wave(tag: u16, bits: u16, channels: u16, rate: u32, payload: &[u8]) -> Vec<u8> {
        let mut bytes = Vec::new();
        bytes.extend_from_slice(b"RIFF");
        bytes.extend_from_slice(&(36 + payload.len() as u32).to_le_bytes());
        bytes.extend_from_slice(b"WAVEfmt ");
        bytes.extend_from_slice(&16u32.to_le_bytes());
        bytes.extend_from_slice(&tag.to_le_bytes());
        bytes.extend_from_slice(&channels.to_le_bytes());
        bytes.extend_from_slice(&rate.to_le_bytes());
        bytes.extend_from_slice(&(rate * u32::from(channels) * u32::from(bits) / 8).to_le_bytes());
        bytes.extend_from_slice(&(channels * bits / 8).to_le_bytes());
        bytes.extend_from_slice(&bits.to_le_bytes());
        bytes.extend_from_slice(b"data");
        bytes.extend_from_slice(&(payload.len() as u32).to_le_bytes());
        bytes.extend_from_slice(payload);
        bytes
    }

    fn pcm16(channels: u16, rate: u32, samples: &[i16]) -> Vec<u8> {
        let payload: Vec<u8> = samples.iter().flat_map(|s| s.to_le_bytes()).collect();
        wave(1, 16, channels, rate, &payload)
    }

    fn unpack(bytes: Vec<u8>) -> (u32, u32, Vec<f32>) {
        assert!(bytes.len() >= 8);
        assert_eq!((bytes.len() - 8) % 4, 0);
        let rate = u32::from_le_bytes(bytes[..4].try_into().unwrap());
        let channels = u32::from_le_bytes(bytes[4..8].try_into().unwrap());
        let samples = bytes[8..].chunks_exact(4)
            .map(|s| f32::from_le_bytes(s.try_into().unwrap())).collect();
        (rate, channels, samples)
    }

    fn assert_pcm16(channels: u16, rate: u32, expected: &[i16]) {
        let (actual_rate, actual_channels, samples) = unpack(decode(pcm16(channels, rate, expected)).unwrap());
        assert_eq!(actual_rate, rate);
        assert_eq!(actual_channels, u32::from(channels));
        assert_eq!(samples.len(), expected.len());
        for (actual, expected) in samples.iter().zip(expected) {
            assert!((actual - f32::from(*expected) / 32768.0).abs() < 0.000001);
        }
    }

    #[test]
    fn decodes_mono_pcm16_and_preserves_ipc_header() {
        assert_pcm16(1, 44100, &[i16::MIN, -16384, 0, 8192, i16::MAX]);
    }

    #[test]
    fn preserves_stereo_interleaving() {
        assert_pcm16(2, 48000, &[i16::MIN, i16::MAX, 16384, -16384, 0, 8192]);
    }

    #[test]
    fn retains_all_samples_at_buffer_boundaries() {
        let samples: Vec<i16> = (0..10000).map(|i| (i as i16).wrapping_mul(13)).collect();
        assert_pcm16(1, 48000, &samples);
    }

    #[test]
    fn decodes_float32_wav() {
        let expected = [-1.0_f32, -0.25, 0.0, 0.5, 1.0];
        let payload: Vec<u8> = expected.iter().flat_map(|s| s.to_le_bytes()).collect();
        let (rate, channels, samples) = unpack(decode(wave(3, 32, 1, 48000, &payload)).unwrap());
        assert_eq!((rate, channels), (48000, 1));
        assert_eq!(samples.len(), expected.len());
        for (actual, expected) in samples.iter().zip(expected) {
            assert!((actual - expected).abs() < 0.000001);
        }
    }

    #[test]
    fn rejects_unknown_and_empty_audio() {
        assert!(decode(Vec::new()).is_err());
        assert!(decode(b"not an audio file".to_vec()).is_err());
        assert!(decode(pcm16(1, 44100, &[])).is_err());
    }
}
