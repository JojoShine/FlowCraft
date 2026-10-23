import {test,expect,API,signIn} from './fixtures';
async function copyScreenshot(page:import('@playwright/test').Page) {
 await page.evaluate(async()=>{
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=180;const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#f4f4f5';ctx.fillRect(0,0,640,180);ctx.fillStyle='#18181b';ctx.font='20px sans-serif';ctx.fillText('FlowCraft · Deployment screenshot',24,38);
  ctx.fillStyle='#3b82f6';ctx.fillRect(24,65,170,80);ctx.fillStyle='#10b981';ctx.fillRect(230,65,170,80);ctx.fillStyle='#71717a';ctx.fillRect(436,65,180,80);
  ctx.fillStyle='#ffffff';ctx.font='16px sans-serif';ctx.fillText('Application',42,110);ctx.fillText('Database',250,110);ctx.fillText('MinIO',460,110);
  const blob=await new Promise<Blob>(resolve=>canvas.toBlob(blob=>resolve(blob!),'image/png'));await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
 });
}
test('sample pastes a screenshot at the caret and keeps text and image after reload and a fresh session',async({page,context,browser,request,content,token},testInfo)=>{
 const headers={Authorization:`Bearer ${token}`};
 await page.addInitScript(value=>localStorage.setItem('token',value),token);
 await page.goto('documents/sample');await page.getByRole('button',{name:'创建样板文档',exact:true}).click();
 await expect(page).toHaveURL(/documents\/.+\/sample$/);const id=page.url().split('/').at(-2)!;
 const editor=page.getByRole('textbox',{name:'文档正文'});await expect(editor).toBeVisible();
 await editor.click();await page.keyboard.press('ControlOrMeta+End');await page.keyboard.press('Enter');await page.keyboard.type('before screenshot');
 await context.grantPermissions(['clipboard-read','clipboard-write']);
 await copyScreenshot(page);
 await page.keyboard.press('ControlOrMeta+v');await expect(editor.locator('img')).toBeVisible();
 await page.keyboard.type('after screenshot');
 await expect(page.getByText('已保存到服务器',{exact:true})).toBeVisible();
 const saved=(await(await request.get(`${API}/documents/${id}`,{headers})).json()).data;
 expect(JSON.stringify(saved.payload)).toContain('after screenshot');expect(JSON.stringify(saved.payload)).not.toMatch(/blob:|data:image/);
 const image=saved.payload.blocks.find((b:any)=>b.type==='image');expect(image.props.assetId).toBeTruthy();
 expect(saved.payload.blocks.findIndex((b:any)=>JSON.stringify(b).includes('before screenshot'))).toBeLessThan(saved.payload.blocks.indexOf(image));
 let reloadSaves=0;page.on('request',req=>{if(req.method()==='PATCH'&&req.url().endsWith(`/documents/${id}`)) reloadSaves++;});await page.reload();await expect(editor).toContainText('after screenshot');await expect.poll(()=>editor.locator('img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
 await page.waitForTimeout(2500);expect(reloadSaves).toBe(0);await expect(page.getByText('已保存到服务器',{exact:true})).toBeVisible();await page.screenshot({path:testInfo.outputPath('tiptap-sample-desktop.png'),fullPage:true});
 const fresh=await browser.newContext();const other=await fresh.newPage();await other.addInitScript(value=>localStorage.setItem('token',value),token);await other.goto(page.url());await expect.poll(()=>other.getByRole('textbox',{name:'文档正文'}).locator('img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);await fresh.close();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:testInfo.outputPath('tiptap-sample-mobile.png'),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const viewer=await browser.newContext();const read=await viewer.newPage();await read.addInitScript(value=>localStorage.setItem('token',value),signIn(content.viewer.id));await read.goto(page.url());await expect(read.getByRole('textbox',{name:'文档正文'})).toHaveAttribute('contenteditable','false');await expect.poll(()=>read.locator('.tiptap-sample img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);await viewer.close();
});
test('upload failure stays unsaved, retries with the original image and retains it after reload',async({page,context,content,token})=>{
 await page.addInitScript(value=>localStorage.setItem('token',value),token);await page.goto('documents/sample');await page.getByRole('button',{name:'创建样板文档',exact:true}).click();
 const editor=page.getByRole('textbox',{name:'文档正文'});await expect(editor).toBeVisible();await editor.click();await page.keyboard.press('ControlOrMeta+End');await page.keyboard.press('Enter');
 await page.route('**/content-assets',route=>route.fulfill({status:503,json:{success:false,error:{message:'test upload unavailable'}}}));
 await context.grantPermissions(['clipboard-read','clipboard-write']);await copyScreenshot(page);await page.keyboard.press('ControlOrMeta+v');await expect(editor.locator('img')).toBeVisible();await expect(page.getByRole('button',{name:'重试图片上传'})).toBeVisible();await expect(page.getByText('已保存到服务器',{exact:true})).not.toBeVisible();
 await page.unroute('**/content-assets');await page.getByRole('button',{name:'重试图片上传'}).click();await expect(page.getByText('已保存到服务器',{exact:true})).toBeVisible();await page.reload();await expect.poll(()=>editor.locator('img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
});

test('undo and redo retain the asset when a pasted image is removed before upload completes',async({page,context,request,content,token})=>{
 const headers={Authorization:`Bearer ${token}`};await page.addInitScript(value=>localStorage.setItem('token',value),token);await page.goto('documents/sample');await page.getByRole('button',{name:'创建样板文档',exact:true}).click();await expect(page).toHaveURL(/documents\/.+\/sample$/);const id=page.url().split('/').at(-2)!;
 const editor=page.getByRole('textbox',{name:'文档正文'});await expect(editor).toBeVisible();await editor.click();await page.keyboard.press('ControlOrMeta+End');await page.keyboard.press('Enter');
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});await page.route('**/content-assets',async route=>{await gate;await route.continue();});
 await context.grantPermissions(['clipboard-read','clipboard-write']);await copyScreenshot(page);await page.keyboard.press('ControlOrMeta+v');await expect(editor.locator('img')).toBeVisible();
 await page.keyboard.press('ControlOrMeta+z');await expect(editor.locator('img')).toHaveCount(0);release();await expect(page.getByRole('button',{name:'重试图片上传'})).not.toBeVisible();
 await editor.click();await page.keyboard.press('ControlOrMeta+Shift+z');await expect(editor.locator('img')).toBeVisible();await expect(page.getByText('已保存到服务器',{exact:true})).toBeVisible();
 const saved=(await(await request.get(`${API}/documents/${id}`,{headers})).json()).data;const image=saved.payload.blocks.find((b:any)=>b.type==='image');expect(image.props.assetId).toBeTruthy();
 await page.waitForTimeout(650);await page.keyboard.press('ControlOrMeta+z');await expect(editor.locator('img')).toHaveCount(0);await page.keyboard.press('ControlOrMeta+Shift+z');await expect(editor.locator('img')).toBeVisible();await expect(page.getByText('已保存到服务器',{exact:true})).toBeVisible();await page.reload();await expect.poll(()=>editor.locator('img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
});
