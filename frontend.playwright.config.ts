import {defineConfig} from '@playwright/test';
import {existsSync} from 'node:fs';
const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
export default defineConfig({testDir:'./tests/frontend',workers:1,timeout:45000,reporter:'list',outputDir:'.next/frontend-test-results',use:{baseURL:'http://localhost:3100',headless:true,launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH??(process.platform==='win32'&&existsSync(chrome)?chrome:undefined)}},webServer:{command:'npx next dev -p 3100',url:'http://localhost:3100/login',timeout:120000,reuseExistingServer:true,env:{NEXT_PUBLIC_API_BASE_URL:'http://localhost:8000',NEXT_FRONTEND_TEST:'1'}}});
