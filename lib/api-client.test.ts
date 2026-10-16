import {test} from 'node:test';
import assert from 'node:assert/strict';
import {request, ApiError} from './api-client';
import {auth} from './auth';
import {cardLabel, daysToExpiry, currentCard, latestCard, IDCard} from './contracts';

test('unconfigured API cannot report success', async () => {
  delete process.env.NEXT_PUBLIC_API_BASE_URL;
  await assert.rejects(request('/employees'), (error: ApiError) => error.status === 503);
});
test('session login requires CSRF, login and confirmed user', async () => {
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.test';
  const original = globalThis.fetch; const calls: string[] = [];
  globalThis.fetch = async (url, options) => {
    calls.push(String(url)); assert.equal(options?.credentials, 'include'); assert.equal(options?.cache, 'no-store');
    return String(url).endsWith('/auth/me') ? Response.json({data:{id:'1',name:'Admin',role:'admin'}}) : new Response(null,{status:204});
  };
  try {assert.equal((await auth.login('admin','secret',false)).data.id,'1'); assert.deepEqual(calls.map(url => new URL(url).pathname), ['/sanctum/csrf-cookie','/api/v1/auth/login','/api/v1/auth/me']);}
  finally {globalThis.fetch=original;}
});
test('validation and forbidden responses retain meaningful states', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({errors:{cnic:['Invalid CNIC']}},{status:422});
  try {await assert.rejects(request('/employees'), (error: ApiError) => error.status===422 && error.fields.cnic[0]==='Invalid CNIC');}
  finally {globalThis.fetch=original;}
});
test('expiry derives from dates and revocation wins', () => {
  const now = new Date('2026-10-14T12:00:00Z');
  assert.equal(daysToExpiry('2026-10-15',now),1);
  assert.equal(cardLabel({status:'active',expiryDate:'2026-10-13'},now),'Expired');
  assert.equal(cardLabel({status:'revoked',expiryDate:'2027-01-01'},now),'Revoked');
});
test('card badges use the server application date even across browser timezone boundaries',()=>{
 const card={status:'active' as const,expiryDate:'2026-02-01',asOfDate:'2026-02-01'};
 for(const now of [new Date('2026-01-31T23:30:00Z'),new Date('2026-02-02T01:00:00Z')])assert.equal(cardLabel(card,now),'Expiring Soon');
 assert.equal(daysToExpiry('2026-02-01',new Date('2026-01-31T23:30:00Z'),card.asOfDate),0);
});
test('mutation sends decoded Sanctum CSRF cookie', async()=>{
  const original=globalThis.fetch;
  Object.defineProperty(globalThis,'document',{configurable:true,value:{cookie:'XSRF-TOKEN=csrf%3Dvalue'}});
  globalThis.fetch=async(_url,options)=>{assert.equal(new Headers(options?.headers).get('X-XSRF-TOKEN'),'csrf=value');return new Response(null,{status:204});};
  try{await request('/employees',{method:'POST',body:'{}'});}finally{globalThis.fetch=original;delete (globalThis as any).document;}
});
test('directory keeps latest credential status while current-card selection excludes revoked history',()=>{
  const records=[{id:'older',status:'active',issueDate:'2026-01-01',verificationToken:'mock'},{id:'newer',status:'revoked',issueDate:'2026-10-01'}] as IDCard[];
  assert.equal(latestCard(records)?.id,'newer');assert.equal(currentCard(records)?.id,'older');
  assert.equal(currentCard([records[1]]),undefined);assert.equal(latestCard([]),undefined);
});


test('anonymous public POST coalesces CSRF bootstrap and sends the decoded cookie',async()=>{
  process.env.NEXT_PUBLIC_API_BASE_URL='https://api.example.test';const original=globalThis.fetch;
  const document={cookie:''};Object.defineProperty(globalThis,'document',{configurable:true,value:document});let bootstraps=0,writes=0;
  globalThis.fetch=async(url,options)=>{if(String(url).endsWith('/sanctum/csrf-cookie')){bootstraps++;await new Promise(resolve=>setTimeout(resolve,5));document.cookie='XSRF-TOKEN=anonymous%3Dcsrf';return new Response(null,{status:204});}writes++;assert.equal(new Headers(options?.headers).get('X-XSRF-TOKEN'),'anonymous=csrf');return Response.json({status:'invalid'});};
  try{await Promise.all([request('/verify-card',{public:true,method:'POST',body:'{}'}),request('/registration-invites/validate',{public:true,method:'POST',body:'{}'})]);assert.equal(bootstraps,1);assert.equal(writes,2);}finally{globalThis.fetch=original;delete (globalThis as any).document;}
});
test('419 refreshes security state once without replaying a mutation',async()=>{
  const original=globalThis.fetch;Object.defineProperty(globalThis,'document',{configurable:true,value:{cookie:'XSRF-TOKEN=old'}});let writes=0,bootstraps=0;
  globalThis.fetch=async(url)=>{if(String(url).endsWith('/sanctum/csrf-cookie')){bootstraps++;return new Response(null,{status:204});}writes++;return Response.json({},{status:419});};
  try{await assert.rejects(request('/employee-requests',{public:true,method:'POST',body:'{}'}),(error:ApiError)=>error.status===419);assert.equal(writes,1);assert.equal(bootstraps,1);}finally{globalThis.fetch=original;delete (globalThis as any).document;}
});
test('failed CSRF bootstrap cannot send a public mutation',async()=>{
  const original=globalThis.fetch;Object.defineProperty(globalThis,'document',{configurable:true,value:{cookie:''}});let writes=0;
  globalThis.fetch=async(url)=>{if(!String(url).endsWith('/sanctum/csrf-cookie'))writes++;return Response.json({},{status:503});};
  try{await assert.rejects(request('/verify-card',{public:true,method:'POST',body:'{}'}),(error:ApiError)=>error.message.includes('initialize'));assert.equal(writes,0);}finally{globalThis.fetch=original;delete (globalThis as any).document;}
});
test('legacy missing-token cards are historical, never current QR credentials',()=>{
  const legacy={id:'legacy',status:'active',expiryDate:'2030-01-01',issueDate:'2026-01-01',verificationToken:'',credentialState:'historical'} as IDCard;
  assert.equal(cardLabel(legacy),'Historical / No QR');assert.equal(currentCard([legacy]),undefined);
});
