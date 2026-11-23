from pathlib import Path
import os
if os.environ.get('GITHUB_REF')!='refs/heads/v1.6-dev':raise SystemExit('Restricted branch')
marker=Path('.github/finishing-playback-v1.applied')
if marker.exists():raise SystemExit(0)
pending={}
def read(name):
    if name not in pending:pending[name]=Path(name).read_text(encoding='utf-8')
    return pending[name]
def patch(name,old,new):
    text=read(name)
    if text.count(old)!=1:raise SystemExit('Unexpected source: '+name+' '+old[:90])
    pending[name]=text.replace(old,new,1)

name='src/components/EffectModal.tsx'
patch(name,"echo:'Délai synchronisé'","echo:'Delay'")
patch(name,"<p>Son original conservé. Off, zéro répétition ou effet à 0 % : aucun écho. Les répétitions restent dans la sélection.{doc.channels.length===1&&c.mode==='ping-pong'?' Le ping-pong transforme la source mono en sortie stéréo.':''}</p>",'')
name='src/components/TopMenuBar.tsx'
patch(name,"effect('Écho / Delay...','echo')","effect('Delay...','echo')")

name='src/components/AdvancedEffects.tsx'
pending[name]="import {DynamicsPeakGraph} from './DynamicsPeakGraph';\n"+read(name)
patch(name,'const graph = <DetailedEffectGraph','const graph = eq ? <DetailedEffectGraph')
patch(name,'scroll={scroll} onBandChange={update}/>;','scroll={scroll} onBandChange={update}/> : <DynamicsPeakGraph original={doc.channels} output={output} offset={range.startSample} rate={doc.sampleRate} params={params} trace={trace} scroll={scroll}/>;')

name='src/utils/useWaveformInteractions.ts'
pending[name]="import {restartAfterLoop} from './peakTrail';\n"+read(name)
patch(name,'interface Options {','interface Options {\n  onRestartPlayback?: (sample:number)=>void;')
patch(name,'      if(latest.current.isLooping){', '''      if(latest.current.isLooping&&latest.current.onRestartPlayback){
        const frame=dragFrame(doc.viewStartSample,doc.viewEndSample,total,left,width,event.clientX,0);
        const point=Math.min(total-1,snap(frame.sample,width,length,event.altKey));
        const edgeX=left+(selection.endSample-doc.viewStartSample)*width/length;
        if(restartAfterLoop(true,point,selection.startSample,selection.endSample,Math.abs(event.clientX-edgeX)<=9)){
          latest.current.onRestartPlayback(point);return;
        }
      }
      if(latest.current.isLooping){''')
name='src/components/WaveformView.tsx'
patch(name,'interface WaveformViewProps {','interface WaveformViewProps {\n  onRestartPlayback?: (sample:number)=>void;')
patch(name,'  documents,\n  isLooping,','  documents,\n  onRestartPlayback,\n  isLooping,')
patch(name,'    onSelectionChange, onSelectionCommit, onViewRangeChange });','    onSelectionChange, onSelectionCommit, onViewRangeChange, onRestartPlayback });')
name='src/App.tsx'
patch(name,'<WaveformView isLooping=', '''<WaveformView onRestartPlayback={(sample)=>{
          if(!activeDoc||isRecording)return;
          const total=activeDoc.channels[0]?.length??0;if(!total)return;
          const start=Math.max(0,Math.min(total-1,Math.floor(sample)));
          updateActiveDoc(doc=>({...doc,selection:{startSample:start,endSample:start}}));
          delete (audioEngine as typeof audioEngine&{effectPreviewSession?:unknown}).effectPreviewSession;
          audioEngine.play(activeDoc.channels,activeDoc.sampleRate,start,total,{loop:false,volumeDb,balance,speedRatio,enabledChannels,onEnded:()=>{setIsPlaying(false);setIsPaused(false);setIsLooping(false);setPlayMode('idle');}});
          setIsPreviewPlaying(false);setIsPlaying(true);setIsPaused(false);setIsLooping(false);setPlayMode('play');
        }} isLooping=''')

name='src/releaseNotes.ts'
patch(name,'export const RELEASE_FIXES = [','''export const RELEASE_FIXES = [
 "Affichage des crêtes d’entrée et de sortie en temps réel, réduction de gain et repère de seuil distinct dans le compresseur.",
 "Effets utilisables sans boucle : traitement de la sélection ou du morceau entier lorsqu’aucune sélection n’est définie.",
 "Clic après la fin d’une boucle dans la forme d’onde principale : désactivation de la boucle et reprise immédiate de la lecture au point choisi, sans changer le cadrage.",
 "Effet renommé Delay et suppression de son paragraphe explicatif superflu.",''')
for name in ['RELEASE_NOTES_1.6.md','CHANGELOG.md']:
    pending[name]=read(name)+'\n\n### Dernières améliorations de lecture et de visualisation\n\n- Crêtes d’entrée et de sortie, réduction de gain et marqueur de seuil distinct actualisés pendant la lecture.\n- Effets utilisables sans boucle, sur la sélection ou le morceau entier.\n- Nouveau départ en lecture normale après un clic au-delà de la boucle, sans changement de cadrage.\n- Effet renommé Delay et texte explicatif simplifié.\n'
if len(pending)!=len({str(Path(name).resolve()).casefold() for name in pending}):raise SystemExit('Aliased paths')
for name,text in pending.items():Path(name).write_text(text,encoding='utf-8',newline='\n')
marker.write_text('finishing-playback-v1\n',encoding='utf-8')
