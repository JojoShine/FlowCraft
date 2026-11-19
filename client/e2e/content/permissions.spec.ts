import {test,expect,API,signIn} from './fixtures';
test('an owner enables individual documents and drawings for collaborators from the lists',async({page,request,content,token,browser,baseURL})=>{
 const headers={Authorization:`Bearer ${token}`},project=`${API}/projects/${content.project.id}`;
 const invite=await request.post(`${project}/invite`,{headers,data:{canEditDocuments:true}});
 expect(invite.status()).toBe(201);
 const collaborator=(await invite.json()).data;
 const ownerPage=await browser.newPage({baseURL});
 try {
  const createShare=async(kind:'document'|'drawing')=>{
   const root=`${API}/${kind}s`;
   const created=await request.post(root,{headers,data:{projectId:content.project.id,title:'协作原稿',payload:kind==='document'?content.body:content.scene}});
   expect(created.status()).toBe(201);
   const {id}=(await created.json()).data;
   const shared=await request.post(`${root}/${id}/share`,{headers});
   expect(shared.status()).toBe(200);
   return {id,share:`share/${kind}/${(await shared.json()).data.shareToken}`,resource:`${root}/${id}`};
  };
  const doc=await createShare('document'),drawing=await createShare('drawing');
  await page.goto(doc.share);
  await expect(page.getByRole('link',{name:'编辑文档',exact:true})).toHaveCount(0);
  await page.getByRole('link',{name:'登录后编辑',exact:true}).click();
  await page.getByPlaceholder('请输入用户名').fill(collaborator.username);
  await page.getByPlaceholder('请输入密码').fill(collaborator.password);
  await page.getByRole('button',{name:'登录',exact:true}).click();
  await expect(page.getByRole('heading',{name:'协作原稿',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'编辑文档',exact:true})).toHaveCount(0);
  await ownerPage.addInitScript(value=>localStorage.setItem('token',value),token);
  await ownerPage.goto('documents');
  const docPermission=ownerPage.getByRole('button',{name:'允许协作者编辑 协作原稿',exact:true});
  await expect(docPermission).toHaveAttribute('aria-pressed','false');
  await docPermission.click();await expect(docPermission).toHaveAttribute('aria-pressed','true');
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.getByRole('link',{name:'编辑文档',exact:true}).click();
  const title=page.getByLabel('文档标题');
  await title.fill('协作者保存的文档');
  const body=page.getByRole('textbox',{name:'文档正文'});
  await body.press('End');await body.press('Enter');await page.keyboard.insertText('协作者写入的正文');
  await page.locator('.document-formatbar input[type=file]').setInputFiles({name:'协作附件.txt',mimeType:'text/plain',buffer:Buffer.from('共同资料')});
  await title.press('ControlOrMeta+s');
  await expect.poll(async()=>{
   const saved=(await (await request.get(doc.resource,{headers})).json()).data;
   return [saved.title,JSON.stringify(saved.payload).includes('协作者写入的正文'),saved.payload.blocks.some((block:{type:string;props?:{assetId?:string}})=>block.type==='file'&&!!block.props?.assetId)];
  }).toEqual(['协作者保存的文档',true,true]);
  await expect(page.getByRole('button',{name:'分享',exact:true})).toHaveCount(0);

  await docPermission.click();await expect(docPermission).toHaveAttribute('aria-pressed','false');
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await expect(body).toHaveAttribute('contenteditable','false');

  await ownerPage.goto('drawings');
  const drawingPermission=ownerPage.getByRole('button',{name:'允许协作者编辑 协作原稿',exact:true});
  await expect(drawingPermission).toHaveAttribute('aria-pressed','false');
  await drawingPermission.click();await expect(drawingPermission).toHaveAttribute('aria-pressed','true');
  await page.goto(drawing.share);
  await expect(page.getByRole('heading',{name:'协作原稿',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'编辑绘图',exact:true})).toHaveCount(0);

  await ownerPage.goto('projects');await ownerPage.getByTitle('邀请协作者',{exact:true}).click();
  const inviteDialog=ownerPage.getByRole('dialog',{name:'邀请协作者',exact:true});
  const drawingAccess=inviteDialog.getByRole('combobox',{name:`${collaborator.username}的绘图权限`});
  await expect(drawingAccess).toHaveText('只读');
  await drawingAccess.click();await ownerPage.getByRole('option',{name:'可编辑',exact:true}).click();
  await expect(drawingAccess).toHaveText('可编辑');
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.getByRole('link',{name:'编辑绘图',exact:true}).click();
  await page.getByLabel('绘图标题').fill('协作者保存的绘图');
  await page.getByTitle('矩形 — R 或 2',{exact:true}).click();
  const box=await page.locator('.excalidraw canvas').last().boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box!.x+box!.width*.42,box!.y+box!.height*.42);await page.mouse.down();
  await page.mouse.move(box!.x+box!.width*.62,box!.y+box!.height*.62,{steps:8});await page.mouse.up();
  await page.getByLabel('绘图标题').press('ControlOrMeta+s');
  await expect.poll(async()=>{
   const saved=(await (await request.get(drawing.resource,{headers})).json()).data;
   return [saved.title,saved.payload.elements.length];
  }).toEqual(['协作者保存的绘图',2]);
  await page.goto(`documents/${doc.id}`);
  await expect(page.locator('.flow-document-content')).toHaveAttribute('contenteditable','false');
 }finally {
  await ownerPage.close();
  expect((await request.delete(`${project}/invite/${collaborator.id}`,{headers})).status()).toBe(204);
 }
});
test('viewer reads current pinned graph but cannot write, enumerate history or cross project boundaries',async({page,request,content,token})=>{
 const owner={Authorization:`Bearer ${token}`},viewer={Authorization:`Bearer ${signIn(content.viewer.id)}`};
 const drawing=(await(await request.post(`${API}/drawings`,{headers:owner,data:{projectId:content.project.id,title:'固定旧图',payload:content.scene}})).json()).data;
 expect((await request.patch(`${API}/drawings/${drawing.id}`,{headers:owner,data:{baseVersion:1,requestId:content.requestId(),source:'manual',title:'最新图',payload:{...content.scene,elements:[{...content.scene.elements[0],x:999}]}}})).status()).toBe(200);
 const body={formatVersion:1,blocks:[{id:'fixed',type:'drawing',props:{drawingId:drawing.id,mode:'pinned',revision:1}}]};
 const doc=(await(await request.post(`${API}/documents`,{headers:owner,data:{projectId:content.project.id,title:'只读说明',payload:body}})).json()).data;
 const embedded=await request.get(`${API}/documents/${doc.id}/embeds/fixed`,{headers:viewer});expect(embedded.status()).toBe(200);expect((await embedded.json()).data.scene.elements[0].x).toBe(12.34);
 const denied=await Promise.all([
 request.patch(`${API}/documents/${doc.id}`,{headers:viewer,data:{baseVersion:1,requestId:content.requestId(),source:'auto',title:'越权',payload:content.body}}),
 request.delete(`${API}/documents/${doc.id}`,{headers:viewer}),request.post(`${API}/documents/${doc.id}/restore`,{headers:viewer,data:{baseVersion:1,requestId:content.requestId(),revision:1}}),request.get(`${API}/documents/${doc.id}/revisions`,{headers:viewer}),request.get(`${API}/documents/trash`,{headers:viewer}),request.get(`${API}/drawings/${drawing.id}/revisions/1`,{headers:viewer}),
 request.post(`${API}/content-assets`,{headers:viewer,multipart:{projectId:content.project.id,category:'attachment',file:{name:'test.txt',mimeType:'text/plain',buffer:Buffer.from('private')}}}),request.get(`${API}/documents?projectId=${content.otherProject.id}`,{headers:viewer}),request.get(`${API}/documents/${doc.id}/embeds/fixed?documentVersion=1`,{headers:viewer}),
 ]);for(const response of denied) expect([403,404]).toContain(response.status());
 const otherHeaders={Authorization:`Bearer ${signIn(content.otherOwner.id)}`};const asset=(await(await request.post(`${API}/content-assets`,{headers:otherHeaders,multipart:{projectId:content.otherProject.id,category:'attachment',file:{name:'private.txt',mimeType:'text/plain',buffer:Buffer.from('private')}}})).json()).data;
 expect((await request.get(`${API}/content-assets/${asset.id}`,{headers:viewer,params:{context:JSON.stringify({kind:'document',id:doc.id})}})).status()).toBe(404);
 await page.addInitScript(value=>localStorage.setItem('token',value),signIn(content.viewer.id));await page.goto(`documents/${doc.id}`);await expect(page.getByRole('heading',{name:'只读说明',exact:true})).toBeVisible();await expect(page.getByText('固定版本 v1',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'编辑原图',exact:true})).toBeHidden();await expect(page.getByRole('button',{name:'历史版本',exact:true})).toBeHidden();expect(await page.locator('.flow-document-content').getAttribute('contenteditable')).toBe('false');
});
test('trash and restore are single document operations and project deletion remains protected',async({request,content,token})=>{
 const headers={Authorization:`Bearer ${token}`};const ids:string[]=[];for(const title of ['一篇','另一篇']) ids.push((await(await request.post(`${API}/documents`,{headers,data:{projectId:content.project.id,title,payload:content.body}})).json()).data.id);
 expect((await request.delete(`${API}/documents/${ids[0]}`,{headers})).status()).toBe(200);expect((await request.get(`${API}/documents/${ids[1]}`,{headers})).status()).toBe(200);expect((await request.delete(`${API}/projects/${content.project.id}`,{headers})).status()).toBe(409);
 const restored=await request.post(`${API}/documents/${ids[0]}/undelete`,{headers});expect(restored.status()).toBe(200);expect((await restored.json()).data.id).toBe(ids[0]);expect((await request.get(`${API}/documents/${ids[0]}`,{headers})).status()).toBe(200);
});
