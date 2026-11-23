const fs=require('node:fs'),ts=require('typescript-compiler-api');
const path='src/App.tsx',source=fs.readFileSync(path,'utf8'),file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[];
const printer=ts.createPrinter();let callbacks=0;
function named(node,name){return ts.isIdentifier(node)&&node.text===name;}
function stripLoopGuard(node){
 if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.BarBarToken){
  const left=stripLoopGuard(node.left),right=stripLoopGuard(node.right);if(!left)return right;if(!right)return left;
  return left===node.left&&right===node.right?node:ts.factory.updateBinaryExpression(node,left,node.operatorToken,right);
 }
 if(ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.ExclamationToken&&named(node.operand,'isLooping'))return null;
 return node;
}
function inspect(node){
 if(ts.isJsxAttribute(node)&&node.name.getText(file)==='onStartPreview'&&node.initializer&&ts.isJsxExpression(node.initializer)&&node.initializer.expression){
  callbacks++;
  function visit(child){
   if(ts.isIfStatement(child)){
    const body=child.thenStatement,early=ts.isReturnStatement(body)||(ts.isBlock(body)&&body.statements.length>0&&ts.isReturnStatement(body.statements[body.statements.length-1]));
    if(early){const condition=stripLoopGuard(child.expression);if(condition!==child.expression)edits.push({start:child.expression.getStart(file),end:child.expression.end,text:condition?printer.printNode(ts.EmitHint.Expression,condition,file):'false'});}
   }
   if(ts.isCallExpression(child)&&/audioEngine\.(?:play|replacePreviewAudio)$/.test(child.expression.getText(file))){
    for(const arg of child.arguments)if(ts.isObjectLiteralExpression(arg))for(const prop of arg.properties){
     if(ts.isPropertyAssignment(prop)&&prop.name.getText(file)==='loop'&&prop.initializer.kind===ts.SyntaxKind.TrueKeyword)edits.push({start:prop.initializer.getStart(file),end:prop.initializer.end,text:'isLooping'});
    }
   }
   ts.forEachChild(child,visit);
  }
  visit(node.initializer.expression);
 }
 ts.forEachChild(node,inspect);
}
inspect(file);if(callbacks!==1)throw new Error('Expected exactly one preview callback');
let updated=source;for(const edit of edits.sort((a,b)=>b.start-a.start))updated=updated.slice(0,edit.start)+edit.text+updated.slice(edit.end);
if(updated!==source)fs.writeFileSync(path,updated);
console.log(JSON.stringify({previewCallbacks:callbacks,loopOnlyGuardsOrForcedLoopsCorrected:edits.length}));
