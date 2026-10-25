import {test,expect,API} from './fixtures';
for(const kind of ['documents','drawings']) test(`${kind} sidebar count follows creation, deletion and recovery without reloading the list`,async({page,request,content,token},testInfo)=>{
 const label=kind==='documents'?'文档':'绘图',headers={Authorization:`Bearer ${token}`};
 await request.post(`${API}/${kind}`,{headers,data:{projectId:content.project.id,title:'原有内容',payload:kind==='documents'?content.body:content.scene}});
 await page.addInitScript(value=>{localStorage.setItem('token',value.token);localStorage.setItem('flowcraft_selected_project',value.projectId);},{token,projectId:content.project.id});
 await page.goto(kind);const link=page.locator('aside').getByRole('link',{name:new RegExp(`${label}中心`)});
 await expect(link).toHaveText(`${label}中心1`);
 await page.getByRole('button',{name:`新建${label}`,exact:true}).click();const dialog=page.getByRole('dialog',{name:'新建内容'});await dialog.getByLabel('内容名称').fill('新增内容');await dialog.getByRole('button',{name:'创建并打开'}).click();await expect(link).toHaveText(`${label}中心2`);
 await page.getByRole('link',{name:`返回${label}列表`}).click();await expect(page.getByRole('button',{name:`删除${label} 新增内容`,exact:true})).toBeVisible();
 const reads:string[]=[];page.on('request',request=>{if(request.method()==='GET'&&new URL(request.url()).pathname.endsWith(`/${kind}`)) reads.push(request.url());});
 await page.getByRole('button',{name:`删除${label} 新增内容`,exact:true}).click();await page.getByRole('button',{name:`删除${label}`,exact:true}).click();await expect(link).toHaveText(`${label}中心1`);expect(reads).toEqual([]);
 await page.getByRole('button',{name:'回收站',exact:true}).click();await page.getByRole('dialog',{name:'回收站'}).getByRole('button',{name:'恢复',exact:true}).click();await expect(link).toHaveText(`${label}中心2`);await page.getByRole('button',{name:'关闭回收站'}).click();
 await expect(page.getByRole('button',{name:`删除${label} 新增内容`,exact:true})).toBeVisible();await page.screenshot({path:testInfo.outputPath('sidebar-counts.png')});await page.reload();await expect(link).toHaveText(`${label}中心2`);
});
