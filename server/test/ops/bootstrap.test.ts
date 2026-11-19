import {it,expect,vi} from 'vitest';
import bcrypt from 'bcryptjs';
import {bootstrapAdmin} from '../../src/ops/bootstrap';
function database(existing:object|null){const user={findFirst:vi.fn().mockResolvedValue(existing),create:vi.fn().mockResolvedValue({id:'new'})},tx={user,$queryRaw:vi.fn()};return {user,db:{$transaction:async(fn:any)=>fn(tx)} as any};}
it('creates only a first administrator with a hashed explicit password',async()=>{const {db,user}=database(null);expect(await bootstrapAdmin(db,{BOOTSTRAP_USERNAME:'first-admin',BOOTSTRAP_PASSWORD:'local-test-password'})).toBe('created');const data=user.create.mock.calls[0][0].data;expect(data).toMatchObject({username:'first-admin',role:'admin'});expect(data).not.toHaveProperty('password');expect(await bcrypt.compare('local-test-password',data.passwordHash)).toBe(true);});
it('does not overwrite an existing account or create another administrator',async()=>{const {db,user}=database({id:'existing'});expect(await bootstrapAdmin(db,{BOOTSTRAP_USERNAME:'another-admin',BOOTSTRAP_PASSWORD:'changed-test-password'})).toBe('unchanged');expect(user.create).not.toHaveBeenCalled();});
it('refuses an empty database without explicit initialization secrets',async()=>{const {db,user}=database(null);await expect(bootstrapAdmin(db,{})).rejects.toThrow('BOOTSTRAP_USERNAME');expect(user.create).not.toHaveBeenCalled();});
