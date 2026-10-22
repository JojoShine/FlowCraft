import {test,expect,API,signIn} from './fixtures';
import type {Page,APIRequestContext} from '@playwright/test';
async function create(request:APIRequestContext,token:string,projectId:string,payload:unknown) {const response=await request.post(`${API}/documents`,{headers:{Authorization:`Bearer ${token}`},data:{projectId,title:'恢复基线',payload}});expect(response.status()).toBe(201);return (await response.json()).data;}
async function open(page:Page,token:string,id:string) {await page.addInitScript(value=>{if(!localStorage.getItem('token')) localStorage.setItem('token',value);},token);await page.goto(`documents/${id}`);await expect(page.getByLabel('文档标题')).toBeVisible();}
async function save(page:Page) {await page.getByLabel('文档标题').press('ControlOrMeta+s');}
test('offline draft survives reload and restores only after explicit choice',async({page,context,request,content,token})=>{
 const doc=await create(request,token,content.project.id,content.body);await open(page,token,doc.id);await context.setOffline(true);await page.getByLabel('文档标题').fill('断网后的服务器清单');await save(page);await expect(page.getByText('离线，草稿已保留',{exact:true})).toBeVisible();
 page.once('dialog',dialog=>dialog.accept());await page.goto('about:blank');await context.setOffline(false);await page.goto(`documents/${doc.id}`);const recovery=page.getByRole('dialog',{name:'恢复本地草稿'});await expect(recovery).toBeVisible();expect((await(await request.get(`${API}/documents/${doc.id}`,{headers:{Authorization:`Bearer ${token}`}})).json()).data.title).toBe('恢复基线');await recovery.getByRole('button',{name:'恢复草稿',exact:true}).click();await expect(page.getByLabel('文档标题')).toHaveValue('断网后的服务器清单');await save(page);await expect(page.getByText('已保存到服务器',{exact:true})).toBeVisible();await page.reload();await expect(page.getByLabel('文档标题')).toHaveValue('断网后的服务器清单');await expect(recovery).toBeHidden();
});
test('two browser tabs conflict without overwriting the first save',async({page,context,request,content,token})=>{
 const doc=await create(request,token,content.project.id,content.body);await open(page,token,doc.id);const second=await context.newPage();await open(second,token,doc.id);
 await page.getByLabel('文档标题').fill('标签一更新');await save(page);await expect(page.getByText('已保存到服务器',{exact:true})).toBeVisible();await second.getByLabel('文档标题').fill('标签二本地稿');await save(second);const conflict=second.getByRole('dialog',{name:'发现其他位置的更新'});await expect(conflict).toBeVisible();const current=(await(await request.get(`${API}/documents/${doc.id}`,{headers:{Authorization:`Bearer ${token}`}})).json()).data;expect(current.title).toBe('标签一更新');expect(current.version).toBe(2);
 await conflict.getByRole('button',{name:'保留本地为副本'}).click();await second.waitForURL(new RegExp(`/documents/(?!${doc.id})`));await expect(second.getByLabel('文档标题')).toHaveValue('标签二本地稿 副本');await second.close();
});
test('lost successful response retries the same receipt without another revision',async({page,request,content,token})=>{
 const doc=await create(request,token,content.project.id,content.body);await open(page,token,doc.id);let lost=false;
 await page.route(`**/api/v1/documents/${doc.id}`,async route=>{if(route.request().method()==='PATCH'&&!lost) {lost=true;const response=await route.fetch();expect(response.status()).toBe(200);await route.abort('failed');}else await route.continue();});
 await page.getByLabel('文档标题').fill('响应丢失但已提交');await save(page);await expect(page.getByRole('button',{name:'重试保存',exact:true})).toBeVisible();await page.getByRole('button',{name:'重试保存',exact:true}).click();await expect(page.getByText('已保存到服务器',{exact:true})).toBeVisible();const current=(await(await request.get(`${API}/documents/${doc.id}`,{headers:{Authorization:`Bearer ${token}`}})).json()).data;expect(current.version).toBe(2);expect(current.title).toBe('响应丢失但已提交');
});
test('expired login preserves owner draft and another account cannot recover it',async({page,request,content,token})=>{
 const doc=await create(request,token,content.project.id,content.body);await open(page,token,doc.id);
 await page.route(`**/api/v1/documents/${doc.id}`,async route=>route.request().method()==='PATCH'?route.fulfill({status:401,contentType:'application/json',body:'{"success":false,"message":"登录失效"}'}):route.continue());await page.getByLabel('文档标题').fill('登录过期草稿');await save(page);await page.waitForURL(/\/login/);await page.unrouteAll({behavior:'wait'});
 await page.evaluate(value=>localStorage.setItem('token',value),signIn(content.viewer.id));await page.goto(`documents/${doc.id}`);await expect(page.getByRole('heading',{name:'恢复基线',exact:true})).toBeVisible();await expect(page.getByRole('dialog',{name:'恢复本地草稿'})).toBeHidden();
 await page.evaluate(value=>localStorage.setItem('token',value),token);await page.goto(`documents/${doc.id}`);await expect(page.getByRole('dialog',{name:'恢复本地草稿'})).toContainText('登录过期草稿');
});
test('deleted content cannot be resurrected by an old editor',async({page,request,content,token})=>{
 const doc=await create(request,token,content.project.id,content.body);await open(page,token,doc.id);expect((await request.delete(`${API}/documents/${doc.id}`,{headers:{Authorization:`Bearer ${token}`}})).status()).toBe(200);await page.getByLabel('文档标题').fill('旧编辑页更新');await save(page);await expect(page.getByText('内容已移入回收站',{exact:true})).toBeVisible();expect((await request.get(`${API}/documents/${doc.id}`,{headers:{Authorization:`Bearer ${token}`}})).status()).toBe(404);
});

test('a corrected blank title saves after the server rejects its earlier value',async({page,request,content,token})=>{
 const doc=await create(request,token,content.project.id,content.body);await open(page,token,doc.id);await page.getByLabel('文档标题').fill('');await save(page);await expect(page.getByText('保存失败',{exact:true})).toBeVisible();await page.getByLabel('文档标题').fill('已修正的合法标题');await save(page);await expect(page.getByText('已保存到服务器',{exact:true})).toBeVisible();expect((await(await request.get(`${API}/documents/${doc.id}`,{headers:{Authorization:`Bearer ${token}`}})).json()).data.title).toBe('已修正的合法标题');
});
