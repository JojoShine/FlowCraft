import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {AuthProvider,useAuth} from '../../src/contexts/AuthContext';
import {useEffect} from 'react';
import {createAssetSession} from '../../src/features/content/useContentAssets';
vi.mock('../../src/services/api',()=>({authApi:{getMe:vi.fn(async()=>({data:{id:'u',role:'admin'}}))},api:{}}));
function Test({guard}:{guard:()=>Promise<boolean>}) {const auth=useAuth();useEffect(()=>auth.registerLogoutGuard(guard),[auth.registerLogoutGuard,guard]);return <button onClick={()=>void auth.logout()}>退出</button>;}
it('awaits guards and retains the token when cancelled',async()=>{localStorage.setItem('token','old');let release!:(b:boolean)=>void;const guard=vi.fn(()=>new Promise<boolean>(resolve=>release=resolve));render(<AuthProvider><Test guard={guard}/></AuthProvider>);fireEvent.click(screen.getByText('退出'));expect(localStorage.getItem('token')).toBe('old');release(false);await waitFor(()=>expect(guard).toHaveBeenCalledTimes(1));expect(localStorage.getItem('token')).toBe('old');});
it('late_upload_after_identity_change_is_ignored',async()=>{let identity='old',release!:(a:any)=>void;const session=createAssetSession('old',()=>identity,()=>new Promise(resolve=>release=resolve));const pending=session.upload(new File(['pic'],'x.png'),'p','image');identity='new';release({id:'old-asset',state:'complete'});await expect(pending).rejects.toMatchObject({name:'AbortError'});session.dispose();});
