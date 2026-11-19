import {mkdtemp,readFile,writeFile,rm} from 'fs/promises';
import {tmpdir} from 'os';
import {join,resolve} from 'path';
import {PrismaClient} from '@prisma/client';
import {spawnSync} from 'child_process';
async function main() {
 const args=process.argv.slice(2),index=args.indexOf('--baseline'),target=process.env.CONTENT_PREFLIGHT_DATABASE_URL;
 if(!target||index<0||!args[index+1]) throw new Error('Required: explicit CONTENT_PREFLIGHT_DATABASE_URL and --baseline path/to/baseline.prisma; environment files are never loaded');
 const url=new URL(target);if(!['postgresql:','postgres:'].includes(url.protocol)) throw new Error('PostgreSQL URL required');
 // All introspection connections are read only, including Prisma CLI connections.
 url.searchParams.set('options','-c default_transaction_read_only=on');
 const source=await readFile(resolve(args[index+1]),'utf8');
 if(!/url\s*=\s*env\("DATABASE_URL"\)/.test(source)) throw new Error('Baseline must use env("DATABASE_URL")');
 const folder=await mkdtemp(join(tmpdir(),'flowcraft-schema-preflight-'));
 try {
  const baseline=join(folder,'baseline.prisma');await writeFile(baseline,source);
  const result=spawnSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','diff','--from-schema-datamodel',baseline,'--to-schema-datasource',baseline,'--script','--exit-code'],{cwd:folder,env:{...process.env,DATABASE_URL:url.toString(),PRISMA_HIDE_UPDATE_MESSAGE:'1'},encoding:'utf8',maxBuffer:8*1024*1024});
  if(![0,2].includes(result.status??-1)) throw new Error('Read-only schema diff failed; verify connectivity and baseline schema (credentials omitted)');
  const db=new PrismaClient({datasources:{db:{url:url.toString()}}});let migrations:string[]=[];
  try {const rows=await db.$queryRaw<Array<{present:boolean}>>`SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS present`;if(rows[0].present) {const history=await db.$queryRawUnsafe<Array<{migration_name:string}>>('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY started_at');migrations=history.map(row=>row.migration_name);}} finally {await db.$disconnect();}
  console.log(JSON.stringify({readOnly:true,appliedMigrations:migrations,baseline:resolve(args[index+1]),matchesBaseline:result.status===0,baselineCanBeMarked:result.status===0&&migrations.length===0,note:result.status===0?'Schema matches. Review existing migration history and backups separately before any resolve.':'Differences require explanation. Do not mark baseline or apply migrations.'},null,2));console.log(result.stdout);
 } finally {await rm(folder,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
