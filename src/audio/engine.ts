import {
  computeChannelMuteGains,
  computePlaybackSamplePosition,
  dbToLinear,
  reverseChannelsRange,
} from './dsp';

export interface MeterLevels {
  leftPeak: number;
  rightPeak: number;
  leftRms: number;
  rightRms: number;
}

export interface AudioInputDevice {
  deviceId: string;
  label: string;
  groupId?: string;
}

export interface AudioOutputDevice {
  deviceId: string;
  label: string;
  groupId?: string;
}

export interface RecordingConstraints {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private currentBuffer: AudioBuffer | null = null;
  private currentTotalSamples = 0;
  private currentChannelCount = 2;
  private preSplitGain: GainNode | null = null;
  private leftMuteGain: GainNode | null = null;
  private rightMuteGain: GainNode | null = null;
  private channelMerger: ChannelMergerNode | null = null;
  private gainNode: GainNode | null = null;
  private pannerNode: StereoPannerNode | null = null;
  private analyserLeft: AnalyserNode | null = null;
  private analyserRight: AnalyserNode | null = null;
  private analyserMix: AnalyserNode | null = null;

  private isPlayingState = false;
  private isPausedState = false;
  private isLooping = false;
  private isReverse = false;
  private playbackStartSample = 0;
  private playbackEndSample = 0;
  private currentDocSampleRate = 44100;
  private startedAtCtxTime = 0;
  private offsetSamplesAtStart = 0;
  private speedRatio = 1;
  private volumeDb = 0;
  private balance = 0;
  private enabledChannels: [boolean, boolean] = [true, true];
  private preferredOutputDeviceId = '';
  private onEndedCallback: (() => void) | null = null;

  // Recording state
  private isRecordingState = false;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private recorderProcessor: ScriptProcessorNode | null = null;
  private recordedChunks: Float32Array[] = [];
  private recordSampleRate = 44100;

  private timeDomainBufL = new Float32Array(1024);
  private timeDomainBufR = new Float32Array(1024);
  private freqBuf = new Uint8Array(256);
  private freqBufL = new Uint8Array(512);
  private freqBufR = new Uint8Array(512);

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    if (!this.gainNode) {
      this.preSplitGain = this.ctx.createGain();
      this.preSplitGain.channelCount = 2;
      this.preSplitGain.channelCountMode = 'explicit';
      this.preSplitGain.channelInterpretation = 'speakers';

      const preSplitter = this.ctx.createChannelSplitter(2);
      this.leftMuteGain = this.ctx.createGain();
      this.rightMuteGain = this.ctx.createGain();
      this.channelMerger = this.ctx.createChannelMerger(2);

      this.gainNode = this.ctx.createGain();
      this.pannerNode = this.ctx.createStereoPanner();
      this.analyserMix = this.ctx.createAnalyser();
      this.analyserMix.fftSize = 1024;
      this.analyserMix.minDecibels = -84;
      this.analyserMix.maxDecibels = -6;
      this.analyserMix.smoothingTimeConstant = 0.72;
      this.analyserLeft = this.ctx.createAnalyser();
      this.analyserLeft.fftSize = 1024;
      this.analyserLeft.minDecibels = -84;
      this.analyserLeft.maxDecibels = -6;
      this.analyserLeft.smoothingTimeConstant = 0.72;
      this.analyserRight = this.ctx.createAnalyser();
      this.analyserRight.fftSize = 1024;
      this.analyserRight.minDecibels = -84;
      this.analyserRight.maxDecibels = -6;
      this.analyserRight.smoothingTimeConstant = 0.72;

      const postSplitter = this.ctx.createChannelSplitter(2);
      this.preSplitGain.connect(preSplitter);
      preSplitter.connect(this.leftMuteGain, 0);
      preSplitter.connect(this.rightMuteGain, 1);
      this.leftMuteGain.connect(this.channelMerger, 0, 0);
      this.rightMuteGain.connect(this.channelMerger, 0, 1);
      this.channelMerger.connect(this.gainNode);

      this.gainNode.connect(this.pannerNode);
      this.pannerNode.connect(this.analyserMix);
      this.pannerNode.connect(postSplitter);
      postSplitter.connect(this.analyserLeft, 0);
      postSplitter.connect(this.analyserRight, 1);
      this.analyserMix.connect(this.ctx.destination);

      if (this.preferredOutputDeviceId) {
        void this.applyOutputSinkId(this.preferredOutputDeviceId);
      }
    }
    return this.ctx;
  }

  private async applyOutputSinkId(deviceId: string): Promise<boolean> {
    if (!this.ctx) return false;
    const ctxWithSink = this.ctx as AudioContext & {
      setSinkId?: (id: string) => Promise<void>;
    };
    if (typeof ctxWithSink.setSinkId !== 'function') return false;
    try {
      await ctxWithSink.setSinkId(deviceId);
      return true;
    } catch {
      return false;
    }
  }

  get isPlaying(): boolean {
    return this.isPlayingState;
  }

  get isPaused(): boolean {
    return this.isPausedState;
  }

  get isRecording(): boolean {
    return this.isRecordingState;
  }

  getChannelMuteGains(): [number, number] {
    return computeChannelMuteGains(
      this.currentChannelCount,
      this.enabledChannels
    );
  }

  setEnabledChannels(
    enabledChannels: [boolean, boolean],
    channelCount = this.currentChannelCount
  ): void {
    this.enabledChannels = [enabledChannels[0], enabledChannels[1]];
    this.currentChannelCount = channelCount;
    const [gL, gR] = computeChannelMuteGains(channelCount, this.enabledChannels);
    if (this.ctx && this.leftMuteGain && this.rightMuteGain) {
      this.leftMuteGain.gain.setTargetAtTime(gL, this.ctx.currentTime, 0.01);
      this.rightMuteGain.gain.setTargetAtTime(gR, this.ctx.currentTime, 0.01);
    }
  }

  play(
    channels: Float32Array[],
    sampleRate: number,
    startSample: number,
    endSample: number,
    options: {
      loop?: boolean;
      reverse?: boolean;
      volumeDb?: number;
      balance?: number;
      speedRatio?: number;
      enabledChannels?: [boolean, boolean];
      onEnded?: () => void;
    } = {}
  ): void {
    this.stop(false);
    const total = channels[0]?.length ?? 0;
    if (total === 0) return;

    const ctx = this.ensureContext();
    const reverse = Boolean(options.reverse);
    const loop = Boolean(options.loop) && !reverse;
    const safeStart = Math.max(0, Math.min(total - 1, Math.floor(startSample)));
    const safeEnd =
      endSample > safeStart
        ? Math.min(total, Math.floor(endSample))
        : total;

    const segLen = safeEnd - safeStart;
    if (segLen <= 0) return;

    // For looped playback, hold the full document AudioBuffer so loopStart/loopEnd
    // can be dynamically shrunk or expanded without reallocating audio memory.
    const bufferLen = loop ? total : segLen;
    const buffer = ctx.createBuffer(channels.length, bufferLen, sampleRate);
    if (reverse) {
      const reversed = reverseChannelsRange(channels, safeStart, safeEnd);
      for (let c = 0; c < channels.length; c++) {
        buffer.getChannelData(c).set(reversed[c]);
      }
    } else {
      for (let c = 0; c < channels.length; c++) {
        const chData = buffer.getChannelData(c);
        chData.set(loop ? channels[c] : channels[c].subarray(safeStart, safeEnd));
      }
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = loop;
    if (loop) {
      src.loopStart = safeStart / sampleRate;
      src.loopEnd = safeEnd / sampleRate;
    }

    this.speedRatio = Math.max(0.25, Math.min(4, options.speedRatio ?? 1));
    this.volumeDb = options.volumeDb ?? 0;
    this.balance = Math.max(-1, Math.min(1, options.balance ?? 0));
    this.currentChannelCount = channels.length;
    if (options.enabledChannels) {
      this.enabledChannels = [
        options.enabledChannels[0],
        options.enabledChannels[1],
      ];
    }
    src.playbackRate.value = this.speedRatio;

    const [gL, gR] = computeChannelMuteGains(
      channels.length,
      this.enabledChannels
    );
    if (this.leftMuteGain && this.rightMuteGain) {
      this.leftMuteGain.gain.setValueAtTime(gL, ctx.currentTime);
      this.rightMuteGain.gain.setValueAtTime(gR, ctx.currentTime);
    }

    if (this.pannerNode) {
      this.pannerNode.pan.setValueAtTime(this.balance, ctx.currentTime);
    }

    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(
        dbToLinear(this.volumeDb),
        ctx.currentTime
      );
    }

    if (this.preSplitGain) {
      src.connect(this.preSplitGain);
    }

    this.sourceNode = src;
    this.currentBuffer = loop ? buffer : null;
    this.currentTotalSamples = total;
    this.isPlayingState = true;
    this.isPausedState = false;
    this.isLooping = loop;
    this.isReverse = reverse;
    this.playbackStartSample = safeStart;
    this.playbackEndSample = safeEnd;
    this.currentDocSampleRate = sampleRate;
    this.startedAtCtxTime = ctx.currentTime;
    this.offsetSamplesAtStart = 0;
    this.onEndedCallback = options.onEnded ?? null;

    src.onended = () => {
      if (this.sourceNode === src && this.isPlayingState && !this.isLooping) {
        this.isPlayingState = false;
        this.isPausedState = false;
        this.isReverse = false;
        this.sourceNode = null;
        this.currentBuffer = null;
        this.onEndedCallback?.();
      }
    };

    src.start(0, loop ? safeStart / sampleRate : 0);
  }

  updateLoopRegion(
    startSample: number,
    endSample: number,
    restartFromStart: boolean
  ): void {
    if (
      !this.isPlayingState ||
      !this.isLooping ||
      !this.ctx ||
      !this.currentBuffer ||
      !this.gainNode
    ) {
      return;
    }

    const total = this.currentTotalSamples;
    if (total <= 1) return;

    const safeStart = Math.max(0, Math.min(total - 1, Math.floor(startSample)));
    const safeEnd =
      endSample > safeStart
        ? Math.min(total, Math.floor(endSample))
        : total;

    const current = this.getCurrentSample();
    const outsideRange = current < safeStart || current >= safeEnd;

    if (!restartFromStart && !outsideRange && this.sourceNode) {
      this.playbackStartSample = safeStart;
      this.sourceNode.loopStart = safeStart / this.currentDocSampleRate;
      this.offsetSamplesAtStart = current - safeStart;
      this.startedAtCtxTime = this.ctx.currentTime;
      this.playbackEndSample = safeEnd;
      this.sourceNode.loopEnd = safeEnd / this.currentDocSampleRate;
      return;
    }

    // Restart cleanly from safeStart on a fresh lightweight BufferSourceNode
    if (this.sourceNode) {
      const old = this.sourceNode;
      this.sourceNode = null;
      old.onended = null;
      try {
        old.stop();
        old.disconnect();
      } catch {
        // Ignore already-stopped source
      }
    }

    const sr = this.currentDocSampleRate;
    const src = this.ctx.createBufferSource();
    src.buffer = this.currentBuffer;
    src.loop = true;
    src.loopStart = safeStart / sr;
    src.loopEnd = safeEnd / sr;
    src.playbackRate.value = this.speedRatio;
    if (this.preSplitGain) {
      src.connect(this.preSplitGain);
    } else {
      src.connect(this.gainNode);
    }

    this.sourceNode = src;
    this.playbackStartSample = safeStart;
    this.playbackEndSample = safeEnd;
    this.offsetSamplesAtStart = 0;
    this.startedAtCtxTime = this.ctx.currentTime;

    src.start(0, safeStart / sr);
  }

  pause(): number {
    if (!this.isPlayingState || !this.ctx) return this.playbackStartSample;
    const current = this.getCurrentSample();
    this.stop(false);
    this.isPausedState = true;
    this.offsetSamplesAtStart = this.isReverse
      ? this.playbackEndSample - current
      : current - this.playbackStartSample;
    return current;
  }

  stop(resetPaused = true): void {
    if (this.sourceNode) {
      const s = this.sourceNode;
      this.sourceNode = null;
      s.onended = null;
      try {
        s.stop();
        s.disconnect();
      } catch {
        // Ignore already-stopped source
      }
    }
    this.isPlayingState = false;
    if (resetPaused) {
      this.isPausedState = false;
      this.isLooping = false;
      this.isReverse = false;
      this.currentBuffer = null;
      this.offsetSamplesAtStart = 0;
    }
  }

  setVolumeDb(db: number): void {
    this.volumeDb = db;
    if (this.ctx && this.gainNode) {
      this.gainNode.gain.setTargetAtTime(
        dbToLinear(db),
        this.ctx.currentTime,
        0.015
      );
    }
  }

  setBalance(pan: number): void {
    this.balance = Math.max(-1, Math.min(1, pan));
    if (this.ctx && this.pannerNode) {
      this.pannerNode.pan.setTargetAtTime(
        this.balance,
        this.ctx.currentTime,
        0.015
      );
    }
  }

  setSpeedRatio(ratio: number): void {
    const clamped = Math.max(0.25, Math.min(4, ratio));
    if (this.ctx && this.isPlayingState && this.sourceNode) {
      // Anchor elapsed samples before updating playbackRate so playhead stays continuous
      const nowSample = this.getCurrentSample();
      this.offsetSamplesAtStart = this.isReverse
        ? this.playbackEndSample - nowSample
        : nowSample - this.playbackStartSample;
      this.startedAtCtxTime = this.ctx.currentTime;
      this.sourceNode.playbackRate.setValueAtTime(clamped, this.ctx.currentTime);
    }
    this.speedRatio = clamped;
  }

  getCurrentSample(): number {
    if (!this.isPlayingState || !this.ctx) {
      return this.isReverse
        ? Math.max(
            this.playbackStartSample,
            this.playbackEndSample - this.offsetSamplesAtStart
          )
        : this.playbackStartSample + this.offsetSamplesAtStart;
    }
    const elapsedSec = Math.max(0, this.ctx.currentTime - this.startedAtCtxTime);
    const playedSamples =
      this.offsetSamplesAtStart +
      elapsedSec * this.currentDocSampleRate * this.speedRatio;
    return computePlaybackSamplePosition({
      isReverse: this.isReverse,
      isLooping: this.isLooping,
      startSample: this.playbackStartSample,
      endSample: this.playbackEndSample,
      playedSamples,
    });
  }

  async listInputDevices(): Promise<AudioInputDevice[]> {
    const { inputs } = await this.listAudioDevices();
    return inputs;
  }

  async listAudioDevices(): Promise<{
    inputs: AudioInputDevice[];
    outputs: AudioOutputDevice[];
    supportsOutputSelect: boolean;
  }> {
    const supportsOutputSelect =
      typeof AudioContext !== 'undefined' &&
      'setSinkId' in AudioContext.prototype;
    if (!navigator.mediaDevices?.enumerateDevices) {
      return { inputs: [], outputs: [], supportsOutputSelect };
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs: AudioInputDevice[] = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d, idx) => ({
          deviceId: d.deviceId,
          label:
            d.label ||
            (d.deviceId === 'default'
              ? 'Entrée audio par défaut'
              : `Entrée / Carte son ${idx + 1}`),
          groupId: d.groupId,
        }));
      const outputs: AudioOutputDevice[] = devices
        .filter((d) => d.kind === 'audiooutput')
        .map((d, idx) => ({
          deviceId: d.deviceId,
          label:
            d.label ||
            (d.deviceId === 'default'
              ? 'Sortie audio par défaut'
              : `Sortie audio ${idx + 1}`),
          groupId: d.groupId,
        }));
      return { inputs, outputs, supportsOutputSelect };
    } catch {
      return { inputs: [], outputs: [], supportsOutputSelect };
    }
  }

  async requestMicrophonePermission(deviceId?: string): Promise<boolean> {
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { ideal: deviceId } } : true,
      });
      for (const track of stream.getTracks()) track.stop();
      return true;
    } catch {
      return false;
    }
  }

  async setOutputDevice(deviceId: string): Promise<boolean> {
    this.preferredOutputDeviceId = deviceId;
    if (!this.ctx) {
      return (
        typeof AudioContext !== 'undefined' &&
        'setSinkId' in AudioContext.prototype
      );
    }
    return this.applyOutputSinkId(deviceId);
  }

  async startRecording(
    deviceId?: string,
    constraintsOpt?: Partial<RecordingConstraints>
  ): Promise<number> {
    if (this.isRecordingState) return this.recordSampleRate;
    this.stop(true);
    const ctx = this.ensureContext();
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        "L'accès au microphone n'est pas disponible dans ce navigateur."
      );
    }

    const echoCancellation = constraintsOpt?.echoCancellation ?? false;
    const noiseSuppression = constraintsOpt?.noiseSuppression ?? false;
    const autoGainControl = constraintsOpt?.autoGainControl ?? false;

    const constraints: MediaStreamConstraints = {
      audio: deviceId
        ? {
            deviceId: { exact: deviceId },
            echoCancellation,
            noiseSuppression,
            autoGainControl,
          }
        : {
            echoCancellation,
            noiseSuppression,
            autoGainControl,
          },
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const micSrc = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(2048, 1, 1);

    this.recordedChunks = [];
    this.recordSampleRate = ctx.sampleRate;

    processor.onaudioprocess = (ev) => {
      if (!this.isRecordingState) return;
      const input = ev.inputBuffer.getChannelData(0);
      this.recordedChunks.push(new Float32Array(input));
    };

    // Route mic to analysers (for live VU-meters) and silent sink so ScriptProcessor ticks
    const silentGain = ctx.createGain();
    silentGain.gain.value = 0;
    micSrc.connect(processor);
    if (this.analyserLeft && this.analyserRight && this.analyserMix) {
      micSrc.connect(this.analyserLeft);
      micSrc.connect(this.analyserRight);
      micSrc.connect(this.analyserMix);
    }
    processor.connect(silentGain);
    silentGain.connect(ctx.destination);

    this.micStream = stream;
    this.micSource = micSrc;
    this.recorderProcessor = processor;
    this.isRecordingState = true;
    return this.recordSampleRate;
  }

  stopRecording(): { channels: Float32Array[]; sampleRate: number } {
    this.isRecordingState = false;
    if (this.recorderProcessor) {
      this.recorderProcessor.disconnect();
      this.recorderProcessor.onaudioprocess = null;
      this.recorderProcessor = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
    if (this.micStream) {
      for (const track of this.micStream.getTracks()) {
        track.stop();
      }
      this.micStream = null;
    }

    const total = this.recordedChunks.reduce((acc, c) => acc + c.length, 0);
    const mono = new Float32Array(total);
    let offset = 0;
    for (const chunk of this.recordedChunks) {
      mono.set(chunk, offset);
      offset += chunk.length;
    }
    this.recordedChunks = [];

    // Return stereo pair so it matches standard editor tracks seamlessly
    return {
      channels: [mono, new Float32Array(mono)],
      sampleRate: this.recordSampleRate,
    };
  }

  getRecordedPreviewSamples(): Float32Array {
    if (this.recordedChunks.length === 0) return new Float32Array(0);
    const total = this.recordedChunks.reduce((acc, c) => acc + c.length, 0);
    const out = new Float32Array(total);
    let offset = 0;
    for (const c of this.recordedChunks) {
      out.set(c, offset);
      offset += c.length;
    }
    return out;
  }

  readLiveMeters(): MeterLevels {
    if (
      (!this.isPlayingState && !this.isRecordingState) ||
      !this.analyserLeft ||
      !this.analyserRight
    ) {
      return { leftPeak: 0, rightPeak: 0, leftRms: 0, rightRms: 0 };
    }
    this.analyserLeft.getFloatTimeDomainData(this.timeDomainBufL);
    this.analyserRight.getFloatTimeDomainData(this.timeDomainBufR);

    let peakL = 0;
    let sumL = 0;
    let peakR = 0;
    let sumR = 0;
    const len = this.timeDomainBufL.length;

    for (let i = 0; i < len; i++) {
      const vl = Math.abs(this.timeDomainBufL[i]);
      const vr = Math.abs(this.timeDomainBufR[i]);
      if (vl > peakL) peakL = vl;
      if (vr > peakR) peakR = vr;
      sumL += vl * vl;
      sumR += vr * vr;
    }

    return {
      leftPeak: Math.min(1, peakL),
      rightPeak: Math.min(1, peakR),
      leftRms: Math.min(1, Math.sqrt(sumL / len)),
      rightRms: Math.min(1, Math.sqrt(sumR / len)),
    };
  }

  readWaveformSnapshot(): Float32Array {
    if (!this.analyserMix || (!this.isPlayingState && !this.isRecordingState)) {
      this.timeDomainBufL.fill(0);
      return this.timeDomainBufL;
    }
    this.analyserMix.getFloatTimeDomainData(this.timeDomainBufL);
    return this.timeDomainBufL;
  }

  readSpectrumSnapshot(): Uint8Array {
    if (!this.analyserMix || (!this.isPlayingState && !this.isRecordingState)) {
      this.freqBuf.fill(0);
      return this.freqBuf;
    }
    if (this.freqBuf.length !== this.analyserMix.frequencyBinCount) {
      this.freqBuf = new Uint8Array(this.analyserMix.frequencyBinCount);
    }
    this.analyserMix.getByteFrequencyData(this.freqBuf);
    return this.freqBuf;
  }

  readStereoWaveformSnapshots(): { left: Float32Array; right: Float32Array } {
    if (
      (!this.isPlayingState && !this.isRecordingState) ||
      !this.analyserLeft ||
      !this.analyserRight
    ) {
      this.timeDomainBufL.fill(0);
      this.timeDomainBufR.fill(0);
      return { left: this.timeDomainBufL, right: this.timeDomainBufR };
    }
    this.analyserLeft.getFloatTimeDomainData(this.timeDomainBufL);
    this.analyserRight.getFloatTimeDomainData(this.timeDomainBufR);
    return { left: this.timeDomainBufL, right: this.timeDomainBufR };
  }

  readStereoSpectrumSnapshots(): { left: Uint8Array; right: Uint8Array } {
    if (
      (!this.isPlayingState && !this.isRecordingState) ||
      !this.analyserLeft ||
      !this.analyserRight
    ) {
      this.freqBufL.fill(0);
      this.freqBufR.fill(0);
      return { left: this.freqBufL, right: this.freqBufR };
    }
    if (this.freqBufL.length !== this.analyserLeft.frequencyBinCount) {
      this.freqBufL = new Uint8Array(this.analyserLeft.frequencyBinCount);
    }
    if (this.freqBufR.length !== this.analyserRight.frequencyBinCount) {
      this.freqBufR = new Uint8Array(this.analyserRight.frequencyBinCount);
    }
    this.analyserLeft.getByteFrequencyData(this.freqBufL);
    this.analyserRight.getByteFrequencyData(this.freqBufR);
    return { left: this.freqBufL, right: this.freqBufR };
  }

  async decodeFile(arrayBuffer: ArrayBuffer): Promise<{
    channels: Float32Array[];
    sampleRate: number;
  }> {
    const ctx = this.ensureContext();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const channels: Float32Array[] = [];
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      channels.push(new Float32Array(audioBuffer.getChannelData(c)));
    }
    return { channels, sampleRate: audioBuffer.sampleRate };
  }
}

export const audioEngine = new AudioEngine();
