import {it,expect,vi} from 'vitest';
import {render,fireEvent,waitFor,screen} from '@testing-library/react';
import {FileUpload} from '../../src/components/ui/FileUpload';
it('selects every attachment in a batch and keeps the picker ready for another selection',async()=>{
 const selected=vi.fn();const {container}=render(<FileUpload label="添加附件" multiple onSelectFiles={selected}/>);const files=[new File(['a'],'plan.md'),new File(['b'],'notes.txt')],input=container.querySelector('input')!;fireEvent.change(input,{target:{files}});await waitFor(()=>expect(selected).toHaveBeenCalledWith(files));expect(input.style.display).toBe('none');expect(screen.getByText('点击上传或拖拽文件到此处')).toBeTruthy();
});
it('accepts all dropped attachments and ignores drops while disabled',async()=>{
 const selected=vi.fn();const {container,rerender}=render(<FileUpload multiple onSelectFiles={selected}/>);const files=[new File(['a'],'a.md'),new File(['b'],'b.md')];fireEvent.drop(container.querySelector('input')!.parentElement!,{dataTransfer:{files}});await waitFor(()=>expect(selected).toHaveBeenCalledWith(files));rerender(<FileUpload multiple disabled onSelectFiles={selected}/>);fireEvent.drop(container.querySelector('input')!.parentElement!,{dataTransfer:{files}});expect(selected).toHaveBeenCalledTimes(1);
});
it('preserves existing single-file upload and success feedback',async()=>{
 const upload=vi.fn().mockResolvedValue(undefined),file=new File(['x'],'original.pdf');const {container}=render(<FileUpload onUpload={upload}/>);fireEvent.change(container.querySelector('input')!,{target:{files:[file]}});await waitFor(()=>expect(screen.getByText('original.pdf')).toBeTruthy());expect(upload).toHaveBeenCalledWith(file);
});
