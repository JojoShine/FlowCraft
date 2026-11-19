import {test,expect,API} from './fixtures';
test('the entire document header and outline stay still while the text scrolls',async({page,request,content,token})=>{
 const headers={Authorization:`Bearer ${token}`};
 const payload={formatVersion:1,blocks:Array.from({length:80},(_,index)=>index===35
  ?{id:'section',type:'heading',props:{level:2},content:'滚动后的章节'}
  :{id:`paragraph-${index}`,type:'paragraph',content:`第 ${index+1} 段正文`})};
 const created=await request.post(`${API}/documents`,{headers,data:{projectId:content.project.id,title:'固定标题验证',payload}});
 expect(created.status()).toBe(201);
 const {id}=(await created.json()).data;
 await page.addInitScript(value=>localStorage.setItem('token',value),token);
 const title=page.getByRole('textbox',{name:'文档标题'}),format=page.getByLabel('正文格式');
 const main=page.locator('main'),heading=page.getByRole('heading',{name:'滚动后的章节'});
 const fixed=[page.getByRole('link',{name:'← 返回文档列表'}),page.getByText('已保存到服务器',{exact:true}),page.getByRole('group',{name:'文档操作'}),title,format,page.getByRole('navigation',{name:'文章目录'})];
 const verticalPositions=()=>Promise.all(fixed.map(async element=>(await element.boundingBox())!.y));
 for(const width of [1366,390]) {
  await page.setViewportSize({width,height:844});
  await page.goto(`documents/${id}`);
  await expect(title).toBeVisible();
  await page.locator('.flowcraft-main').evaluate(node=>Promise.allSettled(node.getAnimations().map(animation=>animation.finished)).then(()=>{}));
  const initialPositions=await verticalPositions();
  const headingTop=(await heading.boundingBox())!.y;
  const scrollArea=await page.getByRole('textbox',{name:'文档正文'}).evaluateHandle(node=>{
   let parent=node.parentElement;
   while(parent&&!(getComputedStyle(parent).overflowY==='auto'&&parent.scrollHeight>parent.clientHeight)) parent=parent.parentElement;
   return parent;
  });
  for(const scrollTop of [450,900,450,0]) {
   await scrollArea.evaluate((node,top)=>node?.scrollTo(0,top),scrollTop);
   expect(await verticalPositions()).toEqual(initialPositions);
   expect((await heading.boundingBox())!.y).toBeCloseTo(headingTop-scrollTop,0);
   expect(await main.evaluate(node=>node.scrollTop)).toBe(0);
  }
  if(width===1366) {
   await Promise.all([
    scrollArea.evaluate(node=>new Promise<void>(resolve=>node?.addEventListener('scrollend',()=>resolve(),{once:true}))),
    page.getByRole('link',{name:'滚动后的章节'}).click(),
   ]);
   await expect(heading).toBeInViewport();
   const formatBox=(await format.boundingBox())!;
   expect((await heading.boundingBox())!.y).toBeGreaterThanOrEqual(formatBox.y+formatBox.height-1);
  }
 }
});
test('typed Markdown transforms immediately, persists, and the quiet header returns to the list',async({page,request,content,token},testInfo)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));const headers={Authorization:`Bearer ${token}`};
 const markers=[['heading','# Heading'],['bullet','- bullet'],['number','1. number'],['task','- [ ] todo'],['quote','> quote'],['code','```bash'],['rule','---'],['inline','**bold** *italic* ~~strike~~ `code` ']];
 const payload={formatVersion:1,blocks:markers.map(([id])=>({id,type:'paragraph',content:[]}))};
 const doc=(await(await request.post(`${API}/documents`,{headers,data:{projectId:content.project.id,title:'即时编辑验证',payload}})).json()).data;
 await page.addInitScript(value=>{localStorage.setItem('token',value);localStorage.setItem('theme','light');},token);await page.goto(`documents/${doc.id}`);
 const editor=page.getByRole('textbox',{name:'文档正文'});await expect(editor).toBeVisible();await expect(page.locator('.content-breadcrumb')).toHaveCount(0);await expect(page.locator('.content-primary-actions').getByRole('button')).toHaveText(['分享','导出','删除']);
 for(const [id,marker] of markers){const block=editor.locator(`[data-id="${id}"]`);await block.locator('p').click();await page.keyboard.type(marker);if(id==='code'){await page.keyboard.press('Enter');await page.keyboard.type('echo ready');}if(id==='rule') await page.keyboard.press('Enter');}
 await expect(editor.locator('[data-id="heading"] h1')).toHaveText('Heading');await expect(editor.locator('[data-id="bullet"]')).toHaveAttribute('data-kind','bulletListItem');await expect(editor.locator('[data-id="number"]')).toHaveAttribute('data-kind','numberedListItem');await expect(editor.locator('[data-id="task"] input[type="checkbox"]')).toBeVisible();await expect(editor.locator('blockquote')).toHaveText('quote');await expect(editor.locator('pre')).toHaveText('echo ready');await expect(editor.locator('hr')).toHaveCount(1);await expect(editor.locator('strong')).toHaveText('bold');await expect(editor.locator('em')).toHaveText('italic');await expect(editor.locator('s')).toHaveText('strike');await expect(editor.locator('[data-id="inline"] code')).toHaveText('code');
 await expect(page.getByText('已保存到服务器',{exact:true})).toBeVisible();await page.reload();await expect(editor.locator('h1')).toHaveText('Heading');await expect(editor.locator('pre')).toHaveText('echo ready');await expect(editor.locator('input[type="checkbox"]')).toHaveCount(1);await page.screenshot({path:testInfo.outputPath('clean-document-editor.png'),fullPage:true});
 await page.getByRole('button',{name:'历史版本',exact:true}).click();await expect(page.getByRole('dialog',{name:'历史版本',exact:true})).toBeVisible();await page.getByRole('button',{name:'关闭历史',exact:true}).click();
 await editor.locator('[data-id="inline"] p').click();await page.keyboard.press('End');await page.keyboard.type(' saved before leaving');await page.getByRole('link',{name:'← 返回文档列表',exact:true}).click();await expect(page).toHaveURL(/\/documents$/);
 const saved=(await(await request.get(`${API}/documents/${doc.id}`,{headers})).json()).data;expect(JSON.stringify(saved.payload)).toContain('saved before leaving');expect(errors).toEqual([]);
});
test('drawing loads editable architecture and network libraries and returns to the list',async({page,request,content,token},testInfo)=>{
 const headers={Authorization:`Bearer ${token}`},errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 const drawing=(await(await request.post(`${API}/drawings`,{headers,data:{projectId:content.project.id,title:'默认素材验证',payload:{formatVersion:1,elements:[],appState:{viewBackgroundColor:'#ffffff'},files:{}}}})).json()).data;
 await page.addInitScript(value=>{localStorage.setItem('token',value);localStorage.setItem('theme','light');},token);await page.goto(`drawings/${drawing.id}`);await expect(page.locator('.excalidraw')).toBeVisible();await expect(page.locator('.content-breadcrumb')).toHaveCount(0);await expect(page.locator('.content-primary-actions').getByRole('button')).toHaveText(['分享','导出','删除']);
 await page.getByTitle('素材库',{exact:true}).click();await expect(page.locator('.library-unit')).toHaveCount(82);await page.screenshot({path:testInfo.outputPath('default-drawing-libraries.png'),fullPage:true});
 await page.locator('.library-unit__dragger').nth(12).click();const canvas=page.locator('.excalidraw canvas').last(),box=(await canvas.boundingBox())!;await page.mouse.click(box.x+box.width*.5,box.y+box.height*.5);
 await expect.poll(async()=>{const current=(await(await request.get(`${API}/drawings/${drawing.id}`,{headers})).json()).data;return current.payload.elements.filter((element:any)=>!element.isDeleted).length;}).toBeGreaterThan(1);
 await page.reload();await expect(page.locator('.excalidraw')).toBeVisible();await page.getByTitle('素材库',{exact:true}).click();await expect(page.locator('.library-unit')).toHaveCount(82);await page.getByRole('link',{name:'← 返回绘图列表',exact:true}).click();await expect(page).toHaveURL(/\/drawings$/);expect(errors).toEqual([]);
});
