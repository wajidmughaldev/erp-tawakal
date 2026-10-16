import {test} from 'node:test';
import assert from 'node:assert/strict';
import {employeesApi,cardsApi} from './services';
import {blankDossier} from './dossier';
test('employee ETag stays with its fetch result and multipart edit sends If-Match',async()=>{
 process.env.NEXT_PUBLIC_API_BASE_URL='https://api.example.test';const original=globalThis.fetch;let sent='';
 globalThis.fetch=async(_url,init)=>{if(init?.method==='POST'){sent=new Headers(init.headers).get('If-Match')??'';assert.equal((init.body as FormData).get('_method'),'PATCH');return Response.json({data:{id:'42'}});}return Response.json({data:{id:'42'}},{headers:{ETag:'"employee-42-v3"'}});};
 try{const record=await employeesApi.get('42');assert.equal(record.etag,'"employee-42-v3"');await employeesApi.update('42',blankDossier(),undefined,record.etag);assert.equal(sent,record.etag);}finally{globalThis.fetch=original;}
});
test('renewal carries the explicit stable attempt key without creating a new key in the API client',async()=>{
 const original=globalThis.fetch;const key=crypto.randomUUID();let calls=0;
 globalThis.fetch=async(_url,init)=>{assert.equal(new Headers(init?.headers).get('Idempotency-Key'),key);assert.equal(new Headers(init?.headers).get('If-Match'),'"card-42-v1"');calls++;return Response.json({data:{id:'42'}});};
 try{await cardsApi.renew('42','existing',key,'"card-42-v1"');await cardsApi.renew('42','existing',key,'"card-42-v1"');assert.equal(calls,2);}finally{globalThis.fetch=original;}
});
