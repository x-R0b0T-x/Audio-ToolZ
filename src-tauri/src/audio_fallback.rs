use std::io::Cursor;
use symphonia::core::{audio::SampleBuffer, codecs::{DecoderOptions, CODEC_TYPE_NULL}, errors::Error,
    formats::FormatOptions, io::MediaSourceStream, meta::MetadataOptions, probe::Hint};

#[tauri::command]
pub async fn decode_audio_fallback(data: Vec<u8>) -> Result<tauri::ipc::Response, String> {
    tauri::async_runtime::spawn_blocking(move || decode(data).map(tauri::ipc::Response::new))
        .await.map_err(|e| e.to_string())?
}

fn decode(data: Vec<u8>) -> Result<Vec<u8>, String> {
    let stream = MediaSourceStream::new(Box::new(Cursor::new(data)), Default::default());
    let mut format = symphonia::default::get_probe().format(&Hint::new(), stream,
        &FormatOptions::default(), &MetadataOptions::default())
        .map_err(|_| "Conteneur inconnu ou endommage.")?.format;
    let mut tracks = format.tracks().iter().filter(|t| t.codec_params.codec != CODEC_TYPE_NULL);
    let (id, mut decoder) = tracks.find_map(|t| {
        symphonia::default::get_codecs().make(&t.codec_params, &DecoderOptions::default())
            .ok().map(|decoder| (t.id, decoder))
    }).ok_or("Aucune piste audio compatible.")?;
    let mut out = vec![0u8; 8];
    let mut spec = None;
    loop {
        let packet = match format.next_packet() {
            Ok(packet) => packet,
            Err(Error::IoError(e)) if e.kind() == std::io::ErrorKind::UnexpectedEof => break,
            Err(e) => return Err(e.to_string()),
        };
        if packet.track_id() != id { continue; }
        let audio = decoder.decode(&packet).map_err(|e| e.to_string())?;
        let rate = audio.spec().rate;
        let channels = audio.spec().channels.count() as u32;
        if let Some(previous) = spec {
            if previous != (rate, channels) { return Err("Format audio variable non pris en charge.".into()); }
        } else {
            spec = Some((rate, channels));
            out[..4].copy_from_slice(&rate.to_le_bytes());
            out[4..8].copy_from_slice(&channels.to_le_bytes());
        }
        let mut samples = SampleBuffer::<f32>::new(audio.capacity() as u64, *audio.spec());
        samples.copy_interleaved_ref(audio);
        for sample in samples.samples() { out.extend_from_slice(&sample.to_le_bytes()); }
    }
    if out.len() == 8 { return Err("Aucun echantillon audio exploitable.".into()); }
    Ok(out)
}
