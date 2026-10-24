import type {Readable} from 'stream';
export type ContentKind = 'document'|'drawing';
export interface Actor {id:string;role:string;projectId:string|null}
export type BlockJSON = {id:string;type:string;props?:Record<string,any>;content?:any;children?:BlockJSON[]};
export interface DocumentBody {formatVersion:1;blocks:BlockJSON[]}
export interface DrawingScene {formatVersion:1;elements:Record<string,any>[];appState:Record<string,any>;files:Record<string,{assetId:string}>}
export interface SaveEnvelope<T> {baseVersion:number;requestId:string;source:'auto'|'manual';title:string;payload:T}
export interface SaveAck {version:number;digest:string;savedAt:string;requestId:string}
export interface ContentView<T> {id:string;projectId:string;version:number;title:string;payload:T;savedAt:string;canEdit:boolean;deletedAt:string|null}
export interface DrawingReference {blockId:string;drawingId:string;mode:'latest'|'pinned';revision:number|null}
export interface ResolvedEmbed {blockId:string;drawingId:string;revision:number;title:string;scene:DrawingScene|null;previewAssetId:string|null;status:'ready'|'preview-pending'|'deleted'|'unavailable'}
export interface ContentContext {kind:ContentKind;id:string;revision?:number;documentId?:string;blockId?:string}
export interface CreateContentInput<T> {projectId:string;title:string;payload:T}
export interface ContentListQuery {projectId?:string;q?:string;page?:number;favorite?:boolean;recent?:boolean}
export interface Page<T> {items:T[];total:number;page:number;pageSize:number}
export interface RevisionSummary {version:number;title:string;savedAt:string;source:'create'|'auto'|'manual'|'restore';restoredFrom:number|null}
export type RevisionPage = Page<RevisionSummary>;
export type DocumentRevisionDto = ContentView<DocumentBody>&{digest:string;source:string;restoredFrom:number|null;references:DrawingReference[]};
export type DrawingRevisionDto = ContentView<DrawingScene>&{digest:string;source:string;restoredFrom:number|null};
export interface RestoreInput {baseVersion:number;requestId:string;revision:number}
export interface AssetDto {id:string;mimeType:string;bytes:number;state:'complete'}
export interface AssetUploadInput {projectId:string;category:'image'|'attachment'|'preview';mimeType:string;originalName:string;bytes:number;stream:Readable}
export interface PreferencePatch {favorite?:boolean;lastViewedAt?:string;viewState?:Record<string,unknown>}
export type PreferenceDto = PreferencePatch & {kind:ContentKind;entityId:string};
export interface ContentSummary {id:string;projectId:string;title:string;version:number;updatedAt:string;previewAssetId?:string|null}
export interface DocumentReferenceDto {documentId:string;title:string;blockId:string}
