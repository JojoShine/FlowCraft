import {it,expect,vi} from 'vitest';
import {api} from '../../src/services/api';
it('late 401 from a previous identity cannot clear the current account token',async()=>{
 localStorage.setItem('token','account-a');let rejectRequest!:()=>void;
 const logout=vi.fn();window.addEventListener('auth:logout',logout);
 const pending=api.get('/documents',{adapter:config=>new Promise((_resolve,reject)=>{rejectRequest=()=>reject({message:'expired',config,response:{status:401,data:{error:'expired'}}});})});
 await vi.waitFor(()=>expect(rejectRequest).toBeTypeOf('function'));localStorage.setItem('token','account-b');rejectRequest();await expect(pending).rejects.toBeTruthy();
 expect(localStorage.getItem('token')).toBe('account-b');expect(logout).not.toHaveBeenCalled();window.removeEventListener('auth:logout',logout);
});
it('401 for the active identity still logs out normally',async()=>{
 localStorage.setItem('token','active');const logout=vi.fn();window.addEventListener('auth:logout',logout);
 await expect(api.get('/documents',{adapter:async config=>{throw {config,response:{status:401,data:{}}};}})).rejects.toBeTruthy();expect(localStorage.getItem('token')).toBeNull();expect(logout).toHaveBeenCalledTimes(1);window.removeEventListener('auth:logout',logout);
});
