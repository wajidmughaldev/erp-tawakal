import {resolve,sep} from 'node:path';
import type {Reporter,TestCase,TestResult,FullResult} from '@playwright/test/reporter';
import {mkdirSync,writeFileSync,unlinkSync} from 'node:fs';
function redact(value:string){return value.replace(/[A-Za-z0-9_-]{43,}/g,'[redacted]').replace(/\b\d{5}-\d{7}-\d\b/g,'[identity]').replace(/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}/gi,'[request-id]');}
export default class SafeReporter implements Reporter {
 private records:unknown[]=[];
 onTestEnd(test:TestCase,result:TestResult){
  for(const attachment of result.attachments){if(attachment.path&&resolve(attachment.path).startsWith(resolve('.next/integration-results')+sep)){try{unlinkSync(attachment.path);}catch{}}}
  const title=redact(test.title),status=result.status;
  const errors=result.errors.map(error=>redact((error.message??'Browser check failed').split('\n').slice(0,13).join(' | ')));
  this.records.push({title,status,errors});process.stdout.write(status.toUpperCase()+': '+title+(errors.length?' ('+errors.join('; ')+')':'')+'\n');
 }
 onError(error:{message?:string}){process.stderr.write('Integration infrastructure: '+redact(error.message??'unknown failure').split('\n')[0]+'\n');}
 onEnd(result:FullResult){mkdirSync('.next/integration-report',{recursive:true});writeFileSync('.next/integration-report/results.json',JSON.stringify({status:result.status,tests:this.records},null,2));process.stdout.write('Real integration run: '+result.status+'\n');}
}
