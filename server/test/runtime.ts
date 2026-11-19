import {existsSync} from 'fs';
import {testEnvironment} from './environment';
async function main() {
 if(existsSync('.env')||existsSync('server/.env')) throw new Error('Content test server refuses environment files; use an isolated checkout');
 Object.assign(process.env,testEnvironment(process.env),{NODE_ENV:'test',DEEPSEEK_API_KEY:'content-test-disabled',DEEPSEEK_BASE_URL:'http://127.0.0.1:9'});
 const {default:app}=await import('../src/app');const {prisma}=await import('../src/lib/prisma');
 const server=app.listen(3801,'127.0.0.1',()=>console.log('Isolated content test API on 127.0.0.1:3801'));
 for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>{server.close(()=>{void prisma.$disconnect().then(()=>process.exit(0));});});
}
main().catch(error=>{console.error(error);process.exit(1);});
