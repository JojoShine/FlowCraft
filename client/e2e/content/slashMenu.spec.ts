import {test,expect,API} from './fixtures';

test('slash keyboard navigation scrolls the selected command into view and keeps the caret in the document',async({page,request,content,token},testInfo)=>{
 const headers={Authorization:`Bearer ${token}`};
 const doc=(await(await request.post(`${API}/documents`,{headers,data:{projectId:content.project.id,title:'插入菜单键盘验证',payload:{formatVersion:1,blocks:[{id:'command',type:'paragraph',content:[]}]}}})).json()).data;
 await page.addInitScript(value=>localStorage.setItem('token',value),token);
 await page.goto(`documents/${doc.id}`);
 const editor=page.getByRole('textbox',{name:'文档正文'}),paragraph=editor.locator('[data-id="command"] p'),menu=page.getByRole('listbox',{name:'插入内容'}),options=menu.getByRole('option');
 await paragraph.click();await page.keyboard.type('/');await expect(menu).toBeVisible();
 const count=await options.count(),caret=await editor.evaluate(node=>{const selection=window.getSelection()!;return {offset:selection.anchorOffset,text:selection.anchorNode?.textContent};});
 for(let index=1;index<count;index++) {
  await page.keyboard.press('ArrowDown');await expect(options.nth(index)).toHaveAttribute('aria-selected','true');
  await expect.poll(()=>menu.evaluate(node=>{const selected=node.querySelector('[aria-selected="true"]')!.getBoundingClientRect(),bounds=node.getBoundingClientRect();return selected.top>=bounds.top&&selected.bottom<=bounds.bottom;})).toBe(true);
 }
 await expect(editor).toBeFocused();
 expect(await editor.evaluate(node=>{const selection=window.getSelection()!;return {offset:selection.anchorOffset,text:selection.anchorNode?.textContent};})).toEqual(caret);
 await page.keyboard.press('ArrowDown');await expect(options.first()).toHaveAttribute('aria-selected','true');await expect.poll(()=>menu.evaluate(node=>node.scrollTop)).toBe(0);
 await page.keyboard.press('ArrowUp');await expect(options.last()).toHaveAttribute('aria-selected','true');await expect.poll(()=>menu.evaluate(node=>node.scrollTop)).toBeGreaterThan(0);
 await page.screenshot({path:testInfo.outputPath('slash-keyboard-scroll.png')});
 for(let index=count-2;index>=0;index--) {
  await page.keyboard.press('ArrowUp');await expect(options.nth(index)).toHaveAttribute('aria-selected','true');
  await expect.poll(()=>menu.evaluate(node=>{const selected=node.querySelector('[aria-selected="true"]')!.getBoundingClientRect(),bounds=node.getBoundingClientRect();return selected.top>=bounds.top&&selected.bottom<=bounds.bottom;})).toBe(true);
 }
 await page.keyboard.press('Escape');await expect(menu).toHaveCount(0);await expect(paragraph).toHaveText('/');
 await page.keyboard.press('Backspace');await page.keyboard.type('/table');await expect(options).toHaveCount(1);await expect(options.first()).toHaveAttribute('aria-selected','true');await expect.poll(()=>menu.evaluate(node=>node.scrollTop)).toBe(0);
 await page.keyboard.press('Enter');await expect(menu).toHaveCount(0);await expect(editor.locator('table')).toHaveCount(1);
});

test('slash inserts a divider that survives autosave and reload without removing nearby text',async({page,request,content,token})=>{
 const headers={Authorization:`Bearer ${token}`};
 const doc=(await(await request.post(`${API}/documents`,{headers,data:{projectId:content.project.id,title:'分割线验证',payload:{formatVersion:1,blocks:[{id:'before',type:'paragraph',content:'分割线之前'},{id:'command',type:'paragraph',content:[]},{id:'after',type:'paragraph',content:'分割线之后'}]}}})).json()).data;
 await page.addInitScript(value=>localStorage.setItem('token',value),token);await page.goto(`documents/${doc.id}`);
 const editor=page.getByRole('textbox',{name:'文档正文'}),menu=page.getByRole('listbox',{name:'插入内容'});
 await editor.locator('[data-id="command"] p').click();await page.keyboard.type('/分割');await expect(menu.getByRole('option',{name:'分割线',exact:true})).toBeVisible();await page.keyboard.press('Enter');
 await expect(editor.locator('hr')).toHaveCount(1);await expect(menu).toHaveCount(0);
 await expect.poll(async()=>{const result=(await(await request.get(`${API}/documents/${doc.id}`,{headers})).json()).data;return result.payload.blocks.some((block:{type:string})=>block.type==='divider');}).toBe(true);
 await page.reload();await expect(editor.locator('hr')).toHaveCount(1);await expect(editor.locator('[data-id="before"] p')).toHaveText('分割线之前');await expect(editor.locator('[data-id="after"] p')).toHaveText('分割线之后');
});
