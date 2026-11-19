import {PrismaClient} from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function bootstrapAdmin(db:PrismaClient,env:NodeJS.ProcessEnv):Promise<'created'|'unchanged'> {
 return db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(10248080)::text`;
  if(await tx.user.findFirst({select:{id:true}})) return 'unchanged';
  const username=env.BOOTSTRAP_USERNAME?.trim(),password=env.BOOTSTRAP_PASSWORD;
  if(!username||!password||password.length<12) throw new Error('Provide BOOTSTRAP_USERNAME and BOOTSTRAP_PASSWORD (at least 12 characters) for an empty database');
  await tx.user.create({data:{username,passwordHash:await bcrypt.hash(password,10),name:env.BOOTSTRAP_NAME?.trim()||username,role:'admin'}});
  return 'created';
 });
}
if(require.main===module){const db=new PrismaClient();bootstrapAdmin(db,process.env).then(result=>console.log(`Bootstrap: ${result}`)).catch(()=>{console.error('Bootstrap failed; check database access and initialization environment');process.exitCode=1;}).finally(()=>db.$disconnect());}
