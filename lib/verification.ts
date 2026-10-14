export function verificationToken(input: string, origin: string) {
  const value=input.trim();
  if(!value||value.length>2048)throw new Error('Enter a valid verification token or portal URL.');
  let token=value;
  if(value.includes('://')||value.startsWith('/')) {
    let url:URL;try{url=new URL(value,origin);}catch{throw new Error('Invalid verification URL.');}
    if(url.origin!==origin||url.pathname!=='/verify'||url.username||url.password)throw new Error('Only verification URLs from this portal are accepted.');
    token=url.searchParams.get('token')??url.searchParams.get('code')??'';
  }
  if(!/^[A-Za-z0-9._~-]{1,512}$/.test(token))throw new Error('Invalid verification token format.');
  return token;
}
export function cameraError(error: unknown) {
  const name=error instanceof Error?error.name:'';
  return name==='NotAllowedError'||name==='PermissionDeniedError'?'Camera permission denied. Allow camera access or use manual verification.':name==='NotFoundError'||name==='NotReadableError'?'Camera unavailable. Connect an available camera or use manual verification.':'Unable to start the camera. Use HTTPS and check camera availability.';
}
