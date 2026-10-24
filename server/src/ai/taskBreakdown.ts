import {z} from 'zod';
import {AppError} from '../middleware/errorHandler';
export const taskTypes=['requirement','prototype','design','development','testing','document','review','risk','research','deploy'] as const;
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{const parsed=new Date(`${value}T00:00:00Z`);return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;},'日期无效');
export const proposedTaskSchema=z.object({title:z.string().trim().min(1).max(200),description:z.string().max(4000).default(''),type:z.enum(taskTypes),priority:z.enum(['high','med','low']),dueDate:date.nullable().default(null)});
export type ProposedTask=z.infer<typeof proposedTaskSchema>;
const previewSchema=z.object({summary:z.string().max(2000).default(''),tasks:z.array(proposedTaskSchema).max(50)});
export const breakdownInput=z.object({projectId:z.string().min(1).max(255),text:z.string().trim().max(30000).optional(),documentId:z.uuid().optional(),instructions:z.string().trim().max(4000).default('')}).refine(value=>!(value.text&&value.documentId),'请选择一份文档或填写方案、对话文字');
const batchSchema=z.object({projectId:z.string().min(1).max(255),requestId:z.uuid(),tasks:z.array(proposedTaskSchema).min(1).max(50)});
export function parseTaskBreakdown(text:string) {
 try {const raw=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');return previewSchema.parse(JSON.parse(raw));}catch {throw AppError.badRequest('AI 未返回有效的任务清单，请补充说明后重新拆解');}
}
export function parseTaskBatch(input:unknown) {const parsed=batchSchema.safeParse(input);if(!parsed.success) throw AppError.badRequest('任务内容或请求标识无效，请检查标题、类型、优先级和日期');return parsed.data;}
