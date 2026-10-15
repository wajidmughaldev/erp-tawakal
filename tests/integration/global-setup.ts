import {execFileSync} from 'node:child_process';
export default function setup(){
 try{execFileSync('php',['tests/integration/backend.php','init'],{cwd:'laravel-backend',stdio:'pipe'});}
 catch{throw new Error('Cannot initialize the guarded integration database. Review .env.integration; no real database may be used.');}
}
