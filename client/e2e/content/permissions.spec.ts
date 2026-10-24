import {test,expect,API,signIn} from './fixtures';
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
