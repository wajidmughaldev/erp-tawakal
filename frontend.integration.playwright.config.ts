import {defineConfig} from '@playwright/test';
import {existsSync} from 'node:fs';
process.env.PLAYWRIGHT_NO_COPY_PROMPT='1';
const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
export default defineConfig({
 testDir:'./tests/integration',testMatch:'*.spec.ts',workers:1,fullyParallel:false,timeout:90000,expect:{timeout:15000},retries:0,
 globalSetup:'./tests/integration/global-setup.ts',globalTeardown:'./tests/integration/global-teardown.ts',reporter:'./tests/integration/safe-reporter.ts',outputDir:'.next/integration-results',
 use:{baseURL:'http://localhost:3200',headless:true,trace:'off',screenshot:'off',video:'off',launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH??(process.platform==='win32'&&existsSync(chrome)?chrome:undefined)}},
 webServer:[
  {command:'php -S localhost:8200 tests/integration/router.php',cwd:'laravel-backend',url:'http://localhost:8200/up',reuseExistingServer:false,timeout:30000,stdout:'ignore',stderr:'ignore'},
  {command:'npx next start -p 3200',url:'http://localhost:3200/login',reuseExistingServer:false,timeout:60000,env:{NEXT_PUBLIC_API_BASE_URL:'http://localhost:8200',NEXT_OUTPUT_DIR:'.next/integration-build',NEXT_FRONTEND_TEST:'0'},stdout:'ignore',stderr:'ignore'},
 ],
});
