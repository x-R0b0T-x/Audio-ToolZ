from pathlib import Path
import json
root = Path(__file__).resolve().parents[2]
def read(name):
    return (root / name).read_text(encoding='utf-8')
def write(name, text):
    path = root / name
    if not path.exists() or path.read_text(encoding='utf-8') != text:
        path.write_text(text, encoding='utf-8', newline='\n')
def replace_once(name, old, new):
    source = read(name)
    if old not in source:
        if new in source:
            return
        raise RuntimeError('Unexpected source: ' + name)
    assert source.count(old) == 1, name
    write(name, source.replace(old, new, 1))
write('src/utils/headerWaveMath.mjs', '''export function waveLevel(playing,left,right){
  if(!playing||!Number.isFinite(left)||!Number.isFinite(right))return 0;
  const l=Math.max(0,left),r=Math.max(0,right),rms=Math.sqrt((l*l+r*r)/2);
  return rms<=.0001?0:Math.min(1,rms*2.5);
}
export function waveOffset(x,width,phase,level){
  if(!Number.isFinite(x)||!Number.isFinite(width)||!Number.isFinite(phase)||!Number.isFinite(level)||width<=0||x<=0||x>=width||level<=0)return 0;
  const envelope=Math.min(1,x/18)*Math.pow(1-x/width,.65);
  return 12*Math.min(1,level)*envelope*(.8*Math.sin(x/105*Math.PI*2-phase)+.2*Math.sin(x/47*Math.PI*2-phase*1.3));
}
''')
write('src/utils/headerWaveMath.d.mts', '''export function waveLevel(playing:boolean,left:number,right:number):number;
export function waveOffset(x:number,width:number,phase:number,level:number):number;
''')
write('src/utils/headerWaveMath.test.mjs', '''import {test} from 'node:test';
import assert from 'node:assert/strict';
import {waveLevel,waveOffset} from './headerWaveMath.mjs';
test('header wave is absent when stopped, paused or silent',()=>{
  for(const volume of [0,.001,.1,1])assert.equal(waveLevel(false,volume,volume),0);
  assert.equal(waveLevel(true,0,0),0);assert.equal(waveLevel(true,.00001,.00001),0);
  assert.equal(waveLevel(true,NaN,1),0);assert.equal(waveLevel(true,1,Infinity),0);
});
test('header wave follows stereo RMS without a beat or tempo input',()=>{
  assert.equal(waveLevel(true,.1,.1),.25);
  assert.ok(Math.abs(waveLevel(true,.1,0)-.25/Math.sqrt(2))<1e-12);
  assert.equal(waveLevel(true,.1,0),waveLevel(true,0,.1));
  assert.ok(waveLevel(true,.2,.2)>waveLevel(true,.1,.1));assert.equal(waveLevel(true,1,1),1);
});
test('header wave stays attached, tapers at its tip and scales with volume',()=>{
  for(const phase of [0,.5,2,8])for(const width of [50,200,360]){
    assert.equal(waveOffset(0,width,phase,1),0);assert.equal(waveOffset(width,width,phase,1),0);
    assert.ok(Math.abs(waveOffset(width-.001,width,phase,1))<.02);
    for(let x=1;x<width;x+=3){
      const full=waveOffset(x,width,phase,1);
      assert.ok(Math.abs(full)<=12);assert.ok(Math.abs(waveOffset(x,width,phase,.5)-full*.5)<1e-12);
      assert.equal(waveOffset(x,width,phase,0),0);
    }
  }
  assert.equal(waveOffset(2,0,0,1),0);assert.equal(waveOffset(2,20,NaN,1),0);
});
''')
write('src/components/HeaderParticles.tsx', '''import {useEffect,useRef} from 'react';
import {audioEngine} from '../audio/engine';
import {waveLevel,waveOffset} from '../utils/headerWaveMath.mjs';
import './headerParticles.css';
export function HeaderParticles(){
  const host=useRef<HTMLSpanElement>(null);
  useEffect(()=>{
    const node=host.current;if(!node)return;
    const canvases=Array.from(node.querySelectorAll('canvas'));
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0,last=0,level=0;
    const clear=()=>{for(const canvas of canvases){const ctx=canvas.getContext('2d');ctx?.clearRect(0,0,canvas.width,canvas.height);}};
    const resize=()=>{
      const rect=node.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
      canvases.forEach((canvas,i)=>{
        const width=Math.max(0,Math.min(360,i===0?rect.left-12:window.innerWidth-rect.right-12));
        canvas.style.width=`${width}px`;canvas.style.height='42px';
        canvas.width=Math.round(width*dpr);canvas.height=Math.round(42*dpr);
      });
    };
    const observer=new ResizeObserver(resize);observer.observe(node);window.addEventListener('resize',resize);resize();
    const tick=(now:number)=>{
      const dt=last?Math.min(.1,(now-last)/1000):1/60;last=now;
      if(!audioEngine.isPlaying||reduced.matches||document.hidden){level=0;clear();frame=requestAnimationFrame(tick);return;}
      const meters=audioEngine.readLiveMeters(),target=waveLevel(true,meters.leftRms,meters.rightRms);
      if(target===0){level=0;clear();frame=requestAnimationFrame(tick);return;}
      level+=(target-level)*(1-Math.exp(-dt/(target>level?.035:.12)));
      canvases.forEach((canvas,i)=>{
        const ctx=canvas.getContext('2d');if(!ctx)return;
        const width=parseFloat(canvas.style.width);ctx.clearRect(0,0,canvas.width,canvas.height);if(width<2)return;
        ctx.save();ctx.scale(canvas.width/width,canvas.height/42);
        if(i===0){ctx.translate(width,0);ctx.scale(-1,1);}
        ctx.beginPath();ctx.moveTo(0,21);
        for(let x=2;x<width;x+=2)ctx.lineTo(x,21+waveOffset(x,width,now*.004,level));
        ctx.lineTo(width,21);
        const glow=ctx.createLinearGradient(0,0,width,0);
        glow.addColorStop(0,'#39ff14');glow.addColorStop(.5,'#39ff14');glow.addColorStop(.85,'#39ff1450');glow.addColorStop(1,'#39ff1400');
        ctx.globalAlpha=Math.min(1,level*3);ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=glow;ctx.lineWidth=1.8;ctx.shadowColor='#39ff14';ctx.shadowBlur=7;ctx.stroke();
        const core=ctx.createLinearGradient(0,0,width,0);
        core.addColorStop(0,'#eaffdf');core.addColorStop(.55,'#caffb8');core.addColorStop(1,'#caffb800');
        ctx.strokeStyle=core;ctx.lineWidth=.65;ctx.shadowBlur=2;ctx.stroke();ctx.restore();
      });
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',resize);clear();};
  },[]);
  return <span ref={host} className="atz-header-particles" aria-hidden="true"><canvas data-side="left"/><canvas data-side="right"/></span>;
}
''')
write('src/components/headerParticles.css', '''.atz-header-emitter{position:relative;overflow:visible;isolation:isolate}
.atz-header-particles{position:absolute;inset:0;pointer-events:none!important;user-select:none;z-index:0}
.atz-header-particles canvas{position:absolute;top:calc(50% - 21px);pointer-events:none!important}
.atz-header-particles canvas[data-side="left"]{right:100%}
.atz-header-particles canvas[data-side="right"]{left:100%}
#root .atz-about-dialog #about-changelog-title{color:#39ff14!important}
@media(prefers-reduced-motion:reduce){.atz-header-particles{display:none}}
''')
name='src/utils/finalUi.test.mjs'
source=read(name)
if "import './headerWaveMath.test.mjs';" not in source:
    write(name,"import './headerWaveMath.test.mjs';\n"+source)
replace_once(name," assert.ok(particles.includes('readHeaderTempo()'));assert.ok(particles.includes('audioEngine.getCurrentSample()'));assert.ok(particles.includes('Math.random()'));", " assert.ok(particles.includes('audioEngine.readLiveMeters()'));assert.ok(particles.includes('meters.leftRms,meters.rightRms'));assert.ok(!particles.includes('readHeaderTempo'));assert.ok(!particles.includes('getCurrentSample'));assert.ok(!particles.includes('kick'));")
name='src/utils/releaseCandidate.test.ts'
source=read(name)
title="test('continuous green header waves follow amplitude only and stay anchored'"
replacement='''test('continuous green header waves follow amplitude only and stay anchored',()=>{
  const code=read('src/components/HeaderParticles.tsx'),css=read('src/components/headerParticles.css');
  for(const token of ['audioEngine.readLiveMeters()','meters.leftRms,meters.rightRms','if(!audioEngine.isPlaying||reduced.matches||document.hidden)','if(target===0)','ctx.moveTo(0,21)','waveOffset(x,width,now*.004,level)','ctx.lineTo(width,21)','createLinearGradient','cancelAnimationFrame(frame)','observer.disconnect()','aria-hidden="true"'])assert.ok(code.includes(token),token);
  assert.equal((code.match(/<canvas /g)||[]).length,2);
  for(const absent of ['readHeaderTempo','getCurrentSample','kick','Math.random','setInterval','stroke-dasharray'])assert.ok(!code.includes(absent),absent);
  assert.ok(css.includes('canvas[data-side="left"]{right:100%}'));assert.ok(css.includes('canvas[data-side="right"]{left:100%}'));
  assert.ok(code.includes("'#39ff1400'"));assert.ok(css.includes('pointer-events:none!important'));assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
});
'''
if title not in source:
    candidates=[source.find("test('green electrical arcs follow the beat"),source.find("test('particles travel farther")]
    starts=[value for value in candidates if value>=0]
    assert len(starts)==1,'Expected one previous header animation test'
    end=source.index("test('tutorial retains",starts[0])
    write(name,source[:starts[0]]+replacement+source[end:])
headline='Grosse mise à jour v1.6 : nouveaux outils audio, didacticiel avec ATZ et refonte graphique.'
name='src/releaseNotes.ts'
source=read(name)
if headline not in source:
    additions=[headline,'Didacticiel intégré avec ATZ, la mascotte, pour accompagner la prise en main.','Onde électrique vert néon attachée au titre, en courbes continues : amplitude pilotée par le niveau RMS stéréo, sans BPM ni kicks ; aucun signal en pause, à l’arrêt ou pendant le silence.','Six visualisations : oscilloscope, spectre, waveform colorée, vectorscope stéréo, spectrogramme et vumètre à aiguille stéréo.']
    anchor='export const RELEASE_ADDITIONS = ['
    assert source.count(anchor)==1
    write(name,source.replace(anchor,anchor+'\n'+''.join(' '+json.dumps(item,ensure_ascii=False)+',\n' for item in additions),1))
notes='''# Audio ToolZ v1.6 — Une grosse mise à jour

La v1.6 marque une évolution importante d’Audio ToolZ : une chaîne de traitement enrichie, un égaliseur paramétrique à sept bandes, une interface retravaillée et un didacticiel accompagné par ATZ, la mascotte.

## Les nouveautés phares

- Égaliseur paramétrique à sept bandes indépendantes, en remplacement des trois bandes de la v1.5 : fréquence, gain, largeur Q, formes et pentes compatibles, spectre d’entrée et courbe de réponse globale.
- Compresseur et limiteur réunis dans une fenêtre dédiée : modes COMP et LIMIT, gain d’entrée, plafond, attaque, relâchement, enveloppe et visualisation de la réduction de gain. Le limiteur traite les crêtes d’échantillons ; il ne revendique pas de limitation true peak suréchantillonnée.
- Didacticiel intégré avec ATZ pour accompagner la prise en main, avec accès à Telegram, Github et Paypal sur la dernière page.
- Refonte graphique violet et vert néon : potards gradués, indicateurs lumineux, boutons harmonisés, accueil illustré et fenêtre À propos réorganisée.
- Six visualisations : Oscilloscope, Spectre, Waveforme colorée, Vectorscope stéréo, Spectrogramme et Vumètre à aiguille stéréo. Le dernier choix est mémorisé ; sans préférence, l’oscilloscope est utilisé. Le vumètre indique un niveau RMS en dBFS avec inertie visuelle, pas un instrument VU analogique calibré.

## Effets, Delay et lecture

- Préécoute et application des effets pendant la lecture normale, sans boucle obligatoire, sur la sélection ou le morceau entier. Ouvrir un effet ne lance pas la lecture.
- Reprise des derniers réglages de préécoute au démarrage de la lecture.
- Delay musical compact : temps musicaux, répétitions, volume d’effet, panoramique et modes Mono / Stéréo / Ping-pong / Off. Détection BPM en arrière-plan dans le panneau, sans modifier les réglages.
- Delay initialisé sur Off, zéro répétition, volume d’effet nul et panoramique centré ; aucune durée libre en millisecondes dans l’interface finale. Le BPM sert aux temps musicaux du Delay, pas au compresseur, au limiteur ni à l’égaliseur.
- Routage ping-pong conservé : panoramique décentré pour choisir le premier côté ; répétitions mono identiques au centre.
- Navigation de l’aperçu indépendante de la boucle, largeur à la molette et reprise de lecture au point choisi après la boucle.
- Bornes de boucle ajustables pendant la lecture ; aimantation conservée. Raccourci Espace disponible dans les fenêtres d’effets via les commandes de transport existantes.
- Balance par atténuation des canaux, sans sommation du canal opposé.

### Dernières finitions v1.6

- Onde électrique vert néon attachée de chaque côté du titre, en courbes continues. Son amplitude suit uniquement le niveau RMS stéréo de sortie, sans BPM ni kicks. Elle s’atténue vers ses extrémités ; aucun signal en pause, à l’arrêt ou dans le silence.
- Survol du bouton « ? » : seul le point d’interrogation s’illumine, sans cadre ni halo vert autour du bouton.
- Titre vert « Changlog depuis la v1.5 » dans À propos ; robot et trois liens conservés. La pulsation du robot reste distincte de l’onde et suit le tempo lorsque celui-ci est exploitable.
- Boutons du didacticiel violets avec contour lumineux vert au survol.

### Visualisations et finitions graphiques v1.6

Accueil avec illustration ajustée à ses pixels visibles ; panneau Contrôle sans illustration ni anciens vumètres séparés, analyseur conservé. Identité Audio blanc, Tool vert et Z violet. Les préférences de réduction des animations sont respectées.

## Compatibilité et nettoyage

Tauri v2, Symphonia 0.5, les formats audio, les fichiers CUE, l’assemblage, l’enregistrement et les traitements par lots sont conservés depuis la v1.5. Les fenêtres autonomes Volume/Gain et Normalisation sont retirées ; le volume général, les gains internes et les traitements par lots restent disponibles.

## Distribution finale v1.6

Un seul téléchargement : `Audio ToolZ v1.6.zip`. Après extraction, le dossier `Audio ToolZ` contient `Audio ToolZ.exe`, `logo.ico` et `desktop.ini`. Les empreintes SHA-256 de l’exécutable et du ZIP figurent dans le résumé de compilation, pas dans un téléchargement séparé.

## Finalisation du candidat v1.6

Cette dernière révision doit passer les tests audio et UI, le contrôle TypeScript, la compilation Windows et les contrôles du ZIP. Les validations de versions antérieures ne valent pas validation de cette nouvelle onde. Le passage dans main intervient après validation de la chaîne ; aucun tag ni aucune release officielle ne sont créés par cette préparation.
'''
notes='\n'.join(line[4:] if line.startswith('    ') else line for line in notes.splitlines())+'\n'
write('RELEASE_NOTES_1.6.md',notes)
name='CHANGELOG.md'
source=read(name)
assert '\n## 1.5\n' in source
history='## 1.5\n'+source.split('\n## 1.5\n',1)[1]
history=history.split('\n## Finalisation du candidat v1.6',1)[0].rstrip()+'\n'
write(name,'# Journal des modifications\n\n## 1.6 — Une grosse mise à jour\n\n'+notes.split('\n',1)[1].lstrip()+'\n'+history)
name='README.md'
source=read(name)
source=source.replace('Particules vertes/violettes discrètes autour du titre pendant la lecture, sans synchronisation BPM/volume ; préférence de réduction des animations respectée.','Onde électrique verte continue, attachée au titre et pilotée uniquement par le niveau sonore RMS ; aucun signal à l’arrêt, en pause ou pendant le silence ; réduction des animations respectée.')
source=source.replace('Particules vert/violet plus lumineuses et plus longues, dont les trajectoires se terminent doucement même après pause ou arrêt.','Onde vert néon en courbes, attachée au titre et atténuée à ses extrémités, sans BPM ni kicks.')
write(name,source)
