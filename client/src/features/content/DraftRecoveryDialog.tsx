import type {LocalDraft} from './types';
export function DraftRecoveryDialog<T>({draft,serverVersion,onRestore,onDiscard}:{draft:LocalDraft<T>|undefined;serverVersion:number;onRestore:(draft:LocalDraft<T>)=>void;onDiscard:(draft:LocalDraft<T>)=>Promise<void>}) {
 if(!draft) return null;
 return <div className="content-modal-backdrop"><section className="content-modal" role="dialog" aria-modal="true" aria-label="恢复本地草稿"><h2>发现本账号的本地草稿</h2><p>{draft.title} · {new Date(draft.updatedAt).toLocaleString()}</p><p>{draft.baseVersion===serverVersion?'恢复后可继续编辑或手动保存。':'服务器版本已经变化，恢复后将进入冲突处理。'}恢复不会立即提交到服务器。</p><button onClick={()=>onRestore(draft)}>恢复草稿</button><button onClick={()=>void onDiscard(draft)}>丢弃这份草稿</button></section></div>;
}
