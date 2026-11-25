# Experimental BPM comparison on v.1.7-dev

This build offers Audio ToolZ, Essentia.js 0.1.3 and aubiojs 0.2.1 in audio settings. It applies to the main BPM command, beat grid and snapping. Dedicated effect detectors are unchanged in this first comparison build. This is not the completed variable-tempo effect-synchronization feature.

Essentia.js is AGPL-3.0; Aubio/aubiojs is GPL-3.0-or-later. Copyright notices, package metadata and license texts are included as local frontend assets. The matching source artifact includes the Audio ToolZ working sources, upstream sources at the npm release gitHead and initialized submodules. It is uploaded before the portable ZIP. No official release or main-branch merge is performed.

Runtime assets are local. A manifest records their sizes and SHA-256 digests. Python, Node and Playwright are build/test tools and are not embedded as extra runtimes. An offline browser smoke test runs each actual engine on the compiled frontend, with the application CSP, before packaging.

The built-in detector is kept unchanged. External detectors receive the same mono downmix as the built-in detector, resampled to 44,100 Hz when necessary. Beat timestamps are mapped back to the original sample domain; PCM and playback speed are never modified. External beat positions are not labeled as detected kicks. Aubio beat positions use its fractional hop output and default zero delay. Essentia uses RhythmExtractor2013 defaults, including the 208 BPM upper search bound. Raw confidence scales must not be compared between engines.

Changing engine clears cached grids. Every worker is terminated after success, failure, cancellation or timeout. Changing or closing a document cannot apply stale results to another document. Timings include worker startup, library initialization and any resampling. Local tempo traces are descriptive medians over five beat intervals, not a validated musical segmentation.

Manual Windows/WebView and listening validation remains required. A successful Chromium smoke test does not by itself prove all Windows WebView behavior.
