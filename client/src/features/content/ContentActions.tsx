import {useState,type ReactNode} from 'react';
import * as Popover from '@radix-ui/react-popover';
export function ContentActions({children}:{children:ReactNode}) {
 const [open,setOpen]=useState(false);
 return <Popover.Root open={open} onOpenChange={setOpen}><Popover.Trigger asChild><button type="button" className="content-more" aria-label="更多操作">···</button></Popover.Trigger><Popover.Portal><Popover.Content className="content-actions-popover" align="end" sideOffset={8} aria-label="更多操作" onClick={event=>{if((event.target as HTMLElement).closest('button:not(:disabled)')) setOpen(false);}}>{children}</Popover.Content></Popover.Portal></Popover.Root>;
}
