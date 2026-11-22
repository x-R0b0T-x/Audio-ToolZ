from pathlib import Path
import os
if os.environ.get('GITHUB_REF') != 'refs/heads/v1.6-dev':
    raise SystemExit('Restricted branch')

def patch(name, old, new):
    path = Path(name)
    text = path.read_text(encoding='utf-8')
    if new in text:
        return
    if text.count(old) != 1:
        raise SystemExit('Source changed or ambiguous: ' + name + ' ' + old[:70])
    path.write_text(text.replace(old, new, 1), encoding='utf-8', newline='\n')

patch('src/components/WaveformView.tsx', "import { useWaveformInteractions } from '../utils/useWaveformInteractions';", "import { useWaveformInteractions } from '../utils/useWaveformInteractions';\nimport {useOverviewNavigation} from '../utils/useOverviewNavigation';")
patch('src/components/WaveformView.tsx', '  const readCssVar = (name: string, fallback: string): string => {', '  useOverviewNavigation({canvas:overviewCanvasRef,doc:activeDoc,isRecording,isLooping,onViewRangeChange});\n\n  const readCssVar = (name: string, fallback: string): string => {')
patch('src/components/WaveformView.tsx', 'ctx.strokeStyle = selBorder; ctx.lineWidth = 1.5;\n            ctx.strokeRect(vx0 + 0.5, 0.5, Math.max(3, vx1 - vx0) - 1, h - 1);', "ctx.strokeStyle = '#39ff14'; ctx.lineWidth = 2;\n            ctx.shadowColor = '#39ff14'; ctx.shadowBlur = 7;\n            ctx.strokeRect(vx0 + 0.5, 0.5, Math.max(3, vx1 - vx0) - 1, h - 1);\n            ctx.shadowBlur = 0;")
patch('src/utils/finalUi.ts', "import {beatPulse} from './finalUiMath.mjs';", "import {beatPulse} from './finalUiMath.mjs';\nimport {kickPulseAt} from './useOverviewNavigation';")
patch('src/utils/finalUi.ts', "   if(image&&valid&&playing&&!reduced.matches){image.style.animation='none';image.style.transform=`scale(${1+.16*pulse})`;}else resetImage();", """   if(image){
    image.style.animation='none';
    const kicks=doc?.bpmInfo?.kickSamples??[];
    let robotPulse=0;
    if(playing&&!reduced.matches){
     if(kicks.length){robotPulse=kickPulseAt(audioEngine.getCurrentSample(),rate,kicks);}
     else{
      const spectrum=audioEngine.readSpectrumSnapshot();
      const bass=Math.max(spectrum[1]??0,spectrum[2]??0,spectrum[3]??0)/255;
      robotPulse=Math.max(0,Math.min(1,(bass-.45)/.55));
     }
    }
    image.style.transform=`scale(${1+.16*robotPulse})`;
   }""")
css=Path('src/components/aboutLayout.css')
text=css.read_text(encoding='utf-8')
marker='/* Bright resize grip: shared neon green, no resting transparency. */'
if marker not in text:
    css.write_text(text+'''\n/* Bright resize grip: shared neon green, no resting transparency. */
#root .atz-about-resize{color:#39ff14;opacity:1;filter:drop-shadow(0 0 3px #39ff14) drop-shadow(0 0 6px #39ff1499)}
#root .atz-about-resize:hover{filter:drop-shadow(0 0 5px #39ff14) drop-shadow(0 0 9px #39ff14)}
#root .atz-about-resize:active,#root .atz-about-resize[data-resizing='true']{filter:drop-shadow(0 0 7px #39ff14) drop-shadow(0 0 12px #39ff14) brightness(1.2)}
''',encoding='utf-8',newline='\n')
