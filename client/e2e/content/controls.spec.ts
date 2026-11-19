import {test,expect} from './fixtures';
test('content centers use accessible component selects and compact aligned dialogs',async({page,token},testInfo)=>{
 await page.addInitScript(value=>localStorage.setItem('token',value),token);
 for(const path of ['documents','drawings']) {
  await page.goto(path);const scope=page.getByRole('combobox',{name:'项目范围',exact:true});await expect(scope).toHaveAttribute('data-state','closed');await scope.focus();await scope.press('ArrowDown');await expect(page.getByRole('listbox')).toBeVisible();await page.getByRole('option',{name:'全部项目',exact:true}).click();await expect(scope).toContainText('全部项目');
  await page.getByRole('combobox',{name:'内容筛选',exact:true}).click();await page.getByRole('option',{name:'收藏',exact:true}).click();await expect(page.getByRole('combobox',{name:'内容筛选',exact:true})).toContainText('收藏');
  await page.getByRole('button',{name:path==='documents'?'新建文档':'新建绘图',exact:true}).click();const dialog=page.getByRole('dialog',{name:'新建内容',exact:true});const template=dialog.getByRole('combobox',{name:'初始模板',exact:true});await template.click();await expect(page.getByRole('listbox')).toBeVisible();await page.getByRole('option',{name:path==='documents'?'服务器与部署说明':'部署拓扑',exact:true}).click();await expect(dialog).toBeVisible();await expect(dialog.getByRole('heading',{level:2})).toHaveCSS('font-size','15px');await expect(dialog.locator('.content-modal-actions')).toHaveCSS('justify-content','flex-end');
  await page.screenshot({path:testInfo.outputPath(`${path}-create.png`),fullPage:true});await dialog.getByRole('button',{name:'取消',exact:true}).click();await expect(dialog).toBeHidden();
 }
 await page.setViewportSize({width:390,height:844});await page.goto('documents');await page.getByRole('button',{name:'新建文档',exact:true}).click();const dialog=page.getByRole('dialog',{name:'新建内容',exact:true});await dialog.getByRole('combobox',{name:'初始模板',exact:true}).click();await page.getByRole('option',{name:'项目操作手册',exact:true}).click();await page.screenshot({path:testInfo.outputPath('mobile-create.png'),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
