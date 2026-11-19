import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {DocumentList} from '../../src/features/documents/DocumentList';
import {DocumentOutline} from '../../src/features/documents/DocumentOutline';
it('flat list selects independent documents, headings stay inside a single article outline',()=>{
 const select=vi.fn();render(<DocumentList items={[{id:'a',projectId:'p',title:'服务器.md',version:1,updatedAt:'2026-10-22T00:00:00Z'},{id:'b',projectId:'p',title:'手册.md',version:1,updatedAt:'2026-10-22T00:00:00Z'}]} onSelect={select}/>);
 fireEvent.click(screen.getByText('服务器.md'));expect(select).toHaveBeenCalledWith('a');expect(screen.queryByRole('tree')).toBeNull();
 const jump=vi.fn();render(<DocumentOutline blocks={[{id:'h1',type:'heading',props:{level:1},content:[{type:'text',text:'部署说明'}]},{id:'h2',type:'heading',props:{level:2},content:[{type:'text',text:'服务器清单'}]}]} onSelect={jump}/>);
 fireEvent.click(screen.getByText('服务器清单'));expect(jump).toHaveBeenCalledWith('h2');expect(screen.getByLabelText('文章目录').textContent).toContain('部署说明');
});
