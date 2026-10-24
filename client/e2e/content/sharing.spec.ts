import {test,expect,API} from './fixtures';
import {readFile} from 'node:fs/promises';
const token='A'.repeat(43),base='/api/v1/public/content/document/'+token;
test('anonymous document share renders real editor content read-only without private requests',async({page})=>{
 const privateRequests:string[]=[];page.on('request',req=>{if(/\/api\/v1\/(documents|drawings|content-assets|ai|projects)/.test(req.url()))privateRequests.push(req.url());});
 await page.route('**'+base,route=>route.fulfill({json:{success:true,data:{id:'public-doc',projectId:'opaque-project',version:1,title:'匿名分享测试',savedAt:'2026-10-24T00:00:00.000Z',canEdit:false,deletedAt:null,payload:{formatVersion:1,blocks:[{id:'p',type:'paragraph',content:[{type:'text',text:'访客能直接读取正文',styles:{}}],children:[]},{id:'link',type:'documentLink',props:{documentId:'private-related-doc'},children:[]}]}}}}));
 await page.goto('share/document/'+token);
 await expect(page.getByRole('heading',{name:'匿名分享测试',exact:true})).toBeVisible();
 await expect(page.getByText('访客能直接读取正文',{exact:true})).toBeVisible();
 await expect(page.getByText('只读分享',{exact:true})).toBeVisible();
 await expect(page.locator('.tiptap')).toHaveAttribute('contenteditable','false');
 await expect(page.getByRole('button',{name:'AI 扩写',exact:true})).toHaveCount(0);
 await expect(page.getByLabel('正文格式')).toHaveCount(0);
 await expect(page.getByText('关联文档未包含在此次分享中',{exact:true})).toBeVisible();
 expect(privateRequests).toEqual([]);
});
test('closed or unknown public share shows unavailable without redirecting to login',async({page})=>{
 await page.route('**'+base,route=>route.fulfill({status:404,json:{success:false,error:{message:'分享已关闭或内容不存在'}}}));
 await page.goto('share/document/'+token);await expect(page.getByRole('alert')).toContainText('分享已关闭或内容不存在');await expect(page).toHaveURL(/\/share\/document\//);await expect(page.getByRole('button',{name:'登录',exact:true})).toHaveCount(0);
});
test('latest embedded drawing refreshes on focus and its canvas fits the visible container',async({page})=>{
 let title='初始内嵌图';
 await page.route('**'+base,route=>route.fulfill({json:{success:true,data:{id:'shared-embed-doc',projectId:'p',title:'内嵌图分享',version:1,canEdit:false,deletedAt:null,savedAt:'',payload:{formatVersion:1,blocks:[{id:'embed',type:'drawing',props:{drawingId:'draw',mode:'latest',revision:0},children:[]}]}}}}));
 await page.route('**'+base+'/embeds/embed',route=>route.fulfill({json:{success:true,data:{blockId:'embed',drawingId:'draw',title,revision:1,status:'preview-pending',previewAssetId:null,scene:{formatVersion:1,elements:[],appState:{viewBackgroundColor:'#fff'},files:{}}}}}));
 await page.goto('share/document/'+token);await expect(page.getByText('初始内嵌图',{exact:true})).toBeVisible();
 await expect(page.locator('.shared-content-embed-canvas .excalidraw')).toBeVisible();
 const heights=await page.locator('.shared-content-embed-canvas').evaluate(node=>({container:node.getBoundingClientRect().height,child:node.firstElementChild!.getBoundingClientRect().height}));expect(heights.child).toBeLessThanOrEqual(heights.container+1);
 title='新保存的内嵌图';await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.getByText('新保存的内嵌图',{exact:true})).toBeVisible();
});
test('owner shares real documents and drawings; anonymous media works, table deletion saves, and closing revokes access',async({page,request,browser,content,token:ownerToken},testInfo)=>{
 const headers={Authorization:`Bearer ${ownerToken}`};
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO6kAAAAASUVORK5CYII=','base64');
 const uploaded=await request.post(API+'/content-assets',{headers,multipart:{projectId:content.project.id,category:'image',file:{name:'分享图片.png',mimeType:'image/png',buffer:png}}});expect(uploaded.status()).toBe(201);const image=(await uploaded.json()).data;
 const attachmentUpload=await request.post(API+'/content-assets',{headers,multipart:{projectId:content.project.id,category:'attachment',file:{name:'分享附件.txt',mimeType:'text/plain',buffer:Buffer.from('仅分享文档引用的附件')}}});expect(attachmentUpload.status()).toBe(201);const attachment=(await attachmentUpload.json()).data;
 const drawingResponse=await request.post(API+'/drawings',{headers,data:{projectId:content.project.id,title:'公开绘图联测',payload:content.scene}});expect(drawingResponse.status()).toBe(201);const drawing=(await drawingResponse.json()).data;
 const inline=(text:string)=>[{type:'text',text,styles:{}}];
 const payload={formatVersion:1,blocks:[{id:'p',type:'paragraph',content:inline('分享文档中的实际正文'),children:[]},{id:'table',type:'table',content:{type:'tableContent',rows:[{cells:[inline('表格删除联测'),inline('测试数据')]}]},children:[]},{id:'image',type:'image',props:{assetId:image.id,url:'asset:'+image.id,name:'分享图片.png',previewWidth:96},children:[]},{id:'file',type:'file',props:{assetId:attachment.id,url:'asset:'+attachment.id,name:'分享附件.txt'},children:[]},{id:'embed',type:'drawing',props:{drawingId:drawing.id,mode:'latest',revision:0},children:[]}]};
 const created=await request.post(API+'/documents',{headers,data:{projectId:content.project.id,title:'真实分享联测',payload}});expect(created.status()).toBe(201);const doc=(await created.json()).data;
 await page.addInitScript(value=>{localStorage.setItem('token',value);localStorage.setItem('theme','light');},ownerToken);await page.goto('documents/'+doc.id);
 await page.getByRole('button',{name:'分享',exact:true}).click();const dialog=page.getByRole('dialog',{name:'分享文档',exact:true});await expect(dialog.getByText('当前未开启分享。',{exact:true})).toBeVisible();await dialog.getByRole('button',{name:'开启分享',exact:true}).click();const shareLink=dialog.getByRole('textbox',{name:'分享链接'});await expect(shareLink).toHaveValue(/\/share\/document\//);const url=await shareLink.inputValue();
 await page.screenshot({path:testInfo.outputPath('share-dialog-light.png')});await page.keyboard.press('Escape');await page.getByTitle('切换到暗黑模式',{exact:true}).click();await page.getByRole('button',{name:'分享',exact:true}).click();await expect(dialog.getByRole('textbox',{name:'分享链接'})).toHaveValue(url);await expect(dialog).toHaveCSS('background-color','rgb(24, 24, 27)');await page.screenshot({path:testInfo.outputPath('share-dialog-dark.png')});await page.keyboard.press('Escape');await page.getByTitle('切换到浅色模式',{exact:true}).click();await page.getByRole('button',{name:'分享',exact:true}).click();await expect(dialog.getByRole('textbox',{name:'分享链接'})).toHaveValue(url);await page.context().grantPermissions(['clipboard-read','clipboard-write']);await dialog.getByRole('button',{name:'复制链接',exact:true}).click();await expect(dialog.getByRole('button',{name:'已复制',exact:true})).toBeVisible();expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(url);
 const guestContext=await browser.newContext(),guest=await guestContext.newPage();
 try {
  await guest.goto(url);await expect(guest.getByRole('heading',{name:'真实分享联测',exact:true})).toBeVisible();await expect(guest.getByText('分享文档中的实际正文',{exact:true})).toBeVisible();await expect(guest.locator('.tiptap')).toHaveAttribute('contenteditable','false');const picture=guest.getByAltText('分享图片.png',{exact:true});await expect(picture).toBeVisible();await expect.poll(()=>picture.evaluate(node=>(node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);await expect(guest.locator('.shared-content-embed-canvas .excalidraw')).toBeVisible();const downloaded=guest.waitForEvent('download');await guest.getByRole('button',{name:'↓ 分享附件.txt',exact:true}).click();expect((await readFile((await(await downloaded).path())!)).toString()).toBe('仅分享文档引用的附件');await guest.setViewportSize({width:390,height:844});await guest.screenshot({path:testInfo.outputPath('shared-document-mobile.png'),fullPage:true});
  await page.keyboard.press('Escape');await page.getByRole('textbox',{name:'文档正文'}).getByRole('cell').first().locator('p').click();await page.getByRole('button',{name:'删除表格',exact:true}).click();await page.getByLabel('文档标题').press('ControlOrMeta+s');await expect(page.getByText('已保存到服务器',{exact:true})).toBeVisible();await page.reload();await expect(page.locator('.tiptap table')).toHaveCount(0);await guest.reload();await expect(guest.getByText('分享文档中的实际正文',{exact:true})).toBeVisible();await expect(guest.locator('.tiptap table')).toHaveCount(0);
  await page.getByRole('button',{name:'分享',exact:true}).click();await page.getByRole('dialog',{name:'分享文档',exact:true}).getByRole('button',{name:'取消分享',exact:true}).click();await guest.reload();await expect(guest.getByRole('alert')).toContainText('分享已关闭或内容不存在');
  await page.keyboard.press('Escape');await page.goto('drawings/'+drawing.id);await page.getByRole('button',{name:'分享',exact:true}).click();const drawingDialog=page.getByRole('dialog',{name:'分享绘图',exact:true});await drawingDialog.getByRole('button',{name:'开启分享',exact:true}).click();const drawingUrl=await drawingDialog.getByRole('textbox',{name:'分享链接'}).inputValue();await guest.goto(drawingUrl);await expect(guest.getByRole('heading',{name:'公开绘图联测',exact:true})).toBeVisible();await expect(guest.locator('.shared-content-canvas .excalidraw')).toBeVisible();await drawingDialog.getByRole('button',{name:'取消分享',exact:true}).click();await guest.reload();await expect(guest.getByRole('alert')).toContainText('分享已关闭或内容不存在');
 } finally {await guestContext.close();}
});
