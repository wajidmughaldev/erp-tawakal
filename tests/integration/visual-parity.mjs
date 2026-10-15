import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
const base='e328478405496030ffa54c57216cf41df0004cf9';
const git=(...args)=>execFileSync('git',['-c','safe.directory='+process.cwd().replaceAll('\\','/'),...args],{encoding:'utf8'}).trim();
const paths=git('diff','--name-only',base,'--','app','components').split('\n').filter(path=>path.endsWith('.tsx'));
function classes(source){const found=[];const ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);function visit(node){if(ts.isJsxAttribute(node)&&node.name.getText(ast)==='className'&&node.initializer)found.push(node.initializer.getText(ast));ts.forEachChild(node,visit);}visit(ast);return found;}
const results=[];
for(const path of paths){const before=classes(git('show',base+':'+path)),after=classes(readFileSync(path,'utf8'));const remaining=[...after];for(const value of before){const index=remaining.indexOf(value);if(index<0)throw new Error('Approved layout class changed: '+path);remaining.splice(index,1);}results.push({path,approvedClassAttributesPreserved:before.length,newStateAttributes:remaining.length});}
mkdirSync('.next/integration-qa',{recursive:true});writeFileSync('.next/integration-qa/visual-parity.json',JSON.stringify({base,files:results},null,2));console.log('PASS: existing approved class attributes preserved across '+results.length+' changed frontend screens/components.');
