import argparse,json,os,re,stat,subprocess,tempfile
from pathlib import Path

NAME='ZØNYX'
IDENTIFIER='zonyx'
CODES=[[65,84,88],[65,84,90],[90,48,78,89,88],[90,79,78,89,88]]
WORDS=[''.join(map(chr,c)) for c in CODES]
CAPS=sorted(set(WORDS+[s.capitalize() for s in WORDS]),key=lambda s:(-len(s),s))
LOWER=[s.lower() for s in WORDS if s.lower()!=IDENTIFIER]
PATTERN=re.compile('|'.join(map(re.escape,CAPS))+r'|(?<![A-Za-z0-9])(?:'+'|'.join(map(re.escape,LOWER))+')')
OPAQUE=re.compile(r"(data:[^\s'\"<>]*?;base64,[A-Za-z0-9+/_=\r\n-]+|[A-Za-z0-9+/_=-]{120,})")
EXCLUDED={'.github','node_modules','dist','target','vendor','third_party'}

def renamed(value):
    return PATTERN.sub(lambda m:IDENTIFIER if m[0].islower() else NAME,value)

def transformed(text):
    return ''.join(part if i%2 else renamed(part) for i,part in enumerate(OPAQUE.split(text)))

def git(root,*args):
    return subprocess.check_output(['git',*args],cwd=root).decode('utf-8').strip()

def eligible(path):
    return not EXCLUDED.intersection(path.parts) and path.name not in {'package-lock.json','Cargo.lock'} and path.suffix not in {'.lock','.map'}

def identity_module():
    return "export const MASCOT_NAME='ZØNYX';\nexport const MASCOT_ID='zonyx';\n"+r"""const words="""+json.dumps(CODES)+r""".map(c=>String.fromCharCode(...c));
const caps=[...new Set([...words,...words.map(w=>w[0]+w.slice(1).toLowerCase())])].sort((a,b)=>b.length-a.length||a.localeCompare(b));
const lower=words.map(w=>w.toLowerCase()).filter(w=>w!==MASCOT_ID);
const legacy=new RegExp(caps.join('|')+'|(?<![A-Za-z0-9])(?:'+lower.join('|')+')','gu');
export const renameLegacyIdentifier=value=>value.replace(legacy,word=>word===word.toLowerCase()?MASCOT_ID:MASCOT_NAME);
const opaque=/(data:[^\s'"<>]*?;base64,[A-Za-z0-9+/_=\r\n-]+|[A-Za-z0-9+/_=-]{120,})/gu;
export const rewriteMascotText=value=>value.split(opaque).map((part,i)=>i%2?part:renameLegacyIdentifier(part)).join('');
export function migrateMascotPreferences(storage){
 const keys=Array.from({length:storage.length},(_,i)=>storage.key(i)).filter(key=>key!==null);let migrated=0;
 for(const oldKey of keys){const key=renameLegacyIdentifier(oldKey);if(key===oldKey)continue;const value=storage.getItem(oldKey);if(value===null)continue;if(storage.getItem(key)===null)storage.setItem(key,value);storage.removeItem(oldKey);migrated++;}
 return migrated;
}
for(const name of ['localStorage','sessionStorage']){try{const storage=globalThis[name];if(storage)migrateMascotPreferences(storage);}catch{/* Keep existing data if access or migration fails */}}
"""

def identity_tests():
    return r"""import test from 'node:test';
import assert from 'node:assert/strict';
import {MASCOT_NAME,MASCOT_ID,renameLegacyIdentifier,rewriteMascotText,migrateMascotPreferences} from './mascotIdentity.mjs';
const words=[[65,84,88],[65,84,90],[90,48,78,89,88],[90,79,78,89,88]].map(c=>String.fromCharCode(...c));
const previous=words[1].toLowerCase();
function storage(entries=[]){const data=new Map(entries);return {data,get length(){return data.size;},key:i=>[...data.keys()][i]??null,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};}
test('canonical display and technical names',()=>{assert.equal(MASCOT_NAME,'ZØNYX');assert.equal(MASCOT_ID,'zonyx');for(const word of words)assert.equal(renameLegacyIdentifier(word),MASCOT_NAME);});
test('references, selectors and resource paths migrate consistently',()=>{assert.equal(renameLegacyIdentifier(previous+'-tutorial-hidden'),MASCOT_ID+'-tutorial-hidden');assert.equal(renameLegacyIdentifier('src/medias/'+words[1]+'Robot..png'),'src/medias/'+MASCOT_NAME+'Robot..png');assert.equal(renameLegacyIdentifier('Audio ToolZ'),'Audio ToolZ');assert.equal(renameLegacyIdentifier('formatZero'),'formatZero');});
test('encoded media payloads are not renamed',()=>{const payload='data:image/svg+xml;base64,'+'A'.repeat(160)+words[1]+'A'.repeat(160);assert.equal(rewriteMascotText(payload),payload);});
test('saved values migrate without modification',()=>{const value=JSON.stringify({title:words[1]+' sample.wav'}),s=storage([[previous+'-preferences',value]]);assert.equal(migrateMascotPreferences(s),1);assert.equal(s.getItem(MASCOT_ID+'-preferences'),value);assert.equal(s.getItem(previous+'-preferences'),null);assert.equal(migrateMascotPreferences(s),0);});
test('newer preferences win on a key collision',()=>{const s=storage([[previous+'-theme','old'],[MASCOT_ID+'-theme','new']]);migrateMascotPreferences(s);assert.equal(s.getItem(MASCOT_ID+'-theme'),'new');assert.equal(s.length,1);});
test('a failed write cannot delete the saved value',()=>{const s=storage([[previous+'-theme','saved']]);s.setItem=()=>{throw new Error('quota')};assert.throws(()=>migrateMascotPreferences(s),/quota/);assert.equal(s.getItem(previous+'-theme'),'saved');});
"""

def updated_audit(text):
    newline='\r\n' if '\r\n' in text else '\n'
    text=text.replace('\r\n','\n')
    header="import {rewriteMascotText} from './mascotIdentity.mjs';\n"
    if header in text:return text.replace('\n',newline)
    text,count=re.subn(r'^const typo=.*?,robotTypos=\[\],colors=\[\];$', 'const robotTypos=[],colors=[];',text,flags=re.M)
    old='typo.lastIndex=0;if(typo.test(lines[i]))'
    if count!=1 or old not in text:raise RuntimeError('Audit source changed; manual review required')
    text=text.replace(old,'if(rewriteMascotText(lines[i])!==lines[i])')
    lines=text.splitlines(keepends=True)
    for i,line in enumerate(lines):
        if line.startswith('const files='):
            ending='\n' if line.endswith('\n') else ''
            line=line.rstrip('\n')
            if not line.endswith(';'):raise RuntimeError('Unexpected audit declaration')
            lines[i]=line[:-1]+r".filter(p=>!p.startsWith('.github/')&&!/(?:^|\/)(?:vendor|third_party)\//.test(p));"+ending
            break
    else:raise RuntimeError('Missing audit file list')
    return (header+''.join(lines)).replace('\n',newline)

def apply(root):
    tracked=subprocess.check_output(['git','ls-files','-z'],cwd=root).decode('utf-8').split('\0')
    records=[];destinations=set()
    for name in filter(None,tracked):
        path=Path(name)
        if not eligible(path):continue
        target=Path(renamed(name));folded=target.as_posix().casefold()
        if folded in destinations:raise RuntimeError('Filename collision: '+str(target))
        destinations.add(folded)
        source=root/path
        if source.is_symlink():
            if target!=path:raise RuntimeError('Symlink requires manual review: '+name)
            continue
        raw=source.read_bytes();data=raw
        if b'\0' not in raw:
            try:
                text=transformed(raw.decode('utf-8'))
                if name=='src/utils/reviewAudit.mjs':text=updated_audit(text)
                data=text.encode('utf-8')
            except UnicodeDecodeError:pass
        records.append((path,target,raw,data,stat.S_IMODE(source.stat().st_mode)))
    planned={target.as_posix():data for _,target,_,data,_ in records}
    main='src/main.tsx'
    if main not in planned:raise RuntimeError('Missing frontend entry point')
    entry=planned[main].decode('utf-8');start="import './utils/mascotIdentity.mjs';\n"
    if start not in entry:entry=entry[:1]+start+entry[1:] if entry.startswith('\ufeff') else start+entry
    planned[main]=entry.encode('utf-8')
    planned['src/utils/mascotIdentity.mjs']=identity_module().encode('utf-8')
    planned['src/utils/mascotIdentity.d.mts']=("export const MASCOT_NAME:'ZØNYX';\nexport const MASCOT_ID:'zonyx';\nexport function renameLegacyIdentifier(value:string):string;\nexport function rewriteMascotText(value:string):string;\nexport function migrateMascotPreferences(storage:Pick<Storage,'length'|'key'|'getItem'|'setItem'|'removeItem'>):number;\n").encode('utf-8')
    planned['src/utils/mascotIdentity.test.mjs']=identity_tests().encode('utf-8')
    originals={p.as_posix() for p,_,_,_,_ in records}
    for name,data in planned.items():
        target=root/name
        if target.exists() and name not in originals:raise RuntimeError('Untracked destination exists: '+name)
        if renamed(name)!=name:raise RuntimeError('Unmigrated destination')
        if b'\0' not in data:
            try:
                if transformed(data.decode('utf-8')).encode('utf-8')!=data:raise RuntimeError('Unmigrated reference: '+name)
            except UnicodeDecodeError:pass
    changes=[name for name,data in planned.items() if not (root/name).exists() or (root/name).read_bytes()!=data]
    renames=[target.as_posix() for path,target,_,_,_ in records if path!=target]
    if not changes and not renames:return {'changed':False,'filesChanged':0,'filesRenamed':0}
    for name,data in planned.items():
        target=root/name;target.parent.mkdir(parents=True,exist_ok=True)
        if not target.exists() or target.read_bytes()!=data:target.write_bytes(data)
    for path,target,_,_,mode in records:
        os.chmod(root/target,mode)
        if path!=target:(root/path).unlink()
    report={'changed':True,'name':NAME,'technicalIdentifier':IDENTIFIER,'filesChanged':len(changes),'filesRenamed':len(renames),'renamedFiles':renames,'baseCommit':os.environ.get('GITHUB_SHA'),'validation':'pending','scope':'Tracked first-party files; archives, workflows, dependencies and Git history are preserved'}
    report_path=root/'.github/diagnostics/zonyx-migration.json';report_path.parent.mkdir(parents=True,exist_ok=True);report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return report

def self_test():
    assert renamed(WORDS[1])==NAME
    assert renamed(WORDS[1].lower()+'-theme')==IDENTIFIER+'-theme'
    assert renamed('Audio ToolZ formatZero')=='Audio ToolZ formatZero'
    payload='data:image/png;base64,'+'A'*160+WORDS[1]+'A'*160
    assert transformed(payload)==payload
    audit_path=Path(__file__).resolve().parents[2]/'src/utils/reviewAudit.mjs'
    audit=audit_path.read_text(encoding='utf-8')
    results=[]
    for label,newline in [('LF','\n'),('CRLF','\r\n')]:
        source=audit.replace('\r\n','\n').replace('\n',newline)
        prepared=transformed(source)
        patched=updated_audit(prepared)
        assert updated_audit(patched)==patched
        if label=='CRLF':assert '\n' not in patched.replace('\r\n','')
        else:assert '\r' not in patched
        try:updated_audit('const unsupportedAudit=true;'+newline)
        except RuntimeError:pass
        else:raise AssertionError('Unknown audit formats must still be rejected')
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);subprocess.run(['git','init','-b','v.1.7-dev'],cwd=root,check=True,capture_output=True)
            files={'src/main.tsx':"import './components/Tutorial';\n",'src/components/Tutorial.tsx':f"export const title='{WORDS[1]}';export const image='../medias/{WORDS[1]}.ogg';export const key='{WORDS[1].lower()}-tutorial-hidden';\n",'src/utils/reviewAudit.mjs':source,'src/index.css':'.'+WORDS[1].lower()+'-control{color:green}',f'src/medias/{WORDS[1]}.ogg':b'\x00\xffunchanged-audio','.github/diagnostics/archive.md':WORDS[1]}
            for name,data in files.items():
                path=root/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data if isinstance(data,bytes) else data.encode('utf-8'))
            subprocess.run(['git','add','-A'],cwd=root,check=True,capture_output=True)
            report=apply(root)
            assert report['filesRenamed']==1
            assert (root/f'src/medias/{NAME}.ogg').read_bytes()==b'\x00\xffunchanged-audio'
            assert (root/'.github/diagnostics/archive.md').read_text()==WORDS[1]
            assert (root/'src/main.tsx').read_text().startswith("import './utils/mascotIdentity.mjs';")
            assert (root/'src/utils/reviewAudit.mjs').read_bytes()==patched.encode('utf-8')
            subprocess.run(['git','add','-A'],cwd=root,check=True,capture_output=True)
            for command in [['node','--test','src/utils/mascotIdentity.test.mjs'],['node','src/utils/reviewAudit.mjs']]:
                result=subprocess.run(command,cwd=root,capture_output=True,text=True)
                if result.returncode:raise RuntimeError(result.stdout+result.stderr)
            assert apply(root)['changed'] is False
            results.append({'lineEndings':label,'filesChanged':report['filesChanged'],'filesRenamed':report['filesRenamed'],'nodeTests':'passed','audit':'passed','idempotence':True})
    print(json.dumps({'fixtures':results},ensure_ascii=False))

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--self-test',action='store_true');parser.add_argument('--apply',action='store_true');args=parser.parse_args()
    if args.self_test:self_test();return
    if not args.apply:parser.error('Select --self-test or --apply')
    root=Path(git(Path.cwd(),'rev-parse','--show-toplevel'))
    if os.environ.get('GITHUB_REPOSITORY')!='x-R0b0T-x/Audio-ToolZ':raise RuntimeError('Unexpected repository')
    if git(root,'branch','--show-current')!='v.1.7-dev':raise RuntimeError('Development branch required')
    if git(root,'rev-parse','HEAD')!=os.environ.get('GITHUB_SHA'):raise RuntimeError('Branch advanced; do not overwrite newer changes')
    if git(root,'status','--porcelain'):raise RuntimeError('Clean checkout required')
    print(json.dumps(apply(root),ensure_ascii=False))

if __name__=='__main__':main()
