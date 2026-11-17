import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampControlPosition,
  DEFAULT_UI_STATE,
  parsePersistedUiState,
} from './uiStateStorage';

test('parsePersistedUiState restores exact saved position and audio devices clamped to viewport', () => {
  const raw = JSON.stringify({
    controlPos: { x: 140, y: 210 },
    controlOpen: true,
    controlCollapsed: true,
    visualMode: 'spectrum',
    selectedInputDeviceId: 'usb-soundcard-1',
    selectedOutputDeviceId: 'studio-monitors',
    recordingSettings: {
      echoCancellation: true,
      noiseSuppression: false,
      autoGainControl: true,
    },
  });
  const parsed = parsePersistedUiState(raw, 1440, 900);
  assert.deepEqual(parsed, {
    controlPos: { x: 140, y: 210 },
    controlOpen: true,
    controlCollapsed: true,
    visualMode: 'spectrum',
    selectedInputDeviceId: 'usb-soundcard-1',
    selectedOutputDeviceId: 'studio-monitors',
    recordingSettings: {
      echoCancellation: true,
      noiseSuppression: false,
      autoGainControl: true,
    },
  });
});

test('clampControlPosition keeps control panel inside smaller viewports', () => {
  const clamped = clampControlPosition({ x: 1300, y: 880 }, 1024, 640);
  assert.equal(clamped.x, 1024 - 404 - 8);
  assert.equal(clamped.y, 640 - 80);

  const negClamped = clampControlPosition({ x: -50, y: 10 }, 1440, 900);
  assert.equal(negClamped.x, 8);
  assert.equal(negClamped.y, 52);
});

test('parsePersistedUiState handles malformed JSON and colored-waveform mode', () => {
  assert.deepEqual(parsePersistedUiState('{not-valid-json'), DEFAULT_UI_STATE);
  assert.deepEqual(parsePersistedUiState(null), DEFAULT_UI_STATE);

  const colored = parsePersistedUiState(
    JSON.stringify({ visualMode: 'colored-waveform' })
  );
  assert.equal(colored.visualMode, 'colored-waveform');

  const invalidMode = parsePersistedUiState(
    JSON.stringify({ visualMode: 'unknown-mode' })
  );
  assert.equal(invalidMode.visualMode, 'oscilloscope');
});
