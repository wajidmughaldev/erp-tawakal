export function initialFilter(params: {get:(key:string)=>string|null}, key:string, fallback:string) {
  const raw=params.get(key);
  if(!raw)return fallback;
  const labels:Record<string,string>={active:'Active',inactive:'Inactive',resigned:'Resigned',transferred:'Transferred',expiring:'Expiring Soon',expiring_soon:'Expiring Soon',expired:'Expired',revoked:'Deactivated',replaced:'Replaced',expiry_asc:'Expiry Soonest',issue_desc:'Newest First',issue_asc:'Oldest First'};
  return labels[raw]??raw;
}
export function initialPage(params:{get:(key:string)=>string|null}) {const page=Number(params.get('page'));return Number.isInteger(page)&&page>0?page:1;}
export function persistListQuery(values:Record<string,string|number>) {
  const url=new URL(window.location.href);
  for(const [key,value] of Object.entries(values)) {
    if(!value||value==='All'||value==='All Account Statuses'||(key==='page'&&value===1))url.searchParams.delete(key);
    else url.searchParams.set(key,String(value));
  }
  window.history.replaceState(window.history.state,'',url.toString());
}
