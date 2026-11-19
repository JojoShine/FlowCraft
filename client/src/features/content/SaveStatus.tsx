import type {SaveState} from './saveQueue';
const labels:Record<SaveState['phase'],string>={saved:'已保存到服务器',dirty:'有未保存更改',saving:'正在保存',offline:'离线，草稿已保留',error:'保存失败',conflict:'发现其他位置的更新','auth-paused':'登录失效，草稿已保留',deleted:'内容已移入回收站'};
export function SaveStatus({state,onRetry,onExport,onHistory,savedAt:initialSavedAt}:{state:SaveState;onRetry?:()=>void;onExport?:()=>void;onHistory?:()=>void;savedAt?:string}) {
 const savedAt=state.savedAt||initialSavedAt;
 const label=!state.draftPersisted&&state.phase==='offline'?'离线，草稿未能保留':!state.draftPersisted&&state.phase==='auth-paused'?'登录失效，草稿未能保留':labels[state.phase];
 return <div className="content-save-status" role="status" aria-live="polite"><span data-phase={state.phase}>{label}</span>{savedAt&&(onHistory?<button className="content-save-time" aria-label="历史版本" title="查看历史版本" onClick={onHistory}><time dateTime={savedAt}>{new Date(savedAt).toLocaleTimeString()}</time></button>:<time dateTime={savedAt}> · {new Date(savedAt).toLocaleTimeString()}</time>)}{['error','offline'].includes(state.phase)&&<button onClick={onRetry}>重试保存</button>}{state.draftError&&<span className="content-warning">本地恢复不可用：{state.draftError} <button onClick={onExport}>导出恢复草稿</button></span>}{state.error&&state.phase!=='saved'&&<small>{state.error}</small>}</div>;
}
