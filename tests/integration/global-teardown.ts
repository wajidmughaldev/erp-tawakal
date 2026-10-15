import {execFileSync} from 'node:child_process';
export default function teardown(){
 try{execFileSync('php',['tests/integration/backend.php','cleanup'],{cwd:'laravel-backend',stdio:'pipe'});execFileSync('php',['tests/integration/backend.php','policy','unconfigured'],{cwd:'laravel-backend',stdio:'pipe'});}
 catch{throw new Error('Owned integration fixture cleanup failed. Review the guarded test database before rerunning.');}
}
