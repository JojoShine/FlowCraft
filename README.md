# FlowCraft

FlowCraft 是面向独立开发者和小型项目团队的一站式项目工作台。它把项目阶段、任务看板、过程文档、交付产物、AI 助手和周期报告放在同一个工作空间中，帮助开发者从想法形成到复盘归档持续掌握项目上下文。

[查看 GitHub 仓库](https://github.com/JojoShine/FlowCraft)

## 为什么做 FlowCraft

独立开发项目通常不缺工具，缺的是连贯的工作流：需求散落在文档里，任务放在看板里，交付文件留在本地目录，讨论上下文又停留在聊天窗口。工具越多，维护信息之间关系的成本越高。

FlowCraft 希望解决三个问题：

- **让项目过程连续**：用项目阶段串联调研、设计、开发、测试、交付和复盘，避免只看到零散任务。
- **让任务与产物互相关联**：任务可以关联文档、表格、图片和文件夹，项目成果不再脱离执行过程。
- **让 AI 使用真实上下文**：AI 助手基于当前项目、会话和模板工作，并将生成结果沉淀为可继续管理的产物或报告。

它不是为了替代专业的大型协作平台，而是为个人开发和轻量团队提供一个结构清楚、部署简单、能够长期沉淀项目知识的工作台。

## 主要能力

- 项目与阶段管理：维护项目状态、周期及从立项到归档的阶段结构。
- 任务看板：按待办、进行中和已完成组织任务，支持优先级、里程碑、负责人和截止日期。
- 产物管理：上传文件或文件夹，在线预览、下载，并将产物关联到项目、任务和模板。
- 模板中心：管理常用内容模板及输出格式，辅助生成 Word、Excel 等交付材料。
- AI 项目助手：保存多轮会话，结合项目与模板上下文生成内容。
- 项目报告：手动或定时生成日报、周报和月报。
- 公开分享：通过分享令牌提供无需登录的产物访问页面。
- 身份与主题：支持账号注册、JWT 登录和明暗主题。

## 系统设计

```mermaid
flowchart LR
    U[浏览器] -->|React 页面| C[FlowCraft Client]
    C -->|REST API / JWT| S[Express API]
    S --> DB[(PostgreSQL)]
    S --> FS[(MinIO 对象存储)]
    S --> AI[DeepSeek API]
    S --> CRON[报告定时任务]
    CRON --> DB
```

### 前端

前端位于 `client/`，使用 React 19、TypeScript 和 Vite 构建。

- `pages/`：工作台、项目、看板、产物、模板、报告、登录和公开分享页面。
- `components/`：布局、业务组件与通用 UI 组件。
- `contexts/`：登录态、主题和当前项目上下文。
- `hooks/`：项目、任务、产物、报告及 AI 会话的数据访问逻辑。
- `services/api.ts`：统一封装 API 请求、JWT 注入和错误处理。
- `store/`：使用 Zustand 管理局部界面状态。

前端默认挂载在 `/flowcraft/`，开发服务器会把 `/api` 请求代理到后端的 `3800` 端口。

### 后端

后端位于 `server/`，使用 Express 5、TypeScript、Prisma 和 PostgreSQL。

- `routes/`：认证、项目、阶段、任务、产物、模板、报告、搜索和公开访问接口。
- `services/`：封装业务规则与数据库操作。
- `middleware/`：JWT 鉴权、上传处理、请求日志和统一错误响应。
- `ai/`：大模型配置、会话代理和上下文组织。
- `lib/`：Prisma、MinIO、时区、日志及响应工具。
- `prisma/schema.prisma`：用户、项目、阶段、任务、产物、模板、报告和 AI 会话的数据模型。

后端启动时会检查 PostgreSQL、MinIO 和大模型服务。数据库不可用时服务不会启动；MinIO 或大模型不可用时，相关能力将不可用，但基础项目管理仍可运行。

### 核心数据关系

```text
User
 ├─ Project
 │   ├─ Phase ─ Task
 │   ├─ Task ─ Artifact
 │   └─ Report
 ├─ Template ─ Artifact
 └─ Conversation ─ Message
```

项目是主要的数据边界。阶段负责组织生命周期，任务属于项目并可归入阶段，产物既属于项目，也可以进一步关联任务与模板。报告按项目和日期归档，AI 会话与消息独立保存并可绑定项目上下文。

## 项目结构

```text
FlowCraft/
├── client/                 # React 前端
│   ├── src/
│   │   ├── components/     # 布局、业务和通用组件
│   │   ├── contexts/       # 全局上下文
│   │   ├── hooks/          # 数据与业务 Hooks
│   │   ├── pages/          # 路由页面
│   │   ├── services/       # API 客户端
│   │   ├── store/          # Zustand 状态
│   │   └── styles/         # 全局样式与主题变量
│   └── vite.config.ts
├── server/                 # Express 后端
│   ├── prisma/             # 数据模型与初始化脚本
│   └── src/
│       ├── ai/             # AI 对话与模型适配
│       ├── middleware/     # 请求中间件
│       ├── routes/         # HTTP 路由
│       ├── services/       # 业务服务
│       └── lib/            # 基础设施封装
├── docs/                   # 设计说明与规划文档
├── prototype/              # 早期界面原型
├── build.sh                # 生产构建与打包脚本
└── nginx.conf              # `/flowcraft/` 部署示例
```

## 本地运行

### 环境要求

- Node.js 20 或更高版本
- PostgreSQL
- MinIO（使用文件上传与预览功能时需要）
- DeepSeek API Key（使用 AI 助手和智能报告时需要）

### 1. 配置后端

```bash
cd server
cp .env.example .env
```

编辑 `server/.env`：

```dotenv
DATABASE_URL="postgresql://user:password@localhost:5432/flowcraft?schema=public"
PORT=3800

MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key
MINIO_BUCKET=flowcraft
MINIO_USE_SSL=false

DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

不要提交 `.env` 或任何真实密钥；该文件已被 `.gitignore` 忽略。

### 2. 初始化并启动后端

```bash
cd server
npm install
npm run db:generate
npm run db:push
npm run dev
```

后端默认运行在 `http://localhost:3800`。

### 3. 启动前端

打开另一个终端：

```bash
cd client
npm install
npm run dev
```

访问 `http://localhost:5173/flowcraft/`，首次使用时在登录页创建账号。

如果 API 部署在其他地址，可通过前端环境变量覆盖默认路径：

```dotenv
VITE_API_BASE_URL=https://example.com/api/v1
```

## 基本使用方式

1. **创建项目**：填写名称、类型、目标和项目周期。
2. **规划阶段**：按照实际流程维护调研、设计、开发、测试和交付等阶段。
3. **拆分任务**：在看板中创建任务，设置优先级、截止日期、负责人及里程碑。
4. **沉淀产物**：上传文档、表格、图片或文件夹，并关联到对应任务。
5. **复用模板**：在模板中心维护报告或交付文档模板，生成标准化内容。
6. **使用 AI 助手**：选择当前项目和所需模板后发起对话，让生成内容保留项目上下文。
7. **生成报告**：在报告页创建日报、周报或月报；服务运行期间也会按计划自动生成周期报告。
8. **分享成果**：为产物创建公开链接，需要时可随时取消分享。

## 构建与部署

分别验证前后端生产构建：

```bash
cd client && npm run build
cd ../server && npm run build
```

项目根目录的脚本会构建两端代码，并把静态资源、服务端产物、PM2 配置和 Nginx 示例打包到 `deploy/`：

```bash
./build.sh
```

生产环境建议由 Nginx 托管 `client/dist`，将 `/flowcraft/api/` 反向代理到后端，并使用 PM2 或其他进程管理器运行服务。部署前请按实际域名、目录和后端地址调整 `nginx.conf` 与环境变量。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| Web | React 19、TypeScript、Vite、React Router、Zustand、Radix UI |
| API | Express 5、TypeScript、Zod、JWT |
| 数据 | PostgreSQL、Prisma |
| 文件 | MinIO |
| AI | DeepSeek（OpenAI 兼容接口） |
| 文档 | Mammoth、docx-preview、SheetJS、html-to-docx、jsPDF |
| 部署 | Nginx、PM2 |

## License

当前仓库尚未声明开源许可证。公开部署或二次分发前，请先与项目维护者确认授权范围。
