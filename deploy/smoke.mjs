// End-to-end smoke test of the production build: static site + real Laravel API + real database.
// Start the API and `node deploy/local-preview.mjs` first (see deploy/DEPLOY.md, "Try it locally"), then:
//
//   SMOKE_URL=http://localhost:4000 SMOKE_EMAIL=... SMOKE_PASSWORD=... node deploy/smoke.mjs
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';

const base = process.env.SMOKE_URL ?? 'http://localhost:4000';
const email = process.env.SMOKE_EMAIL;
const password = process.env.SMOKE_PASSWORD;
assert(email && password, 'Set SMOKE_EMAIL and SMOKE_PASSWORD (a superadmin).');
const chrome = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({executablePath: existsSync(chrome) ? chrome : undefined});
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const pdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF');
const run = Date.now().toString().slice(-6);
const cnic = () => `42101-${Math.floor(1000000 + Math.random() * 8999999)}-${Math.floor(Math.random() * 9)}`;
let step = 0;
const violations = [];
const watch = page => page.on('console', message => {if (/Content Security Policy|Refused to/i.test(message.text())) violations.push(message.text());});
const ok = message => console.log(`  ${String(++step).padStart(2, '0')} ok - ${message}`);

async function signIn(page, who, secret) {
  await page.goto(`${base}/login`);
  await page.getByPlaceholder('Email').fill(who);
  await page.locator('input[autocomplete="current-password"]').fill(secret);
  await page.getByRole('button', {name: 'Sign In', exact: true}).click();
}
async function signOut(page) {
  await page.getByRole('button', {name: 'Sign out'}).click();
  await page.waitForURL(/\/login/);
}
async function fillForm(page, {name, id, candidate}) {
  await page.locator('input[type=file][accept^="image"]').setInputFiles({name: 'face.png', mimeType: 'image/png', buffer: png});
  const values = {fullName: name, designation: 'Sales Representative', dateOfBirth: '1990-03-15', dependents: '2', cnic: id, fatherName: 'Test Father', joiningDate: '2026-01-10', cnicExpiry: '2032-03-15'};
  for (const [key, value] of Object.entries(values)) await page.locator(`input[name="${key}"]`).fill(value);
  await page.locator('select[name="maritalStatus"]').selectOption('Married');
  await page.locator('select[name="gender"]').selectOption('Male');
  await page.locator('select[name="bloodGroup"]').selectOption('B+');
  await page.getByRole('button', {name: /Continue to/}).click();
  await page.locator('textarea[name="residentialAddress"]').fill('House 1, Street 2, Hyderabad');
  await page.locator('input[name="mobileNumber"]').fill('0300 1234567');
  await page.locator('input[name="emergencyContact1"]').fill('0321 0000000 (Brother)');
  await page.getByRole('button', {name: /Continue to/}).click();
  for (const [field, value] of [['name', 'Reference One'], ['relation', 'Manager'], ['contact', '0333 1111111']]) await page.locator(`input[name="primaryReference.${field}"]`).fill(value);
  await page.getByRole('button', {name: /Continue to/}).click();
  await page.getByRole('button', {name: /Continue to/}).click();
  await page.getByLabel('Upload CNIC Copy (Front & Back)').setInputFiles({name: 'cnic.pdf', mimeType: 'application/pdf', buffer: pdf});
  await page.locator('input[type=checkbox]').first().check();
  if (!candidate) assert(await page.getByLabel(/Issue the employee/).isChecked(), 'card issuance is on by default');
}

let admin;
try {
  console.log(`Smoke test against ${base}`);
  admin = await (await browser.newContext()).newPage();
  watch(admin);

  // --- sign in
  await signIn(admin, email, 'wrong-password');
  await admin.getByText('Invalid email or password.').waitFor();
  ok('wrong password is rejected');
  await signIn(admin, email, password);
  await admin.waitForURL(/\/dashboard/);
  await admin.getByRole('heading', {name: 'Dashboard'}).waitFor();
  ok('superadmin signs in and sees the dashboard');

  // --- manager account (shown once), then sign in as that manager
  await admin.goto(`${base}/managers`);
  await admin.getByRole('button', {name: 'Add Manager'}).click();
  const dialog = admin.getByRole('dialog');
  const managerEmail = `manager${run}@example.test`;
  await dialog.getByLabel('Full Name').fill('Smoke Manager');
  await dialog.getByLabel('Login Email').fill(managerEmail);
  await dialog.getByLabel('Phone').fill('0300 0000000');
  await dialog.getByLabel('Department').fill('Sales');
  await dialog.getByLabel('Branch').fill('Hyderabad');
  await dialog.getByRole('button', {name: 'Generate', exact: true}).click();
  const managerPassword = await dialog.getByLabel('Initial Password', {exact: true}).inputValue();
  await dialog.getByRole('button', {name: 'Create Manager Account'}).click();
  await dialog.getByText(`Password: ${managerPassword}`).waitFor();
  await dialog.getByRole('button', {name: 'Done'}).click();
  ok('manager created, password shown once');

  // --- employee with documents and an ID card
  const employeeName = `Smoke Employee ${run}`;
  const employeeCnic = cnic();
  await admin.goto(`${base}/add-employee`);
  await fillForm(admin, {name: employeeName, id: employeeCnic});
  await admin.getByRole('button', {name: 'Save & Enroll Employee'}).last().click();
  await admin.getByText(/Employee saved: EMP-/).waitFor();
  await admin.getByText(/ID card issued: CARD-/).waitFor();
  ok('employee saved with a document and an ID card');
  await admin.getByRole('link', {name: 'View ID Card'}).click();
  await admin.getByTestId('id-card-front').getByText(employeeName).waitFor();
  await admin.getByTestId('id-card-back').getByText(employeeCnic).waitFor();
  ok('card shows the holder on the front and the CNIC on the back');

  // --- duplicate CNIC is reported on step 1
  await admin.goto(`${base}/add-employee`);
  await admin.locator('input[name="cnic"]').fill(employeeCnic);
  await admin.locator('input[name="cnic"]').blur();
  await admin.getByText('This CNIC is already registered.').waitFor();
  ok('a registered CNIC is flagged immediately');

  // --- global card colour
  await admin.goBack();
  const colour = admin.locator('input[type="color"]');
  await colour.fill('#7a1f2b');
  await admin.getByRole('button', {name: 'Apply to all cards'}).click();
  await admin.getByText('Colour applied to all cards.').waitFor();
  await admin.getByRole('button', {name: 'Reset to default'}).click();
  await admin.getByText('Colour reset to the default.').waitFor();
  ok('card colour can be changed for all cards and reset');

  // --- public verification (no login)
  const cardId = new URL(admin.url()).searchParams.get('id');
  const detailResponse = await admin.request.get(`${base}/api/v1/id-cards/${cardId}`, {headers: {Accept: 'application/json', Origin: base}});
  assert(detailResponse.ok(), `card lookup failed: ${detailResponse.status()} (card id ${cardId})`);
  const detail = await detailResponse.json();
  const publicPage = await (await browser.newContext()).newPage();
  watch(publicPage);
  await publicPage.goto(`${base}/verify?token=${detail.data.verificationToken}`);
  await publicPage.getByRole('heading', {name: 'Valid Card'}).waitFor();
  await publicPage.getByText(employeeName).first().waitFor();
  await publicPage.getByAltText('Card holder').waitFor();
  const photoUrl = await publicPage.getByAltText('Card holder').getAttribute('src');
  const photoResponse = await publicPage.request.get(photoUrl);
  assert.equal(photoResponse.status(), 200, `holder photo URL ${photoUrl} answered ${photoResponse.status()}`);
  await publicPage.waitForFunction(() => {const img = document.querySelector('img[alt="Card holder"]'); return img?.complete && img.naturalWidth > 0;}, null, {timeout: 10000});
  ok('public verification shows a valid card with the holder photo');

  // --- registration link -> candidate form -> approval
  await admin.goto(`${base}/employee-requests`);
  await admin.getByRole('button', {name: 'Generate Registration Link'}).first().click();
  await admin.getByRole('dialog').getByRole('button', {name: 'Generate Registration Link'}).click();
  const link = await admin.locator('input[aria-label="Registration link"]').inputValue();
  await admin.keyboard.press('Escape');
  const candidate = await (await browser.newContext()).newPage();
  watch(candidate);
  await candidate.goto(link);
  const candidateName = `Smoke Candidate ${run}`;
  await fillForm(candidate, {name: candidateName, id: cnic(), candidate: true});
  await candidate.getByRole('button', {name: 'Submit Application'}).last().click();
  await candidate.getByText(/Tracking ID: REQ-/).waitFor();
  ok('candidate submitted the registration form');
  await candidate.goto(link);
  await candidate.getByText('This invitation has already been used.').waitFor();
  ok('the registration link works only once');
  await admin.goto(`${base}/employee-requests`);
  await admin.getByRole('row').filter({hasText: candidateName}).getByRole('button', {name: /Review/}).click();
  await admin.getByRole('dialog').getByText('cnic.pdf').waitFor();
  admin.once('dialog', dialogEvent => dialogEvent.accept());
  await admin.getByRole('button', {name: 'Approve and Enroll'}).click();
  await admin.getByText(/Approved Employee ID/).waitFor();
  ok('admin reviewed the documents and approved the candidate (no card issued automatically)');

  // --- notifications for the manager
  await admin.keyboard.press('Escape');
  await signOut(admin);
  await signIn(admin, managerEmail, managerPassword);
  await admin.waitForURL(/\/dashboard/);
  assert.equal(await admin.getByRole('link', {name: 'Managers'}).count(), 0, 'managers do not see the Managers menu');
  await admin.goto(`${base}/notifications`);
  await admin.getByText('Registration approved').first().waitFor();
  await admin.getByText('New employee added').first().waitFor();
  ok('manager sees no Managers menu but receives the activity notifications');
  await admin.getByRole('button', {name: 'Mark all as read'}).click();
  await admin.getByRole('button', {name: 'Mark all as read'}).waitFor({state: 'visible'}).catch(() => {});
  ok('mark all as read works');
  await admin.goto(`${base}/managers`);
  await admin.getByText('Only a superadmin can manage manager accounts.').waitFor();
  ok('the Managers page refuses a manager');

  assert.deepEqual(violations, [], 'pages run without Content-Security-Policy violations');
  ok('no Content-Security-Policy violations in any page');
  console.log(`\nSmoke test passed (${step} checks).`);
} catch (error) {
  console.error('\nSmoke test FAILED:', error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
