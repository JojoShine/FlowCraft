import {useState,type ReactNode} from 'react';
import {ChevronDown,Download} from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
export function ContentActions({children}:{children:ReactNode}) {
 const [open,setOpen]=useState(false);
 return <Popover.Root open={open} onOpenChange={setOpen}><Popover.Trigger asChild><button type="button" className="content-header-action"><Download size={12}/>导出<ChevronDown size={12}/></button></Popover.Trigger><Popover.Portal><Popover.Content className="content-actions-popover" align="end" sideOffset={8} aria-label="导出格式" onClick={event=>{if((event.target as HTMLElement).closest('button:not(:disabled)')) setOpen(false);}}>{children}</Popover.Content></Popover.Portal></Popover.Root>;
}
