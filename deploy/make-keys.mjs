// Prints the two secret keys the production .env needs. Run it once, paste the lines into ems-laravel/.env,
// and keep a private copy: if they are lost the stored employee data can no longer be read.
//
//   node deploy/make-keys.mjs
import {randomBytes} from 'node:crypto';

console.log(`APP_KEY=base64:${randomBytes(32).toString('base64')}`);
console.log(`EMPLOYEE_LOOKUP_KEY=${randomBytes(32).toString('hex')}`);
