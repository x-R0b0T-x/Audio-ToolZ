import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCueSheet,
  cueTimeToSamples,
  findTrackAtSample,
  joinAudioTracks,
  parseCueSheet,
  samplesToCueTime,
} from './cueSheet';

test('samplesToCueTime and cueTimeToSamples convert accurately at 75fps', () => {
  const sr = 44100;
  assert.equal(samplesToCueTime(0, sr), '00:00:00');
  assert.equal(samplesToCueTime(sr * 65, sr), '01:05:00');
  // 1.5 seconds = 112.5 frames -> 113 frames = 00:01:38
  assert.equal(samplesToCueTime(Math.round(sr * 1.5), sr), '00:01:38');

  const back = cueTimeToSamples('02:15:30', sr); // 135.4s
  assert.ok(Math.abs(back / sr - 135.4) < 0.002);
});

test('joinAudioTracks concatenates mixed sample rates/channels and creates exact CUE offsets', () => {
  const sr1 = 44100;
  const mono = new Float32Array(sr1).fill(0.4); // 1.0s mono @ 44.1kHz
  const stereoL = new Float32Array(sr1 * 2).fill(-0.3); // 2.0s stereo @ 44.1kHz
  const stereoR = new Float32Array(sr1 * 2).fill(0.5);

  const joined = joinAudioTracks([
    { title: 'Intro Techno', performer: 'DJ One', sampleRate: sr1, channels: [mono] },
    { title: 'Drop Finale', performer: 'DJ Two', sampleRate: sr1, channels: [stereoL, stereoR] },
  ]);

  assert.equal(joined.sampleRate, sr1);
  assert.equal(joined.channels.length, 2);
  assert.equal(joined.channels[0].length, sr1 * 3);
  assert.equal(joined.cueTracks.length, 2);
  assert.equal(joined.cueTracks[0].startSample, 0);
  assert.equal(joined.cueTracks[1].startSample, sr1);
  assert.ok(Math.abs(joined.channels[0][0] - 0.4) < 1e-6);
  assert.ok(Math.abs(joined.channels[1][0] - 0.4) < 1e-6);
  assert.ok(Math.abs(joined.channels[0][sr1] + 0.3) < 1e-6);
  assert.ok(Math.abs(joined.channels[1][sr1] - 0.5) < 1e-6);

  assert.equal(findTrackAtSample(joined.cueTracks, 100)?.title, 'Intro Techno');
  assert.equal(findTrackAtSample(joined.cueTracks, sr1 + 500)?.title, 'Drop Finale');
});

test('buildCueSheet and parseCueSheet round-trip track metadata and timestamps', () => {
  const sr = 44100;
  const cue = buildCueSheet({
    mixTitle: 'Hard Techno Session',
    mixPerformer: 'Audio ToolZ',
    audioFileName: 'Mix_Session.wav',
    sampleRate: sr,
    tracks: [
      { trackNumber: 1, title: 'Warmup', performer: 'Artist A', startSample: 0 },
      { trackNumber: 2, title: 'Peak Hour', performer: 'Artist B', startSample: sr * 90 },
    ],
  });

  assert.ok(cue.includes('FILE "Mix_Session.wav" WAVE'));
  assert.ok(cue.includes('TRACK 01 AUDIO'));
  assert.ok(cue.includes('INDEX 01 00:00:00'));
  assert.ok(cue.includes('INDEX 01 01:30:00'));

  const parsed = parseCueSheet(cue, sr, sr * 180);
  assert.equal(parsed.mixTitle, 'Hard Techno Session');
  assert.equal(parsed.mixPerformer, 'Audio ToolZ');
  assert.equal(parsed.tracks.length, 2);
  assert.equal(parsed.tracks[0].title, 'Warmup');
  assert.equal(parsed.tracks[1].title, 'Peak Hour');
  assert.equal(parsed.tracks[1].performer, 'Artist B');
  assert.equal(parsed.tracks[1].startSample, sr * 90);
});
