import {defineConfig,devices} from '@playwright/test';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const serverRequire=createRequire(new URL('../server/package.json',import.meta.url));
const {require:tsxRequire}=serverRequire('tsx/cjs/api');
const {testEnvironment}=tsxRequire('../server/test/environment.ts',import.meta.url);
Object.assign(process.env,testEnvironment(process.env));
const root=fileURLToPath(new URL('../',import.meta.url));
export default defineConfig({
 testDir:'./e2e/content',testIgnore:process.argv.some(arg=>arg.includes('performance.spec'))?undefined:['**/performance.spec.ts'],timeout:90000,expect:{timeout:15000},workers:1,retries:0,
 reporter:[['line'],['json',{outputFile:'test-results/content-results.json'}]],
 use:{actionTimeout:10000,baseURL:'http://127.0.0.1:5179/flowcraft/',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome'],viewport:{width:1366,height:900}}}],
 webServer:[
  {command:'npm --prefix server run dev:content-test',cwd:root,url:'http://127.0.0.1:3801/api/v1/documents',reuseExistingServer:true,timeout:30000},
  {command:'npm --prefix client run dev -- --mode content-test --strictPort',cwd:root,url:'http://127.0.0.1:5179/flowcraft/login',reuseExistingServer:true,timeout:60000},
 ],
});
