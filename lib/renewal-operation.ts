export type RenewalOperation = {key:string; administratorId:string; cardId:string; option:'existing'|'new_physical'; etag:string; createdAt:number};
const prefix='tawakal:renewal:';
export const renewalStorageKey=(administratorId:string,cardId:string)=>prefix+administratorId+':'+cardId;
export function restoreRenewal(storage:Storage,administratorId:string,cardId:string):RenewalOperation|null {
  // Metadata from a different signed-in account must never be offered for replay.
  for(let index=storage.length-1;index>=0;index--){const key=storage.key(index);if(key?.startsWith(prefix)&&!key.startsWith(prefix+administratorId+':'))storage.removeItem(key);}
  const name=renewalStorageKey(administratorId,cardId),raw=storage.getItem(name);
  if(!raw)return null;
  try{
    const value=JSON.parse(raw) as RenewalOperation;
    if(value.administratorId!==administratorId||value.cardId!==cardId||!['existing','new_physical'].includes(value.option)||!/^\"card-[A-Za-z0-9-]+-v[1-9][0-9]*\"$/.test(value.etag)||!/^\w{8}-(?:\w{4}-){3}\w{12}$/.test(value.key)||!Number.isFinite(value.createdAt)||value.createdAt>Date.now()+60000)throw new Error('Invalid renewal metadata');
    return {key:value.key,administratorId,cardId,option:value.option,etag:value.etag,createdAt:value.createdAt};
  }catch{storage.removeItem(name);throw new Error('Invalid pending renewal metadata was removed. Reload and review the card before starting a new operation.');}
}
export function saveRenewal(storage:Storage,operation:RenewalOperation){storage.setItem(renewalStorageKey(operation.administratorId,operation.cardId),JSON.stringify(operation));}
export function clearRenewal(storage:Storage,operation:RenewalOperation){storage.removeItem(renewalStorageKey(operation.administratorId,operation.cardId));}
