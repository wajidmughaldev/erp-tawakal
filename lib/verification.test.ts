import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verificationToken,cameraError} from './verification';
test('QR accepts tokens and only current portal verification URLs',()=>{const origin='https://portal.test';assert.equal(verificationToken('safe-token',origin),'safe-token');assert.equal(verificationToken(origin+'/verify?token=backend-token',origin),'backend-token');assert.throws(()=>verificationToken('https://evil.test/verify?token=test',origin));assert.throws(()=>verificationToken(origin+'/login?token=test',origin));assert.throws(()=>verificationToken('x'.repeat(513),origin));assert.throws(()=>verificationToken('',origin));});
test('camera denial and unavailable states are distinct',()=>{assert.match(cameraError(new DOMException('Denied','NotAllowedError')),/permission denied/);assert.match(cameraError(new DOMException('Missing','NotFoundError')),/unavailable/);});
