import { chatStreamWithTools, type ChatMessage, type ToolCall } from './llm';
import { tools } from './tools/definitions';
import { executeTool } from './tools/executor';

const SYSTEM_PROMPT_BASE = `你是 FlowCraft 的 AI 助手，一个面向独立开发者的项目管理智能助理。

你的职责：
- 基于项目数据回答关于任务、产物、进度、报告的问题
- 提供项目分析、进度总结、建议
- 回答简洁专业，使用中文
- 需要查询数据时，请调用工具获取，不要编造数据
- 禁止在回复中使用任何 emoji 表情符号

调用工具的核心原则：
- 调用工具前，先仔细分析用户的查询意图，提取出所有可用的筛选条件
- 必须将提取到的筛选条件作为参数传递给工具，确保返回精准的结果
- 当用户提到具体的名称、业务、功能等，必须将该名称作为 keyword 参数传递
- 当用户提到类型（如文档、流程图、原型），必须将该类型作为 type 参数传递
- 当用户提到优先级（高、中、低）或状态（已完成、未完成），必须传递对应参数
- 只有在用户明确要求"列出全部"或"所有"时，才不传筛选参数

重要：区分"具体查询"和"全量查询"
- 当用户说"XXX原型"、"XXX任务"、"XXX产物"时，"原型/任务/产物"是描述该项目的性质，用户要查的是"XXX"这个具体项目，必须将"XXX"作为 keyword 传递
- 例如用户说"登录页原型"，应调用 get_artifacts({ keyword: "登录页" })，而不是返回所有原型
- 例如用户说"支付任务"，应调用 get_tasks({ keyword: "支付" })，而不是返回所有任务
- 只有当用户明确说"所有原型"、"全部任务"、"列出产物"时，才不传 keyword

示例：
- 用户说"查找需求文档" → get_artifacts({ keyword: "需求文档" })
- 用户说"关于登录的任务" → get_tasks({ keyword: "登录" })
- 用户说"高优先级的未完成任务" → get_tasks({ priority: "high", completed: false })
- 用户说"最近的周报" → get_reports({ type: "weekly" })`;

function buildSystemPrompt(projectId?: string, templateContext?: string): string {
  let prompt = SYSTEM_PROMPT_BASE;
  if (projectId) {
    prompt += `\n\n当前上下文项目ID：${projectId}\n调用工具时无需传递 projectId，系统会自动注入。`;
  }
  if (templateContext) {
    prompt += `\n\n用户引用了以下模板，请按照模板的结构和格式，根据用户的要求生成新的内容。\n直接输出完整的 HTML 代码，用 \`\`\`html 代码块包裹。\n\n=== 模板内容 ===\n${templateContext}`;
  }
  return prompt;
}

export type AgentEvent =
  | { type: 'tool_call'; name: string; args: Record<string, unknown>; result: any }
  | { type: 'token'; content: string }
  | { type: 'done' };

const MAX_ITERATIONS = 5;

export async function* runAgent(
  query: string,
  projectId: string | undefined,
  history: ChatMessage[],
  templateContext?: string,
): AsyncGenerator<AgentEvent> {
  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(projectId, templateContext) },
    ...history,
    { role: 'user', content: query },
  ];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let hasToolCalls = false;
    let assistantContent = '';
    const assistantToolCalls: ToolCall[] = [];

    for await (const event of chatStreamWithTools(messages, tools)) {
      if (event.type === 'text') {
        assistantContent += event.content;
        yield { type: 'token', content: event.content };
      } else if (event.type === 'tool_calls') {
        hasToolCalls = true;
        assistantToolCalls.push(...event.toolCalls);
      }
    }

    if (!hasToolCalls) {
      yield { type: 'done' };
      return;
    }

    messages.push({
      role: 'assistant',
      content: assistantContent || null,
      tool_calls: assistantToolCalls,
    });

    for (const tc of assistantToolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments);
      } catch {
        args = {};
      }

      const result = await executeTool(tc.function.name, args, projectId);
      let parsedResult: any;
      try { parsedResult = JSON.parse(result); } catch { parsedResult = result; }

      yield { type: 'tool_call', name: tc.function.name, args, result: parsedResult };

      messages.push({
        role: 'tool',
        content: result,
        tool_call_id: tc.id,
        name: tc.function.name,
      });
    }
  }

  yield { type: 'token', content: '\n\n（已达到最大推理轮次，回答可能不完整）' };
  yield { type: 'done' };
}
