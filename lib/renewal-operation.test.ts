import {test} from 'node:test';
import assert from 'node:assert/strict';
import {restoreRenewal,saveRenewal,clearRenewal,renewalStorageKey,type RenewalOperation} from './renewal-operation';
function storage():Storage {const values=new Map<string,string>();return {get length(){return values.size;},key:index=>[...values.keys()][index]??null,getItem:key=>values.get(key)??null,setItem:(key,value)=>{values.set(key,value);},removeItem:key=>{values.delete(key);},clear:()=>values.clear()};}
test('pending renewal survives refresh with only operation metadata; explicit clear removes it',()=>{
 const session=storage();const operation:RenewalOperation={key:crypto.randomUUID(),administratorId:'1',cardId:'42',etag:'"card-42-v1"',option:'existing',createdAt:Date.now()};saveRenewal(session,operation);assert.deepEqual(restoreRenewal(session,'1','42'),operation);assert.equal(session.length,1);assert.deepEqual(Object.keys(JSON.parse(session.getItem(renewalStorageKey('1','42'))!)).sort(),['key','administratorId','cardId','etag','option','createdAt'].sort());clearRenewal(session,operation);assert.equal(restoreRenewal(session,'1','42'),null);
});
test('account changes remove other account metadata; old unresolved entries retain their key',()=>{
 const session=storage();const old:RenewalOperation={key:crypto.randomUUID(),administratorId:'1',cardId:'42',etag:'"card-42-v1"',option:'new_physical',createdAt:Date.now()-172800000};saveRenewal(session,old);assert.equal(restoreRenewal(session,'1','42')?.key,old.key);assert.equal(restoreRenewal(session,'2','42'),null);assert.equal(session.length,0);
});
test('invalid or tampered pending metadata cannot become a replay request',()=>{
 const session=storage();for(const raw of ['{bad',JSON.stringify({administratorId:'9',cardId:'42',key:'bad'})]){session.setItem(renewalStorageKey('1','42'),raw);assert.throws(()=>restoreRenewal(session,'1','42'));assert.equal(session.length,0);}
});
