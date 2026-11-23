from pathlib import Path
import re
root = Path(__file__).resolve().parents[2]
def patch(name, transform):
    path = root / name
    source = path.read_text(encoding='utf-8')
    result = transform(source)
    if result != source:
        path.write_text(result, encoding='utf-8')
def modes(s):
    if "| 'vu-meter'" not in s:
        s = s.replace("  | 'colored-waveform';", "  | 'colored-waveform'\n  | 'vectorscope'\n  | 'spectrogram'\n  | 'vu-meter';")
    assert "| 'vu-meter'" in s
    return s
patch('src/audio/types.ts', modes)
def storage(s):
    if "parsed.visualMode === 'vu-meter'" not in s:
        s = s.replace("parsed.visualMode === 'colored-waveform'", "parsed.visualMode === 'vectorscope' ||\n        parsed.visualMode === 'spectrogram' ||\n        parsed.visualMode === 'vu-meter' ||\n        parsed.visualMode === 'colored-waveform'")
    assert "visualMode: 'oscilloscope'" in s
    return s
patch('src/utils/uiStateStorage.ts', storage)
def control(s):
    if "import {AnalyzerSelect,drawExtraAnalyzer}" not in s:
        s = "import {AnalyzerSelect,drawExtraAnalyzer} from './AnalyzerVisuals';\n" + s
    if '<AnalyzerSelect ' not in s:
        pattern = r'<button\s+type="button"\s+data-atz-control="visual-mode"[\s\S]*?</button>'
        s, count = re.subn(pattern, '<AnalyzerSelect mode={visualMode} onChange={setVisualMode}/>', s)
        assert count == 1, 'Expected the previous mode button'
    anchor = "          if (visualMode === 'oscilloscope') {"
    if 'if (drawExtraAnalyzer(' not in s:
        assert s.count(anchor) == 1
        s = s.replace(anchor, "          if (drawExtraAnalyzer(ctx,w,h,visualMode,isPlaying||isRecording)) {\n            // Extended modes are drawn without changing the audio path.\n          } else if (visualMode === 'oscilloscope') {")
    s = s.replace("if (!isPlaying && !isRecording) return;", "if (!isPlaying && !isRecording && visualMode !== 'vu-meter') return;")
    s = s.replace('[visible, collapsed, isPlaying, isRecording, drawMetersAndVisuals, getPlayheadSeconds]', '[visible, collapsed, isPlaying, isRecording, visualMode, drawMetersAndVisuals, getPlayheadSeconds]')
    assert '<AnalyzerSelect ' in s and 'ref={visCanvasRef}' in s
    return s
patch('src/components/ControlWindow.tsx', control)
def welcome(s):
    if '<WelcomeArtwork/>' not in s:
        s, count = re.subn(r'<img src=\{welcomeArtworkUrl\}[^\n]*?/>', '<WelcomeArtwork/>', s)
        assert count == 1, 'Expected the existing welcome image'
        s = s.replace("import welcomeArtworkUrl from '../medias/mix.png?url';", "import {WelcomeArtwork} from './WelcomeArtwork';")
    assert s.count('<WelcomeArtwork/>') == 1
    return s
patch('src/components/WaveformView.tsx', welcome)
note = '\n\n### Visualisations et finitions graphiques v1.6\n\n- Six modes : Oscilloscope, Spectre, Waveforme colorée, Vectorscope stéréo, Spectrogramme, Vumètre à aiguille stéréo. Sélecteur sombre discret ; mode initial Oscilloscope puis choix mémorisé.\n- Le vumètre affiche un niveau RMS en dBFS avec une inertie visuelle ; ce n’est pas un instrument VU analogique calibré.\n- Robot d’accueil recadré sur ses pixels visibles et ajusté aux bords extérieurs des boutons Charger et Enregistrer.\n- Particules vert/violet plus lumineuses et plus longues, dont les trajectoires se terminent doucement même après pause ou arrêt.\n- Validation du candidat par tests, compilation et essais Windows requise.\n'
for name in ['README.md', 'CHANGELOG.md', 'RELEASE_NOTES_1.6.md']:
    patch(name, lambda s: s if '### Visualisations et finitions graphiques v1.6' in s else s + note)
