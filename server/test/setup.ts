import {vi} from 'vitest';
vi.mock('dotenv',()=>({default:{config:()=>({parsed:{}})}}));
import {testEnvironment} from './environment';
Object.assign(process.env,testEnvironment(process.env));
process.env.DEEPSEEK_API_KEY='content-test-disabled';
process.env.DEEPSEEK_BASE_URL='http://127.0.0.1:9';
