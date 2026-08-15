# FlowCraft RAG 系统实现计划

> 本文档为 AI 对话功能的 RAG 系统规划，待后续实现。

## 技术选型

| 组件 | 选择 | 理由 |
|------|------|------|
| LLM | DeepSeek (`deepseek-chat`) | OpenAI 兼容 API |
| Embedding | SiliconFlow `BAAI/bge-m3` | 国内服务，中文效果最佳，OpenAI 兼容 API 格式 |
| 向量数据库 | ChromaDB (Docker) | 支持元数据过滤（按 projectId 检索）、持久化 |
| 编排 | LangChain.js + LangGraph | LangGraph 管理对话状态机，LangChain 处理文档/检索/LLM |
| 文档解析 | `pdf-parse` / `mammoth` / `cheerio` / `xlsx` | 覆盖 PDF、Word、HTML、Excel |
| 流式响应 | SSE (Server-Sent Events) | 轻量，适合单向流式 |

## 架构

```
用户输入 → LangGraph 状态机 → ChromaDB 检索（按 projectId 过滤）
                                      ↓
                              DeepSeek 生成回答（流式）
                                      ↓
                              SSE → 前端 AI 面板
```

数据流：DB 记录 + MinIO 文件 → 文档解析 → 分块 → Embedding → ChromaDB

## 服务端模块

```
server/src/ai/
├── config.ts              — AI 配置（API keys、模型名、ChromaDB 连接、分块参数）
├── embeddings.ts          — SiliconFlow bge-m3（用 OpenAIEmbeddings + 自定义 baseURL）
├── vectorstore.ts         — ChromaDB 连接、按 projectId 检索、添加/删除文档
├── documentParser.ts      — 文件内容提取（PDF→text, DOCX→text, HTML→text, Excel→text）
├── chunking.ts            — RecursiveCharacterTextSplitter（中文感知分隔符）
├── indexing/
│   ├── documentBuilder.ts — DB 记录 → LangChain Document（带 projectId/sourceType 元数据）
│   ├── orchestrator.ts    — 全量重建索引 + 增量索引 + 按 sourceId 删除
│   └── cleanup.ts         — 清理向量库中过期条目
├── graph/
│   ├── state.ts           — LangGraph 状态类型定义
│   ├── nodes.ts           — retrieve 节点（ChromaDB 检索）+ generate 节点（DeepSeek 生成）
│   └── graph.ts           — StateGraph: START → retrieve → generate → END
└── prompts/
    └── chatPrompt.ts      — 系统提示词模板（中文、项目上下文感知）
```

## API 端点

```
POST   /api/v1/ai/chat              — SSE 流式对话
GET    /api/v1/ai/conversations      — 会话列表（?projectId= 过滤）
POST   /api/v1/ai/conversations      — 创建会话
GET    /api/v1/ai/conversations/:id  — 会话详情+消息
DELETE /api/v1/ai/conversations/:id  — 删除会话
POST   /api/v1/ai/index              — 全量重建索引
GET    /api/v1/ai/index/status        — 索引状态
```

## 索引内容

| 来源 | 索引内容 | 元数据 |
|------|---------|--------|
| Project | name, type, description, status | projectId, sourceType=project |
| Phase | name, status, order | projectId, sourceType=phase |
| Task | title, description, type, priority, status | projectId, sourceType=task |
| Artifact (DB) | name, content 字段 | projectId, sourceType=artifact |
| Artifact (文件) | MinIO 文件解析后文本，分块存储 | projectId, sourceType=artifact, fileName |
| Template | name, category, description, content | sourceType=template |
| Report | label, type, content | projectId, sourceType=report |

## LangGraph 状态机

```
START → retrieve（ChromaDB 检索，按 projectId 过滤）→ generate（构建 prompt + DeepSeek 流式生成）→ END
```

## SSE 流式响应格式

```
event: token
data: {"content": "部分回答"}

event: sources
data: {"sources": [{"content": "...", "metadata": {"sourceType": "task", "sourceId": "..."}}]}

event: done
data: {"messageId": "uuid"}
```

## Prisma Schema 变更

新增 Conversation 和 Message 模型用于存储对话历史和引用来源。

## 环境变量

```bash
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
SILICONFLOW_API_KEY=sk-xxx
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1
SILICONFLOW_EMBEDDING_MODEL=BAAI/bge-m3
CHROMA_HOST=localhost
CHROMA_PORT=8000
CHROMA_COLLECTION=flowcraft
```

## 依赖

```bash
npm install langchain @langchain/core @langchain/community @langchain/openai @langchain/langgraph
npm install chromadb pdf-parse mammoth cheerio xlsx
```

## 前端集成

- 重写 `AIPanel.tsx`：从静态 mockup 改为真实流式聊天
- 新增 `useAIChat` hook：管理对话状态 + SSE 流式接收
- 新增 `aiApi.ts`：AI API 客户端
- 自动传入当前 `selectedProjectId` 实现项目范围检索
