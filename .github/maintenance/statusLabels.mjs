import ts from 'typescript-compiler-api';
const names=new Set(['Curseur','Sélection']);
const pattern=()=>/\b(Curseur|Sélection)(?=\s*:|\s*$)/gu;
export function markStatusLabels(source){
 const file=ts.createSourceFile('view.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[],found=new Set();
 if(file.parseDiagnostics.length)throw new Error('Invalid input TSX');
 function literal(text){let last=0,out='',changed=false;for(const match of text.matchAll(pattern())){out+=`{${JSON.stringify(text.slice(last,match.index))}}<span data-zonyx-position-label>${match[1]}</span>`;last=match.index+match[1].length;found.add(match[1]);changed=true;}return {changed,text:out+`{${JSON.stringify(text.slice(last))}}`};}
 function visit(node){
  for(let parent=node.parent;parent;parent=parent.parent)if(ts.isJsxElement(parent)&&['button','option','select','svg','title','script','style'].includes(parent.openingElement.tagName.getText(file)))return;
  if(ts.isJsxElement(node)&&node.openingElement.attributes.properties.some(p=>ts.isJsxAttribute(p)&&p.name.getText(file)==='data-zonyx-position-label')){for(const child of node.children)if(ts.isJsxText(child)&&names.has(child.text.trim()))found.add(child.text.trim());return;}
  if(ts.isJsxText(node)){const raw=source.slice(node.pos,node.end);for(const match of raw.matchAll(pattern())){edits.push({start:node.pos+match.index,end:node.pos+match.index+match[1].length,text:`<span data-zonyx-position-label>${match[1]}</span>`});found.add(match[1]);}return;}
  if((ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))&&ts.isJsxExpression(node.parent)&&(ts.isJsxElement(node.parent.parent)||ts.isJsxFragment(node.parent.parent))){const part=literal(node.text);if(part.changed)edits.push({start:node.parent.getStart(file),end:node.parent.end,text:`<>${part.text}</>`});return;}
  if(ts.isTemplateExpression(node)&&ts.isJsxExpression(node.parent)&&(ts.isJsxElement(node.parent.parent)||ts.isJsxFragment(node.parent.parent))){const head=literal(node.head.text);let text=head.text,changed=head.changed;for(const span of node.templateSpans){const tail=literal(span.literal.text);changed||=tail.changed;text+=`{String(${source.slice(span.expression.getStart(file),span.expression.end)})}${tail.text}`;}if(changed)edits.push({start:node.parent.getStart(file),end:node.parent.end,text:`<>${text}</>`});return;}
  ts.forEachChild(node,visit);
 }
 visit(file);for(const edit of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,edit.start)+edit.text+source.slice(edit.end);
 if(ts.createSourceFile('view.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX).parseDiagnostics.length)throw new Error('Invalid output TSX');
 return {source,labels:[...found]};
}
