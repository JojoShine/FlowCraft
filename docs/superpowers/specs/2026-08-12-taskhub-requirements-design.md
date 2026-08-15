# TaskHub 重构全量需求文档

> 版本：v1.0
> 日期：2026-08-12
> 状态：待评审

---

## 目录

1. [文档概述](#1-文档概述)
2. [产品定位与设计原则](#2-产品定位与设计原则)
3. [全局数据模型](#3-全局数据模型)
4. [工作台](#4-工作台)
5. [项目管理](#5-项目管理)
6. [项目阶段管理](#6-项目阶段管理)
7. [产物中心](#7-产物中心)
8. [文档模板管理](#8-文档模板管理)
9. [原型设计](#9-原型设计)
10. [项目计划](#10-项目计划)
11. [任务与看板](#11-任务与看板)
12. [接口与技术资料管理](#12-接口与技术资料管理)
13. [AI 项目助手](#13-ai-项目助手)
14. [汇报中心](#14-汇报中心)
15. [复盘归档](#15-复盘归档)
16. [非功能需求](#16-非功能需求)
17. [实施路线图](#17-实施路线图)

---

## 1. 文档概述

### 1.1 项目背景

TaskHub 当前已具备任务管理、看板、文档管理、绘图、AI 汇报等基础能力，但在项目初期工作支撑方面仍存在断点，例如实施方案编制、项目计划生成、原型设计、需求拆解、交付闭环等流程尚未形成统一链路。

本次重构目标是将 TaskHub 升级为面向全栈开发者的**项目全生命周期工作台**，支持从项目启动、调研、方案、原型、计划、开发、测试、交付到复盘的完整闭环。

### 1.2 项目目标

1. **项目全流程支撑** — 支持从项目开始到交付归档的完整工作链路。
2. **产物驱动工作流** — 将实施方案、计划、原型、流程图、任务、汇报等统一纳入项目产物管理。
3. **强化全栈开发场景** — 支持需求分析、方案设计、原型演示、任务拆解、接口管理、测试交付等开发全流程。
4. **AI 深度融入项目上下文** — AI 不再只是汇报生成工具，而是项目 Copilot，可辅助生成文档、流程图、原型、任务、计划和汇报。
5. **保持轻量交互** — 通过模板、项目阶段、快捷操作、渐进式展开降低使用负担。

### 1.3 系统范围

覆盖以下 12 个功能模块：

| 序号 | 模块 | 说明 |
|---|---|---|
| 1 | 工作台 | 系统首页，展示当前最重要的工作 |
| 2 | 项目管理 | 项目创建、信息维护、状态管理 |
| 3 | 项目阶段管理 | 8 个标准阶段的展示与推进 |
| 4 | 产物中心 | 统一管理所有项目交付物 |
| 5 | 文档模板管理 | 模板引擎与一键生成 |
| 6 | 原型设计 | HTML 原型文件管理与预览 |
| 7 | 项目计划 | 里程碑、任务包、排期 |
| 8 | 任务与看板 | 任务管理与看板执行 |
| 9 | 接口与技术资料管理 | 接口清单、环境地址、技术文档 |
| 10 | AI 项目助手 | 上下文感知的 AI 辅助能力 |
| 11 | 汇报中心 | 日报/周报/阶段汇报/交付汇报 |
| 12 | 复盘归档 | 项目归档与经验沉淀 |

### 1.4 用户角色

单人使用优先，数据模型和接口预留多用户扩展能力。

### 1.5 术语定义

| 术语 | 定义 |
|---|---|
| 项目（Project） | 系统核心对象，包含完整生命周期的工作单元 |
| 阶段（Phase） | 项目推进的标准步骤，共 8 个标准阶段 |
| 产物（Artifact） | 项目过程中产生的关键交付物，包括文档、表格、流程图、原型、计划、汇报、复盘 |
| 任务（Task） | 最小执行单元，关联产物和阶段 |
| 模板（Template） | 可复用的文档结构和内容框架 |
| 里程碑（Milestone） | 项目计划中的关键节点 |
| 干系人（Stakeholder） | 与项目相关的外部人员（甲方、技术对接人等） |
| 产物状态 | 产物在其生命周期中的状态标识 |

### 1.6 建设模式

```
Web First → PWA 增强 → Tauri 桌面端扩展
```

第一阶段不做纯桌面端，优先完成核心 Web 工作流。

---

## 2. 产品定位与设计原则

### 2.1 产品定位

> **面向全栈开发者的项目交付工作台。**

### 2.2 核心理念

```
以项目为中心
以阶段为路径
以产物为核心
以 AI 为推进器
以任务为执行层
```

系统不单纯管理任务，而是围绕项目交付过程管理所有关键产物和执行动作。

### 2.3 交互设计原则

#### 2.3.1 项目优先

用户进入系统后优先看到项目，而不是一堆功能模块。

推荐主路径：

```
进入 TaskHub → 选择项目 → 查看当前阶段 → 继续处理产物或任务
```

#### 2.3.2 产物驱动

系统围绕项目产物推进工作，而不是单纯围绕任务。

```
实施方案 → 生成流程图 → 生成 HTML 原型 → 生成开发任务 → 生成项目计划 → 进入看板执行
```

#### 2.3.3 渐进式展开

不要一次展示所有复杂功能。

项目初期只展示：项目背景、调研资料、实施方案、待确认事项。

进入开发阶段后再展示：原型、任务、接口、计划、测试。

#### 2.3.4 AI 作为动作

AI 不应只是一个聊天窗口，而应成为当前页面的操作能力。

```
当前在实施方案页面：
├── 补全当前章节
├── 优化文字
├── 生成待确认事项
├── 拆解开发任务
└── 生成汇报摘要
```

#### 2.3.5 桌面级 Web 体验

第一阶段采用 Web 实现，但交互按桌面软件标准设计：

- 自动保存
- 快捷键
- 命令面板
- 多栏布局
- 右侧 AI 侧边栏
- 拖拽排序
- 实时预览
- 全局搜索
- 最近访问
- 本地草稿缓存

### 2.4 技术栈选型

| 层 | 技术 | 说明 |
|---|---|---|
| 前端框架 | Next.js + React + TypeScript | 全栈框架，SSR/SSG 支持 |
| UI 样式 | Tailwind CSS + shadcn/ui | 原子化 CSS + 高质量组件库 |
| 富文本编辑器 | TipTap | 基于 ProseMirror 的可扩展编辑器 |
| 拖拽 | dnd-kit | 轻量级拖拽库 |
| 表格 | TanStack Table | 无头表格组件 |
| 流程图 | React Flow / Mermaid | 交互式流程图 / 文本式图表 |
| 状态管理 | Zustand | 轻量级状态管理 |
| 后端 | Next.js API Routes | 与前端同框架，减少技术栈数量 |
| 数据库 | PostgreSQL | 可靠的关系型数据库 |
| ORM | Prisma | 类型安全的 ORM |
| AI 服务 | 外部 API（OpenAI / Claude） | 服务端统一封装，支持模型切换 |
| 文件存储 | 对象存储 / 本地存储 | 支持后续切换 |
| 后续扩展 | PWA → Tauri | 渐进式桌面端支持 |

---

## 3. 全局数据模型

### 3.1 用户与干系人

#### User（用户）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| email | String | 邮箱，唯一 |
| name | String | 用户名 |
| avatar | String? | 头像 URL |
| role | UserRole | 系统角色：admin / member / viewer |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

#### Stakeholder（干系人）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| projectId | UUID → Project | 所属项目 |
| name | String | 干系人姓名 |
| role | String | 角色（甲方负责人、技术对接人、业务负责人等） |
| organization | String? | 所属组织 |
| contact | String? | 联系方式（电话/微信/邮箱） |
| isExternal | Boolean | 是否外部人员 |
| notes | Text? | 备注 |
| createdAt | DateTime | 创建时间 |

#### ProjectMember（项目成员）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| projectId | UUID → Project | 所属项目 |
| userId | UUID → User | 关联用户 |
| role | ProjectRole | 项目角色：owner / developer / tester / designer / viewer |
| joinedAt | DateTime | 加入时间 |

### 3.2 项目

#### Project（项目）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| name | String | 项目名称 |
| description | Text | 项目描述 |
| type | ProjectType | 项目类型 |
| status | ProjectStatus | 项目状态 |
| currentPhaseId | UUID? → Phase | 当前阶段 |
| priority | ProjectPriority | 优先级 |
| startDate | Date? | 计划开始日期 |
| endDate | Date? | 计划结束日期 |
| actualEndDate | Date? | 实际结束日期 |
| background | Text? | 项目背景 |
| objectives | Text? | 项目目标 |
| scope | Text? | 建设范围 |
| tags | String[] | 标签 |
| coverImage | String? | 封面图 |
| createdById | UUID → User | 创建者 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |
| archivedAt | DateTime? | 归档时间 |

### 3.3 阶段

#### Phase（阶段）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| projectId | UUID → Project | 所属项目 |
| type | PhaseType | 阶段类型（8 种） |
| name | String | 阶段名称 |
| description | Text? | 阶段描述 |
| status | PhaseStatus | 阶段状态 |
| order | Int | 阶段顺序 |
| startDate | Date? | 开始日期 |
| endDate | Date? | 结束日期 |
| completedAt | DateTime? | 完成时间 |
| sortOrder | Int | 排序权重 |

### 3.4 产物（通用）

#### Artifact（产物）

产物由任务驱动产生，每个产物必须关联至少一个来源任务。产物不会孤立存在，而是任务执行的交付结果。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| projectId | UUID → Project | 所属项目 |
| phaseId | UUID? → Phase | 关联阶段 |
| sourceTaskId | UUID → Task | 来源任务（产物由该任务产出） |
| type | ArtifactType | 产物类型 |
| title | String | 标题 |
| status | ArtifactStatus | 产物状态 |
| version | Int | 当前版本号（默认 1） |
| createdById | UUID → User | 创建者 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

#### ArtifactVersion（产物版本）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| artifactId | UUID → Artifact | 所属产物 |
| version | Int | 版本号 |
| content | JSON | 版本内容快照 |
| changeNote | Text? | 变更说明 |
| createdById | UUID → User | 创建者 |
| createdAt | DateTime | 创建时间 |

### 3.5 文档

#### Document（文档）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| artifactId | UUID → Artifact | 关联产物 |
| templateId | UUID? → Template | 来源模板 |
| content | Text | 文档内容（HTML/Rich Text） |
| wordCount | Int | 字数统计 |
| lastEditedAt | DateTime | 最后编辑时间 |

### 3.6 表格类产物

#### RequirementItem（需求条目 / 功能清单）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| artifactId | UUID → Artifact | 关联产物 |
| module | String | 所属模块 |
| name | String | 功能名称 |
| description | Text? | 功能描述 |
| priority | TaskPriority | 优先级 |
| status | RequirementStatus | 状态：proposed / confirmed / rejected / deferred |
| sortOrder | Int | 排序 |

#### PendingItem（待确认事项）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| artifactId | UUID → Artifact | 关联产物 |
| category | String | 分类（需求确认、技术方案、业务规则、界面设计等） |
| question | Text | 待确认问题 |
| answer | Text? | 答复 |
| status | PendingStatus | 状态：open / answered / cancelled |
| raisedAt | DateTime | 提出时间 |
| resolvedAt | DateTime? | 解决时间 |

#### DataDictionary（数据字典）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| artifactId | UUID → Artifact | 关联产物 |
| tableName | String | 表名 |
| fieldName | String | 字段名 |
| fieldType | String | 字段类型 |
| description | Text? | 说明 |
| isPrimaryKey | Boolean | 是否主键 |
| isNullable | Boolean | 是否可空 |
| defaultValue | String? | 默认值 |
| sortOrder | Int | 排序 |

### 3.7 流程图

#### FlowDiagram（流程图）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| artifactId | UUID → Artifact | 关联产物 |
| flowType | FlowType | 流程图类型：business / system / data / user |
| svgContent | Text? | SVG 源码 |
| jsonData | JSON? | React Flow 节点数据 |
| mermaidSource | Text? | Mermaid 语法源码 |

### 3.8 原型

原型以 HTML 文件形式存储在项目 `prototype/` 目录下，支持浏览器直接预览。不做可视化编辑器，交互逻辑由 HTML 自身实现。

#### Prototype（原型）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| artifactId | UUID → Artifact | 关联产物 |
| description | Text? | 原型说明 |
| filePath | String | HTML 文件存储路径 |
| previewUrl | String? | 预览地址 |

### 3.9 任务

#### Task（任务）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| projectId | UUID → Project | 所属项目 |
| phaseId | UUID? → Phase | 关联阶段 |
| parentTaskId | UUID? → Task | 父任务（子任务支持） |
| milestoneId | UUID? → Milestone | 关联里程碑 |
| title | String | 任务标题 |
| description | Text? | 任务描述 |
| type | TaskType | 任务类型 |
| status | TaskStatus | 任务状态 |
| priority | TaskPriority | 优先级 |
| assigneeId | UUID? → User | 负责人 |
| estimatedHours | Float? | 预估工时 |
| actualHours | Float? | 实际工时 |
| startDate | Date? | 开始日期 |
| dueDate | Date? | 截止日期 |
| completedAt | DateTime? | 完成时间 |
| tags | String[] | 标签 |
| acceptanceCriteria | Text? | 验收标准 |
| sortOrder | Int | 排序 |
| createdById | UUID → User | 创建者 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

#### TaskArtifactLink（任务关联）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| taskId | UUID → Task | 关联任务 |
| artifactId | UUID? → Artifact | 关联产物 |
| apiEndpointId | UUID? → ApiEndpoint | 关联接口 |
| linkType | TaskLinkType | 关联类型：source / reference / blocked_by |

### 3.10 计划与里程碑

#### Plan（计划）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| projectId | UUID → Project | 所属项目 |
| name | String | 计划名称 |
| description | Text? | 计划描述 |
| status | PlanStatus | 状态：draft / active / completed |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

#### Milestone（里程碑）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| planId | UUID → Plan | 所属计划 |
| projectId | UUID → Project | 所属项目 |
| name | String | 里程碑名称 |
| description | Text? | 描述 |
| dueDate | Date | 目标日期 |
| status | MilestoneStatus | 状态：pending / in_progress / completed / overdue |
| completedAt | DateTime? | 完成时间 |
| sortOrder | Int | 排序 |

#### TaskPackage（任务包）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| planId | UUID → Plan | 所属计划 |
| milestoneId | UUID? → Milestone | 关联里程碑 |
| name | String | 任务包名称（前端开发、后端开发、接口对接等） |
| description | Text? | 描述 |
| sortOrder | Int | 排序 |

### 3.11 接口与技术资料

#### ApiEndpoint（接口）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| projectId | UUID → Project | 所属项目 |
| module | String | 所属模块 |
| name | String | 接口名称 |
| method | HttpMethod | 请求方式：GET / POST / PUT / DELETE / PATCH |
| path | String | 请求路径 |
| description | Text? | 接口描述 |
| requestParams | JSON? | 请求参数定义 |
| requestBody | JSON? | 请求体示例 |
| responseBody | JSON? | 返回示例 |
| status | ApiStatus | 接口状态 |
| authRequired | Boolean | 是否需要认证 |
| notes | Text? | 备注 |
| createdById | UUID → User | 创建者 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

#### Environment（环境地址）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| projectId | UUID → Project | 所属项目 |
| name | String | 环境名称 |
| type | EnvironmentType | 环境类型：dev / test / staging / production |
| baseUrl | String | 基础 URL |
| description | Text? | 描述 |
| isActive | Boolean | 是否启用 |

#### ExternalLink（外部链接）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| projectId | UUID → Project | 所属项目 |
| name | String | 链接名称 |
| url | String | 链接地址 |
| category | String | 分类（第三方服务、文档地址、管理后台、设计稿等） |
| description | Text? | 描述 |

#### TechnicalDoc（技术文档）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| projectId | UUID → Project | 所属项目 |
| title | String | 标题 |
| type | TechDocType | 类型：architecture / deployment / database / integration / troubleshooting |
| content | Text | 内容 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### 3.12 模板

#### Template（模板）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| name | String | 模板名称 |
| category | TemplateCategory | 模板分类 |
| description | Text? | 模板描述 |
| content | Text | 模板内容（HTML/Markdown） |
| variables | JSON | 模板变量定义 |
| isBuiltIn | Boolean | 是否内置模板 |
| isSystem | Boolean | 是否系统模板（不可删除） |
| createdById | UUID? → User | 创建者 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### 3.13 文件与附件

#### FileAttachment（文件附件）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| projectId | UUID → Project | 所属项目 |
| artifactId | UUID? → Artifact | 关联产物 |
| taskId | UUID? → Task | 关联任务 |
| fileName | String | 文件名 |
| fileSize | Int | 文件大小（字节） |
| mimeType | String | MIME 类型 |
| storagePath | String | 存储路径 |
| uploadedById | UUID → User | 上传者 |
| createdAt | DateTime | 上传时间 |

### 3.14 AI 对话

#### AIConversation（AI 对话）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| projectId | UUID? → Project | 关联项目 |
| artifactId | UUID? → Artifact | 关联产物 |
| taskId | UUID? → Task | 关联任务 |
| title | String? | 对话标题 |
| context | JSON? | 对话上下文（关联的项目、阶段、产物信息） |
| createdById | UUID → User | 创建者 |
| createdAt | DateTime | 创建时间 |

#### AIMessage（AI 消息）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| conversationId | UUID → AIConversation | 所属对话 |
| role | MessageRole | 角色：user / assistant / system |
| content | Text | 消息内容 |
| metadata | JSON? | 元数据（token count、model 等） |
| createdAt | DateTime | 创建时间 |

### 3.15 汇报

#### Report（汇报）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| artifactId | UUID → Artifact | 关联产物 |
| reportType | ReportType | 汇报类型：daily / weekly / phase / delivery |
| periodStart | Date? | 统计周期开始 |
| periodEnd | Date? | 统计周期结束 |
| content | Text | 汇报内容 |
| dataSources | JSON? | 数据来源（已完成任务、产物进展等） |
| generatedByAI | Boolean | 是否 AI 生成 |

### 3.16 复盘

#### Review（复盘）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| artifactId | UUID → Artifact | 关联产物 |
| projectObjectives | Text? | 项目目标 |
| actualResults | Text? | 实际完成情况 |
| achievements | Text? | 主要成果 |
| problems | Text? | 遇到的问题 |
| solutions | Text? | 解决方案 |
| reusableTemplates | Text? | 可复用模板 |
| improvementSuggestions | Text? | 后续改进建议 |

### 3.17 活动日志

#### ActivityLog（活动日志）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| projectId | UUID → Project | 所属项目 |
| userId | UUID → User | 操作用户 |
| entityType | String | 实体类型（project / phase / artifact / task 等） |
| entityId | UUID | 实体 ID |
| action | String | 操作类型（created / updated / deleted / status_changed 等） |
| changes | JSON? | 变更详情 |
| createdAt | DateTime | 操作时间 |

### 3.18 完整枚举值表

| 枚举 | 值 |
|---|---|
| UserRole | admin, member, viewer |
| ProjectRole | owner, developer, tester, designer, viewer |
| ProjectType | government, admin, miniapp, dashboard, mall, tourism, health, custom |
| ProjectStatus | active, paused, completed, archived |
| ProjectPriority | urgent, high, medium, low |
| PhaseType | lead, research, design, prototype, planning, development, testing, review |
| PhaseStatus | pending, in_progress, completed, skipped |
| ArtifactType | document, table, flowchart, prototype, plan, report, review |
| ArtifactStatus | draft, pending_confirm, confirmed, in_dev, delivered, archived |
| RequirementStatus | proposed, confirmed, rejected, deferred |
| PendingStatus | open, answered, cancelled |
| FlowType | business, system, data, user |
| TaskType | development, design, testing, documentation, deployment, coordination |
| TaskStatus | todo, in_progress, pending_review, pending_test, done, closed |
| TaskPriority | urgent, high, medium, low |
| TaskLinkType | source, reference, blocked_by |
| PlanStatus | draft, active, completed |
| MilestoneStatus | pending, in_progress, completed, overdue |
| HttpMethod | GET, POST, PUT, DELETE, PATCH |
| ApiStatus | pending_confirm, pending_dev, in_dev, pending_integration, completed, deprecated |
| EnvironmentType | dev, test, staging, production |
| TechDocType | architecture, deployment, database, integration, troubleshooting |
| TemplateCategory | implementation_plan, research_note, project_plan, prototype_spec, api_doc, test_plan, acceptance_report, weekly_report, retrospective |
| ReportType | daily, weekly, phase, delivery |
| MessageRole | user, assistant, system |

### 3.19 核心关系

```
Project 1:N Phase
Project 1:N Artifact
Project 1:N Task
Project 1:N Plan
Project 1:N ApiEndpoint
Project 1:N Environment
Project 1:N ExternalLink
Project 1:N TechnicalDoc
Project 1:N FileAttachment
Project 1:N AIConversation
Project 1:N Stakeholder
Project 1:N ProjectMember
Project 1:N ActivityLog

Phase 1:N Artifact
Phase 1:N Task

Task 1:N Artifact (sourceTaskId，产物由任务产出)

Artifact 1:1 Document (type=document)
Artifact 1:N RequirementItem (type=table)
Artifact 1:N PendingItem (type=table)
Artifact 1:N DataDictionary (type=table)
Artifact 1:1 FlowDiagram (type=flowchart)
Artifact 1:1 Prototype (type=prototype)
Artifact 1:1 Report (type=report)
Artifact 1:1 Review (type=review)
Artifact N:1 Template

Task 1:N Task (自关联，子任务)
Task N:N Artifact (通过 TaskArtifactLink)
Task N:N ApiEndpoint (通过 TaskArtifactLink)
Task N:1 Milestone

Plan 1:N Milestone
Plan 1:N TaskPackage

AIConversation 1:N AIMessage
```

---

## 4. 工作台

### 4.1 模块概述

工作台是系统首页，展示用户当前最重要的工作内容。解决"打开 TaskHub 后应该推进什么"的问题。

### 4.2 功能需求

| 编号 | 功能 | 优先级 | 说明 |
|---|---|---|---|
| WB-01 | 今日任务展示 | P0 | 显示当天到期和进行中的任务，按优先级排序，最多 10 条 |
| WB-02 | 进行中项目卡片 | P0 | 展示活跃项目及其当前阶段，最多 6 个 |
| WB-03 | 最近编辑产物 | P0 | 展示最近修改的产物列表 |
| WB-04 | 待确认事项提醒 | P1 | 展示未解决的待确认事项数量 |
| WB-05 | AI 快捷入口 | P0 | 一键进入 AI 助手或发起快捷操作 |
| WB-06 | 项目风险提醒 | P1 | 超期任务、停滞项目等风险预警 |
| WB-07 | 最近汇报记录 | P1 | 展示最近生成的汇报列表 |
| WB-08 | 快速新建项目 | P0 | 一键创建新项目入口 |
| WB-09 | 最近访问记录 | P2 | 快速回到最近查看的项目/产物 |

### 4.3 用户故事

- **WB-US-01：** 作为用户，我希望打开系统就能看到今日待处理的任务，以便快速进入工作状态。
- **WB-US-02：** 作为用户，我希望看到进行中的项目及其当前阶段，以便了解整体进度。
- **WB-US-03：** 作为用户，我希望看到待确认事项提醒，以免遗漏需要跟进的问题。
- **WB-US-04：** 作为用户，我希望看到风险提醒（如超期任务），以便及时处理异常。

### 4.4 验收标准

- **WB-AC-01：** Given 用户登录系统，When 进入工作台，Then 展示今日到期任务列表，按优先级排序，最多显示 10 条。
- **WB-AC-02：** Given 用户有进行中项目，When 进入工作台，Then 展示项目卡片（名称、类型、当前阶段、进度百分比），最多显示 6 个。
- **WB-AC-03：** Given 存在超期未完成的任务，When 进入工作台，Then 在风险提醒区域展示超期任务数量和项目。
- **WB-AC-04：** Given 用户点击项目卡片，When 跳转至项目空间首页，Then 正确展示该项目概览。

### 4.5 接口设计

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/dashboard/today-tasks | 获取今日任务 |
| GET | /api/dashboard/active-projects | 获取进行中项目 |
| GET | /api/dashboard/recent-artifacts | 获取最近编辑产物 |
| GET | /api/dashboard/pending-items | 获取待确认事项数量 |
| GET | /api/dashboard/risks | 获取风险提醒 |
| GET | /api/dashboard/recent-reports | 获取最近汇报 |
| GET | /api/dashboard/recent-visits | 获取最近访问记录 |

### 4.6 UI 交互说明

- 工作台采用卡片式网格布局，响应式排列
- 顶部为问候语 + 日期 + 快速新建按钮
- 中间区域为可拖拽排序的功能卡片
- 每个卡片支持折叠/展开
- 点击卡片内条目直接跳转对应详情页

---

## 5. 项目管理

### 5.1 模块概述

项目是系统的核心对象。项目管理模块负责项目的创建、信息维护、状态管理和归档。

### 5.2 功能需求

| 编号 | 功能 | 优先级 | 说明 |
|---|---|---|---|
| PM-01 | 新建项目 | P0 | 填写基础信息、选择类型，向导模式 |
| PM-02 | 项目基础信息维护 | P0 | 名称、描述、背景、目标、范围，支持自动保存 |
| PM-03 | 项目类型选择 | P0 | 政务/后台/小程序/看板/商城/文旅/医疗/自定义 |
| PM-04 | 项目状态管理 | P0 | 进行中/暂停/已完成/已归档 |
| PM-05 | 项目优先级设置 | P1 | 紧急/高/中/低 |
| PM-06 | 干系人管理 | P0 | 添加/编辑项目干系人信息（姓名、角色、组织、联系方式） |
| PM-07 | 项目成员管理 | P2 | 预留，当前版本自动关联创建者 |
| PM-08 | 项目归档 | P1 | 将已完成项目归档，移入归档列表 |
| PM-09 | 项目搜索 | P0 | 按名称、类型、状态、标签搜索，实时过滤 |
| PM-10 | 项目列表视图 | P0 | 卡片视图和列表视图切换 |
| PM-11 | 项目标签管理 | P1 | 自定义标签分类 |
| PM-12 | 项目时间线 | P1 | 展示项目起止时间和关键节点 |

### 5.3 用户故事

- **PM-US-01：** 作为用户，我希望能快速创建一个项目并选择类型，以便系统推荐合适的阶段和模板。
- **PM-US-02：** 作为用户，我希望记录项目的干系人信息（甲方、技术对接人等），以便在需要时快速联系。
- **PM-US-03：** 作为用户，我希望通过搜索和标签快速找到目标项目。
- **PM-US-04：** 作为用户，我希望归档已完成的项目，保持项目列表整洁。

### 5.4 验收标准

- **PM-AC-01：** Given 用户点击新建项目，When 填写名称和选择类型后提交，Then 项目创建成功并自动初始化 8 个标准阶段。
- **PM-AC-02：** Given 项目已创建，When 编辑项目信息，Then 所有字段实时保存（自动保存，3 秒无操作后触发）。
- **PM-AC-03：** Given 用户输入搜索关键词，When 搜索框输入，Then 实时过滤项目列表（名称、标签模糊匹配）。
- **PM-AC-04：** Given 项目状态为"已完成"，When 用户点击归档，Then 项目移入归档列表，不在活跃项目中显示。

### 5.5 接口设计

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/projects | 获取项目列表（支持筛选/搜索/分页） |
| POST | /api/projects | 创建项目 |
| GET | /api/projects/:id | 获取项目详情 |
| PUT | /api/projects/:id | 更新项目信息 |
| DELETE | /api/projects/:id | 删除项目 |
| POST | /api/projects/:id/archive | 归档项目 |
| POST | /api/projects/:id/unarchive | 取消归档 |
| GET | /api/projects/:id/stakeholders | 获取干系人列表 |
| POST | /api/projects/:id/stakeholders | 添加干系人 |
| PUT | /api/projects/:id/stakeholders/:sid | 更新干系人 |
| DELETE | /api/projects/:id/stakeholders/:sid | 删除干系人 |

### 5.6 UI 交互说明

- 项目列表默认卡片视图，每个卡片显示：名称、类型标签、当前阶段、进度条、优先级标识
- 支持切换为列表视图（表格形式）
- 新建项目采用向导模式：第一步基础信息 → 第二步选择类型 → 第三步可选导入资料 → 完成
- 项目详情页采用 Tab 式布局：概览 | 阶段 | 产物 | 任务 | 干系人 | 设置

---

## 6. 项目阶段管理

### 6.1 模块概述

系统内置 8 个标准项目阶段，用于驱动项目闭环。阶段管理模块负责阶段的展示、推进和产物关联。

### 6.2 标准阶段定义

| 序号 | 阶段 | 英文名 | 说明 |
|---|---|---|---|
| 1 | 项目线索 | Lead | 项目初始信息记录 |
| 2 | 调研梳理 | Research | 需求调研和梳理 |
| 3 | 方案设计 | Design | 实施方案和技术方案设计 |
| 4 | 原型设计 | Prototype | HTML 原型文件与预览 |
| 5 | 计划排期 | Planning | 里程碑和任务排期 |
| 6 | 开发实施 | Development | 编码开发和接口对接 |
| 7 | 测试交付 | Testing | 测试验收和交付 |
| 8 | 复盘归档 | Review | 项目复盘和归档 |

### 6.3 功能需求

| 编号 | 功能 | 优先级 | 说明 |
|---|---|---|---|
| PH-01 | 阶段进度展示 | P0 | 展示 8 个阶段的当前状态 |
| PH-02 | 阶段推进 | P0 | 手动将当前阶段推进到下一阶段 |
| PH-03 | 阶段产物关联 | P0 | 每个阶段展示关联的产物列表 |
| PH-04 | 阶段任务关联 | P0 | 每个阶段展示关联的任务 |
| PH-05 | 阶段跳过 | P1 | 允许跳过不适用的阶段 |
| PH-06 | 阶段检查清单 | P1 | 每个阶段有推荐产物检查清单 |
| PH-07 | 阶段时间记录 | P1 | 记录每个阶段的起止时间 |

### 6.4 阶段与推荐产物映射

| 阶段 | 推荐产物 |
|---|---|
| 项目线索 | 项目卡片、初始需求 |
| 调研梳理 | 调研纪要、需求清单、业务流程 |
| 方案设计 | 实施方案、建设内容、待确认事项 |
| 原型设计 | HTML 原型文件、预览链接 |
| 计划排期 | 里程碑、任务包、开发计划 |
| 开发实施 | 任务看板、接口清单、技术文档 |
| 测试交付 | 测试清单、问题清单、交付材料 |
| 复盘归档 | 复盘报告、最终资料包 |

### 6.5 用户故事

- **PH-US-01：** 作为用户，我希望看到项目当前处于哪个阶段，以便聚焦当前工作。
- **PH-US-02：** 作为用户，我希望了解每个阶段推荐产出什么，以免遗漏关键交付物。
- **PH-US-03：** 作为用户，我希望能跳过不适用的阶段，保持灵活性。

### 6.6 验收标准

- **PH-AC-01：** Given 项目已创建，When 进入阶段页面，Then 展示 8 个阶段的进度条/流程图，当前阶段高亮。
- **PH-AC-02：** Given 当前阶段为"方案设计"，When 用户点击推进到下一阶段，Then 当前阶段标记为已完成，下一阶段变为进行中。
- **PH-AC-03：** Given 某阶段有未完成的推荐产物，When 用户尝试推进阶段，Then 弹出提示"以下推荐产物尚未创建，是否继续？"

### 6.7 接口设计

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/projects/:id/phases | 获取项目阶段列表 |
| PUT | /api/projects/:id/phases/:pid | 更新阶段状态 |
| POST | /api/projects/:id/phases/:pid/advance | 推进阶段 |
| POST | /api/projects/:id/phases/:pid/skip | 跳过阶段 |
| GET | /api/projects/:id/phases/:pid/artifacts | 获取阶段关联产物 |
| GET | /api/projects/:id/phases/:pid/tasks | 获取阶段关联任务 |
| GET | /api/projects/:id/phases/:pid/checklist | 获取阶段检查清单 |

### 6.8 UI 交互说明

- 阶段进度采用水平步骤条展示，已完成阶段显示对勾，当前阶段高亮
- 点击阶段可展开该阶段的详情面板：关联产物、关联任务、时间记录
- 阶段推进按钮位于当前阶段卡片底部
- 阶段检查清单以可折叠列表形式展示在阶段详情中

---

## 7. 产物中心

### 7.1 模块概述

产物中心是本次重构的核心模块，统一管理项目过程中产生的所有关键交付物：文档、表格、流程图、原型、计划、汇报、复盘。

### 7.2 功能需求

| 编号 | 功能 | 优先级 | 说明 |
|---|---|---|---|
| AC-01 | 创建产物 | P0 | 选择类型、填写标题、关联阶段 |
| AC-02 | 产物列表 | P0 | 按类型/阶段/状态筛选 |
| AC-03 | 产物状态管理 | P0 | 草稿→待确认→已确认→开发中引用→已交付→已归档 |
| AC-04 | 产物版本管理 | P1 | 每次重大修改保存版本快照 |
| AC-05 | 从模板创建产物 | P0 | 选择模板一键生成 |
| AC-06 | AI 辅助生成产物 | P0 | AI 根据项目上下文生成产物内容 |
| AC-07 | 产物关联任务 | P0 | 将产物与任务绑定 |
| AC-08 | 产物导出 | P2 | 导出为 PDF / Word / Markdown |
| AC-09 | 产物归档 | P1 | 项目归档时统一归档所有产物 |
| AC-10 | 产物搜索 | P1 | 按标题、类型、内容全文搜索 |
| AC-11 | 产物统计 | P2 | 展示各类型产物数量和状态分布 |

### 7.3 产物状态流转

```
草稿 → 待确认 → 已确认 → 开发中引用 → 已交付 → 已归档
```

### 7.4 用户故事

- **AC-US-01：** 作为用户，我希望在一个地方看到项目的所有交付物，以便了解项目产出情况。
- **AC-US-02：** 作为用户，我希望通过模板快速生成标准化文档，提高效率。
- **AC-US-03：** 作为用户，我希望 AI 能根据项目资料自动生成方案初稿，减少重复劳动。
- **AC-US-04：** 作为用户，我希望产物有版本记录，以便回溯历史修改。

### 7.5 验收标准

- **AC-AC-01：** Given 用户在项目空间内，When 点击新建产物，Then 弹出产物类型选择面板（文档/表格/流程图/原型/计划/汇报/复盘）。
- **AC-AC-02：** Given 产物已创建，When 切换产物状态，Then 状态按流程流转（不可跳过中间状态，除非管理员强制设置）。
- **AC-AC-03：** Given 用户选择模板创建文档，When 选择模板并确认，Then 基于模板内容和项目变量自动生成文档初稿。
- **AC-AC-04：** Given 产物被编辑并保存，When 用户手动创建版本快照，Then 当前内容保存为新版本，版本号递增。

### 7.6 接口设计

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/projects/:id/artifacts | 获取产物列表（支持筛选） |
| POST | /api/projects/:id/artifacts | 创建产物 |
| GET | /api/artifacts/:id | 获取产物详情 |
| PUT | /api/artifacts/:id | 更新产物 |
| DELETE | /api/artifacts/:id | 删除产物 |
| PUT | /api/artifacts/:id/status | 更新产物状态 |
| POST | /api/artifacts/:id/version | 创建版本快照 |
| GET | /api/artifacts/:id/versions | 获取版本历史 |
| GET | /api/artifacts/:id/versions/:vid | 获取指定版本内容 |
| POST | /api/artifacts/:id/generate | AI 生成产物内容 |
| POST | /api/artifacts/:id/export | 导出产物 |

### 7.7 UI 交互说明

- 产物列表默认按创建时间倒序，支持按类型 Tab 切换筛选
- 每个产物卡片显示：标题、类型图标、状态标签、关联阶段、更新时间
- 产物详情页采用三栏布局：左侧目录/结构树 | 中间编辑区 | 右侧 AI 侧边栏（可折叠）
- 产物状态以彩色标签形式展示在卡片右上角

---

## 8. 文档模板管理

### 8.1 模块概述

文档模板用于提高方案、计划、报告等产物的生成效率。支持模板变量、一键生成、AI 辅助填充。

### 8.2 功能需求

| 编号 | 功能 | 优先级 | 说明 |
|---|---|---|---|
| TM-01 | 模板分类管理 | P0 | 按用途分类（方案/计划/报告/其他） |
| TM-02 | 模板新增/编辑 | P0 | 富文本编辑器编辑模板内容 |
| TM-03 | 模板变量配置 | P0 | 定义模板中可替换的变量（如 `{{项目名称}}`） |
| TM-04 | 一键生成文档 | P0 | 选择模板 + 填入变量值 → 生成文档 |
| TM-05 | AI 自动填充变量 | P1 | AI 根据项目上下文自动推断变量值 |
| TM-06 | 文档预览 | P0 | 生成前预览文档效果 |
| TM-07 | 内置模板管理 | P0 | 系统预置常用模板，不可删除但可隐藏 |
| TM-08 | 自定义模板 | P1 | 用户创建和管理自己的模板 |
| TM-09 | 模板导出/导入 | P2 | 模板可在项目间复用 |

### 8.3 内置模板清单

| 模板名称 | 分类 | 核心变量 |
|---|---|---|
| 实施方案模板 | 方案 | 项目名称、建设背景、建设内容、功能清单、技术方案、实施计划 |
| 调研纪要模板 | 调研 | 调研对象、调研时间、调研内容、关键发现、待确认事项 |
| 项目计划模板 | 计划 | 项目名称、里程碑、任务包、开发周期、交付物清单 |
| 原型说明模板 | 原型 | 应用名称、页面结构、核心功能说明、交互说明 |
| 接口文档模板 | 技术 | 模块名称、接口列表、请求/响应格式、错误码 |
| 测试方案模板 | 测试 | 测试范围、测试用例、测试环境、验收标准 |
| 验收报告模板 | 交付 | 项目概述、完成情况、交付清单、遗留问题 |
| 周报模板 | 汇报 | 本周完成、下周计划、风险问题、待协调事项 |
| 项目复盘模板 | 复盘 | 项目目标、实际结果、经验教训、改进建议 |

### 8.4 模板变量示例

```
{{项目名称}}
{{应用名称}}
{{建设背景}}
{{建设内容}}
{{功能清单}}
{{业务流程}}
{{待确认事项}}
{{外部链接清单}}
{{项目计划}}
```

### 8.5 用户故事

- **TM-US-01：** 作为用户，我希望选择模板后一键生成标准化文档，不用每次从头写。
- **TM-US-02：** 作为用户，我希望 AI 能根据项目资料自动填充模板变量，进一步减少手动输入。
- **TM-US-03：** 作为用户，我希望管理自己的模板库，积累可复用的文档结构。

### 8.6 验收标准

- **TM-AC-01：** Given 用户选择"实施方案模板"，When 点击生成并确认变量值，Then 系统生成包含项目信息的实施方案初稿。
- **TM-AC-02：** Given 模板包含变量 `{{项目名称}}`，When 生成文档时，Then 变量自动替换为当前项目名称。
- **TM-AC-03：** Given AI 自动填充模式开启，When 生成文档，Then AI 根据项目已有资料推断变量值并标注置信度。

### 8.7 接口设计

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/templates | 获取模板列表（支持分类筛选） |
| POST | /api/templates | 创建模板 |
| GET | /api/templates/:id | 获取模板详情 |
| PUT | /api/templates/:id | 更新模板 |
| DELETE | /api/templates/:id | 删除模板（内置模板不可删除，只能隐藏） |
| POST | /api/templates/:id/generate | 基于模板生成文档 |
| POST | /api/templates/:id/fill-variables | AI 自动填充模板变量 |

### 8.8 UI 交互说明

- 模板库页面采用卡片网格展示，按分类 Tab 筛选
- 模板编辑器支持富文本 + 变量插入（点击插入变量占位符）
- 生成文档流程：选择模板 → 预览变量值（可修改）→ 预览文档 → 确认生成
- AI 填充的变量值以蓝色高亮标注，用户可逐一确认或修改

---

## 9. 原型设计

### 9.1 模块概述

原型以 HTML 文件形式产出，存储在项目 `prototype/` 目录下，支持浏览器直接预览。不做可视化拖拽编辑器，页面结构和交互逻辑均由 HTML 文件自身实现。原型作为项目产物纳入产物中心统一管理。

### 9.2 功能需求

| 编号 | 功能 | 优先级 | 说明 |
|---|---|---|---|
| PT-01 | 原型文件管理 | P0 | 管理 prototype/ 目录下的 HTML 文件 |
| PT-02 | 原型预览 | P0 | 在浏览器中直接预览 HTML 原型 |
| PT-03 | 原型列表 | P0 | 展示项目下所有原型，支持搜索和筛选 |
| PT-04 | AI 生成原型页面 | P1 | AI 根据方案生成 HTML 原型文件 |
| PT-05 | 从原型生成开发任务 | P1 | 将原型页面转化为开发任务 |
| PT-06 | 原型说明自动生成 | P2 | AI 为原型生成说明文字 |

### 9.3 文件存储结构

```
prototype/
├── index.html          # 原型列表/导航入口
├── page-home.html      # 首页原型
├── page-list.html      # 列表页原型
├── page-detail.html    # 详情页原型
└── assets/             # 原型公共资源（CSS、JS、图片）
    ├── style.css
    └── images/
```

### 9.4 用户故事

- **PT-US-01：** 作为用户，我希望能在项目中快速查看已有的 HTML 原型文件，以便预览和分享。
- **PT-US-02：** 作为用户，我希望 AI 能根据实施方案直接生成 HTML 原型文件，减少手动编写。
- **PT-US-03：** 作为用户，我希望从原型页面一键生成开发任务，打通设计到开发的链路。

### 9.5 验收标准

- **PT-AC-01：** Given 项目存在原型产物，When 点击预览，Then 在浏览器中打开对应 HTML 文件并可正常展示。
- **PT-AC-02：** Given 项目有实施方案，When 使用"AI 生成原型"功能，Then 生成 HTML 文件并存入 prototype/ 目录。
- **PT-AC-03：** Given 原型已确认，When 点击"生成开发任务"，Then 为原型创建对应的开发任务并关联到该产物。

### 9.6 接口设计

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/artifacts/:id/prototype | 获取原型信息 |
| PUT | /api/artifacts/:id/prototype | 更新原型信息 |
| GET | /api/prototypes/:id/preview | 获取原型预览地址 |
| POST | /api/prototypes/:id/generate | AI 生成 HTML 原型 |
| POST | /api/prototypes/:id/generate-tasks | 从原型生成开发任务 |

### 9.7 UI 交互说明

- 原型列表页展示所有 HTML 原型文件，显示名称、说明、状态、更新时间
- 每个原型卡片提供"预览"按钮，点击后在新标签页打开 HTML 文件
- 支持上传已有 HTML 文件或通过 AI 生成
- 预览通过 iframe 嵌入或新窗口打开

---

## 10. 项目计划

### 10.1 模块概述

计划模块将方案和原型转化为可执行安排，支持里程碑管理、任务包、排期和甘特图。

### 10.2 功能需求

| 编号 | 功能 | 优先级 | 说明 |
|---|---|---|---|
| PL-01 | 里程碑管理 | P0 | 创建/编辑/完成里程碑节点 |
| PL-02 | 任务包管理 | P0 | 按类别组织任务（前端/后端/测试/文档等） |
| PL-03 | 开发周期设置 | P0 | 设置项目起止时间和各阶段周期 |
| PL-04 | 任务排期 | P1 | 为任务分配起止时间和负责人 |
| PL-05 | 时间线视图 | P1 | 以时间线形式展示计划和进度 |
| PL-06 | 简易甘特图 | P2 | 按任务展示时间跨度（后续可扩展） |
| PL-07 | 从实施方案生成计划 | P1 | AI 根据方案自动拆解里程碑和任务包 |
| PL-08 | 从原型生成开发任务 | P1 | 将原型转化为排期任务 |
| PL-09 | 从任务看板同步进度 | P1 | 看板任务完成情况自动反映到计划 |
| PL-10 | 进度统计 | P2 | 展示整体完成百分比和偏差分析 |

### 10.3 计划结构示例

```
项目计划
├── 里程碑
│   ├── 需求确认
│   ├── 原型设计
│   ├── 开发实施
│   ├── 测试修复
│   └── 上线交付
└── 任务包
    ├── 前端开发
    ├── 后端开发
    ├── 接口对接
    ├── 测试验收
    └── 文档交付
```

### 10.4 用户故事

- **PL-US-01：** 作为用户，我希望设定关键里程碑，以便跟踪项目关键节点。
- **PL-US-02：** 作为用户，我希望将开发工作按任务包分组，以便合理分配工作量。
- **PL-US-03：** 作为用户，我希望 AI 根据实施方案自动生成计划初稿，减少排期工作量。

### 10.5 验收标准

- **PL-AC-01：** Given 项目已创建，When 创建里程碑并设置日期，Then 里程碑在时间线视图中正确展示。
- **PL-AC-02：** Given 里程碑已过期未完成，When 查看计划，Then 该里程碑标记为"逾期"并高亮。
- **PL-AC-03：** Given 使用"从方案生成计划"，When AI 生成完成，Then 展示里程碑和任务包草稿供用户调整确认。

### 10.6 接口设计

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/projects/:id/plans | 获取项目计划列表 |
| POST | /api/projects/:id/plans | 创建计划 |
| GET | /api/plans/:id | 获取计划详情 |
| PUT | /api/plans/:id | 更新计划 |
| GET | /api/plans/:id/milestones | 获取里程碑列表 |
| POST | /api/plans/:id/milestones | 创建里程碑 |
| PUT | /api/milestones/:mid | 更新里程碑 |
| DELETE | /api/milestones/:mid | 删除里程碑 |
| GET | /api/plans/:id/task-packages | 获取任务包列表 |
| POST | /api/plans/:id/task-packages | 创建任务包 |
| POST | /api/plans/:id/generate | AI 生成计划 |

### 10.7 UI 交互说明

- 计划页默认展示时间线视图，支持切换为列表视图
- 里程碑以菱形节点展示在时间线上
- 任务包以分组卡片形式展示，可展开查看子任务
- 甘特图采用横向条形图，支持拖拽调整时间范围
- 进度百分比以数字+进度条双重展示

---

## 11. 任务与看板

### 11.1 模块概述

任务是最小执行单元。任务模块保留现有看板能力，强化任务与产物、原型、接口的关联。

### 11.2 功能需求

| 编号 | 功能 | 优先级 | 说明 |
|---|---|---|---|
| TK-01 | 任务创建 | P0 | 标题、描述、类型、优先级、截止时间 |
| TK-02 | 子任务 | P0 | 支持任务的层级拆解 |
| TK-03 | 任务分组 | P0 | 按阶段/模块/任务包分组 |
| TK-04 | 看板视图 | P0 | 按状态分列展示 |
| TK-05 | 列表视图 | P0 | 表格形式展示任务 |
| TK-06 | 任务筛选 | P0 | 按状态/优先级/类型/标签/负责人筛选 |
| TK-07 | 任务关联产物 | P0 | 绑定来源产物或参考产物 |
| TK-08 | 任务关联原型 | P1 | 绑定对应的原型产物 |
| TK-09 | 任务关联接口 | P1 | 绑定对应的 API 接口 |
| TK-10 | 验收标准 | P1 | 为任务定义验收条件 |
| TK-11 | 任务标签 | P1 | 自定义标签分类 |
| TK-12 | 工时记录 | P2 | 预估工时和实际工时 |
| TK-13 | 从文档/原型/计划生成任务 | P1 | AI 辅助拆解任务 |
| TK-14 | 任务排序 | P0 | 拖拽排序和多种排序规则 |
| TK-15 | 批量操作 | P1 | 批量修改状态/优先级/标签 |

### 11.3 任务状态流转

```
待处理 → 进行中 → 待联调 → 待测试 → 已完成 → 已关闭
                ↘ 待处理（退回）
```

### 11.4 任务类型

| 类型 | 说明 |
|---|---|
| development | 开发任务 |
| design | 设计任务 |
| testing | 测试任务 |
| documentation | 文档任务 |
| deployment | 部署任务 |
| coordination | 协调任务 |

### 11.5 用户故事

- **TK-US-01：** 作为用户，我希望在看板视图中拖拽任务卡片来变更状态，操作直观高效。
- **TK-US-02：** 作为用户，我希望任务能关联到具体的产物、原型和接口，开发时不用到处找资料。
- **TK-US-03：** 作为用户，我希望 AI 能根据方案或原型自动拆解出任务列表，减少手动拆分。
- **TK-US-04：** 作为用户，我希望为任务设定验收标准，确保交付质量。

### 11.6 验收标准

- **TK-AC-01：** Given 看板视图中，When 拖拽任务卡片从"待处理"到"进行中"，Then 任务状态更新为"进行中"。
- **TK-AC-02：** Given 任务关联了原型，When 在任务详情中点击关联原型，Then 打开对应的 HTML 原型预览。
- **TK-AC-03：** Given 使用"从方案生成任务"，When AI 拆解完成，Then 展示任务列表草稿，用户可编辑/删除/确认后批量创建。
- **TK-AC-04：** Given 任务有子任务，When 所有子任务完成，Then 父任务自动提示"所有子任务已完成，是否标记为完成？"

### 11.7 接口设计

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/projects/:id/tasks | 获取任务列表（支持筛选/排序） |
| POST | /api/projects/:id/tasks | 创建任务 |
| GET | /api/tasks/:id | 获取任务详情 |
| PUT | /api/tasks/:id | 更新任务 |
| DELETE | /api/tasks/:id | 删除任务 |
| PUT | /api/tasks/:id/status | 更新任务状态 |
| POST | /api/tasks/:id/subtasks | 创建子任务 |
| POST | /api/tasks/:id/links | 添加任务关联 |
| DELETE | /api/tasks/:id/links/:lid | 删除任务关联 |
| POST | /api/tasks/batch | 批量操作任务 |
| POST | /api/projects/:id/tasks/generate | AI 生成任务 |
| PUT | /api/tasks/:id/sort | 更新任务排序 |

### 11.8 UI 交互说明

- 看板视图默认按状态分 6 列，每列显示任务卡片
- 任务卡片显示：标题、优先级色标、标签、截止日期、关联产物图标
- 列表视图采用 TanStack Table，支持列排序、筛选、分页
- 任务详情为侧滑面板（从右侧滑出），不离开当前页面
- 支持快捷键：N 新建任务、E 编辑、D 设置日期、S 切换视图

---

## 12. 接口与技术资料管理

### 12.1 模块概述

面向全栈开发场景，沉淀项目技术资料：接口清单、环境地址、数据字典、技术文档、外部链接。

### 12.2 功能需求

| 编号 | 功能 | 优先级 | 说明 |
|---|---|---|---|
| API-01 | 接口清单 | P0 | CRUD 管理项目接口 |
| API-02 | 接口详情 | P0 | 方法、路径、参数、请求体、响应体 |
| API-03 | 接口状态管理 | P0 | 待确认→待开发→开发中→待联调→已完成→已废弃 |
| API-04 | 接口分组 | P1 | 按模块分组展示 |
| API-05 | 接口搜索 | P0 | 按名称、路径、模块搜索 |
| API-06 | 联调状态标记 | P1 | 标记接口联调结果 |
| API-07 | 环境地址管理 | P0 | 管理开发/测试/预生产/生产环境地址 |
| API-08 | 外部链接管理 | P1 | 管理第三方服务、文档、后台地址 |
| API-09 | 数据字典 | P1 | 管理数据库表结构说明 |
| API-10 | 技术方案记录 | P1 | 记录架构设计、部署方案等 |
| API-11 | 部署说明 | P2 | 记录部署流程和配置 |

### 12.3 接口状态流转

```
待确认 → 待开发 → 开发中 → 待联调 → 已完成 → 已废弃
```

### 12.4 环境地址类型

| 类型 | 说明 |
|---|---|
| dev | 开发环境 |
| test | 测试环境 |
| staging | 预生产环境 |
| production | 生产环境 |

### 12.5 用户故事

- **API-US-01：** 作为全栈开发者，我希望统一管理项目所有接口信息，联调时快速查找。
- **API-US-02：** 作为开发者，我希望记录各环境地址和第三方链接，不用到处翻找。
- **API-US-03：** 作为开发者，我希望维护数据字典，方便后续维护和交接。

### 12.6 验收标准

- **API-AC-01：** Given 项目进入开发阶段，When 创建接口并填写详情，Then 接口在清单中按模块分组展示。
- **API-AC-02：** Given 接口状态为"待联调"，When 联调完成标记为"已完成"，Then 状态更新并记录联调时间。
- **API-AC-03：** Given 环境地址已配置，When 在任务或文档中引用，Then 可快速插入环境地址链接。

### 12.7 接口设计

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/projects/:id/api-endpoints | 获取接口列表 |
| POST | /api/projects/:id/api-endpoints | 创建接口 |
| GET | /api/api-endpoints/:id | 获取接口详情 |
| PUT | /api/api-endpoints/:id | 更新接口 |
| DELETE | /api/api-endpoints/:id | 删除接口 |
| PUT | /api/api-endpoints/:id/status | 更新接口状态 |
| GET | /api/projects/:id/environments | 获取环境地址列表 |
| POST | /api/projects/:id/environments | 创建环境地址 |
| PUT | /api/environments/:id | 更新环境地址 |
| DELETE | /api/environments/:id | 删除环境地址 |
| GET | /api/projects/:id/external-links | 获取外部链接列表 |
| POST | /api/projects/:id/external-links | 创建外部链接 |
| PUT | /api/external-links/:id | 更新外部链接 |
| DELETE | /api/external-links/:id | 删除外部链接 |
| GET | /api/projects/:id/data-dictionary | 获取数据字典 |
| POST | /api/projects/:id/data-dictionary | 创建数据字典条目 |
| GET | /api/projects/:id/technical-docs | 获取技术文档列表 |
| POST | /api/projects/:id/technical-docs | 创建技术文档 |

### 12.8 UI 交互说明

- 接口清单左侧为模块分组树，右侧为接口列表
- 接口详情采用可展开行或侧滑面板
- 请求参数和响应体支持 JSON 格式化展示
- 环境地址以标签卡片形式展示，点击可复制
- 数据字典采用表格编辑器，支持行内编辑

---

## 13. AI 项目助手

### 13.1 模块概述

AI 助手是重构后的核心能力之一。具备项目上下文感知能力，能理解当前项目、文档、阶段和相关产物，作为项目 Copilot 辅助推进工作。

### 13.2 功能需求

| 编号 | 功能 | 优先级 | 说明 |
|---|---|---|---|
| AI-01 | 项目聊天 | P0 | 基于项目上下文的自由对话 |
| AI-02 | 实施方案生成 | P0 | 根据项目资料生成完整实施方案 |
| AI-03 | 文档补全/优化 | P0 | 对当前文档进行章节补全或文字优化 |
| AI-04 | 流程图生成 | P1 | 根据描述生成业务流程图（SVG/Mermaid） |
| AI-05 | HTML 原型生成 | P1 | 根据方案生成 HTML 原型文件 |
| AI-06 | 项目计划生成 | P1 | 根据方案自动拆解里程碑和任务包 |
| AI-07 | 任务自动拆解 | P1 | 从文档/原型/方案拆解出开发任务 |
| AI-08 | 待确认事项生成 | P1 | 从资料中提取需要确认的事项 |
| AI-09 | 调研问题生成 | P2 | 根据项目类型生成调研提纲 |
| AI-10 | 周报/月报生成 | P0 | 汇总任务和产物进展生成汇报 |
| AI-11 | 阶段汇报生成 | P1 | 根据阶段产物和任务生成阶段汇报 |
| AI-12 | 风险检查 | P2 | 检查项目超期任务、停滞阶段等风险 |
| AI-13 | 缺失项检查 | P2 | 检查当前阶段是否缺少关键产物 |

### 13.3 AI 入口形式

| 入口 | 场景 | 说明 |
|---|---|---|
| 全局 AI 助手 | 任意页面 | 侧边栏或独立页面，支持项目聊天 |
| 项目 AI 助手 | 项目空间内 | 自动携带项目上下文 |
| 文档 AI 侧边栏 | 文档编辑页 | 针对当前文档的补全/优化/拆解操作 |
| 任务 AI 操作 | 任务列表/详情 | 批量生成任务、拆解任务 |
| 原型 AI 操作 | 原型列表页 | 生成 HTML 原型、生成说明 |
| 汇报 AI 操作 | 汇报编辑页 | 汇总数据生成汇报 |

### 13.4 AI 快捷动作（文档编辑页内）

```
当前在实施方案页面：
├── 补全当前章节
├── 优化文字表达
├── 生成待确认事项
├── 拆解开发任务
├── 生成汇报摘要
└── 生成业务流程图
```

### 13.5 技术实现

- 采用外部 AI API（OpenAI / Claude），服务端统一封装
- 支持模型切换和配置
- 上下文注入：每次对话自动携带当前项目/阶段/产物的摘要信息
- 流式输出：AI 回复采用 Server-Sent Events 流式返回
- 对话历史：保存对话记录，支持回溯

### 13.6 用户故事

- **AI-US-01：** 作为用户，我希望 AI 能理解当前项目的上下文，对话时不需要反复解释项目背景。
- **AI-US-02：** 作为用户，我希望在编辑文档时能一键让 AI 补全章节或优化文字，提高写作效率。
- **AI-US-03：** 作为用户，我希望 AI 能根据实施方案自动生成任务列表和计划，减少手动拆解。
- **AI-US-04：** 作为用户，我希望 AI 能自动汇总项目进展生成周报，减少汇报编写时间。

### 13.7 验收标准

- **AI-AC-01：** Given 用户在项目空间内打开 AI 助手，When 发送消息，Then AI 回复包含项目上下文理解（如引用项目名称、当前阶段信息）。
- **AI-AC-02：** Given 用户在编辑实施方案，When 点击"补全当前章节"，Then AI 基于已有内容和项目上下文生成补全建议，用户可选择采纳或拒绝。
- **AI-AC-03：** Given 使用"生成实施方案"功能，When 提供项目基础信息后，Then AI 生成包含标准章节的实施方案初稿，耗时不超过 30 秒。
- **AI-AC-04：** Given AI 生成了任务列表，When 用户确认，Then 任务批量创建并关联到当前项目和阶段。

### 13.8 接口设计

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /api/ai/chat | 发送聊天消息（SSE 流式返回） |
| GET | /api/ai/conversations | 获取对话历史列表 |
| GET | /api/ai/conversations/:id | 获取对话详情（含消息列表） |
| POST | /api/ai/generate-document | AI 生成文档内容 |
| POST | /api/ai/complete-document | AI 补全文档章节 |
| POST | /api/ai/optimize-document | AI 优化文档文字 |
| POST | /api/ai/generate-flowchart | AI 生成流程图 |
| POST | /api/ai/generate-prototype | AI 生成 HTML 原型 |
| POST | /api/ai/generate-plan | AI 生成项目计划 |
| POST | /api/ai/generate-tasks | AI 拆解任务 |
| POST | /api/ai/generate-pending-items | AI 生成待确认事项 |
| POST | /api/ai/generate-report | AI 生成汇报 |
| POST | /api/ai/check-risks | AI 风险检查 |
| POST | /api/ai/check-missing | AI 缺失项检查 |
| GET | /api/ai/config | 获取 AI 配置（模型、参数等） |
| PUT | /api/ai/config | 更新 AI 配置 |

### 13.9 UI 交互说明

- AI 侧边栏位于页面右侧，可折叠/展开，宽度可调
- 对话界面支持 Markdown 渲染、代码高亮
- AI 生成的内容以卡片形式展示，每个卡片有"采纳""编辑""重新生成"操作
- 流式输出时显示打字效果
- AI 操作按钮嵌入到各编辑页面的工具栏中

---

## 14. 汇报中心

### 14.1 模块概述

汇报中心沉淀日报、周报、项目阶段汇报和交付汇报。支持 AI 自动汇总任务进度和产物进展。

### 14.2 功能需求

| 编号 | 功能 | 优先级 | 说明 |
|---|---|---|---|
| RP-01 | 日报生成 | P0 | AI 根据当日完成的任务自动生成日报 |
| RP-02 | 周报生成 | P0 | AI 汇总本周任务进展和产物变化 |
| RP-03 | 阶段汇报 | P1 | 根据阶段产物和里程碑生成阶段汇报 |
| RP-04 | 交付汇报 | P1 | 项目交付时生成验收汇报 |
| RP-05 | 汇报模板管理 | P0 | 管理各类汇报模板 |
| RP-06 | 汇报历史 | P0 | 查看历史汇报记录 |
| RP-07 | 汇报导出 | P2 | 导出为 PDF / Word |
| RP-08 | 汇报编辑 | P0 | 在 AI 生成基础上手动编辑调整 |

### 14.3 汇报数据来源

| 数据类型 | 说明 |
|---|---|
| 已完成任务 | 统计周期内完成的任务列表 |
| 进行中任务 | 当前仍在进行的任务 |
| 新增产物 | 统计周期内新建的产物 |
| 产物状态变化 | 状态流转记录 |
| 待确认事项 | 未解决的待确认事项 |
| 风险问题 | 超期任务、停滞阶段 |
| 里程碑进展 | 里程碑完成情况 |
| AI 对话摘要 | 关键 AI 辅助工作摘要 |

### 14.4 用户故事

- **RP-US-01：** 作为用户，我希望 AI 自动汇总本周工作生成周报初稿，我只需微调即可提交。
- **RP-US-02：** 作为用户，我希望汇报能自动关联任务和产物数据，不用手动统计。
- **RP-US-03：** 作为用户，我希望查看历史汇报，方便回溯项目进展。

### 14.5 验收标准

- **RP-AC-01：** Given 用户点击"生成周报"，When 选择时间范围，Then AI 汇总该周期内的任务完成情况和产物变化，生成周报初稿。
- **RP-AC-02：** Given 周报已生成，When 用户编辑内容，Then 编辑内容实时保存，AI 生成部分和用户编辑部分可区分。
- **RP-AC-03：** Given 历史汇报列表，When 点击某条汇报，Then 展示该汇报的完整内容和生成时的数据来源。

### 14.6 接口设计

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/projects/:id/reports | 获取汇报列表 |
| POST | /api/projects/:id/reports | 创建汇报 |
| GET | /api/reports/:id | 获取汇报详情 |
| PUT | /api/reports/:id | 更新汇报 |
| DELETE | /api/reports/:id | 删除汇报 |
| POST | /api/reports/:id/generate | AI 生成/重新生成汇报 |
| POST | /api/reports/:id/export | 导出汇报 |

### 14.7 UI 交互说明

- 汇报列表页按时间倒序展示，按类型 Tab 筛选（日报/周报/阶段汇报/交付汇报）
- 汇报编辑页采用富文本编辑器，右侧 AI 侧边栏可辅助调整
- AI 生成的段落以浅色背景标注，用户编辑部分正常显示
- 数据来源以可折叠面板展示在编辑页底部，用户可查看汇报引用了哪些数据

---

## 15. 复盘归档

### 15.1 模块概述

项目完成后统一归档，支持复盘报告生成和经验沉淀。

### 15.2 功能需求

| 编号 | 功能 | 优先级 | 说明 |
|---|---|---|---|
| RV-01 | 项目资料归档 | P1 | 统一归档所有产物、文件、链接 |
| RV-02 | 任务归档 | P1 | 将所有任务标记为归档状态 |
| RV-03 | 复盘报告生成 | P1 | AI 辅助生成复盘报告 |
| RV-04 | 经验沉淀 | P2 | 记录可复用的经验和模板 |
| RV-05 | 项目关闭 | P1 | 正式关闭项目，锁定编辑 |
| RV-06 | 归档查看 | P1 | 归档后仍可查看，不可编辑 |

### 15.3 复盘报告结构

```
复盘报告
├── 项目目标（原定目标）
├── 实际完成情况（对比目标）
├── 主要成果（交付物清单）
├── 遇到的问题（问题列表）
├── 解决方案（如何处理）
├── 可复用模板（沉淀的模板/经验）
└── 后续改进建议
```

### 15.4 用户故事

- **RV-US-01：** 作为用户，我希望项目结束后能一键归档所有资料，保持完整记录。
- **RV-US-02：** 作为用户，我希望 AI 能根据项目数据辅助生成复盘报告，减少回忆和整理工作。
- **RV-US-03：** 作为用户，我希望沉淀的经验能在未来项目中被参考和复用。

### 15.5 验收标准

- **RV-AC-01：** Given 项目状态为"已完成"，When 用户点击归档，Then 所有产物状态变为"已归档"，任务状态变为"已关闭"。
- **RV-AC-02：** Given 使用"生成复盘报告"，When AI 生成完成，Then 报告包含项目目标、实际完成情况、主要成果等标准章节。
- **RV-AC-03：** Given 项目已归档，When 用户尝试编辑产物，Then 提示"项目已归档，不可编辑"。

### 15.6 接口设计

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /api/projects/:id/archive | 归档项目 |
| POST | /api/projects/:id/close | 关闭项目 |
| POST | /api/projects/:id/review/generate | AI 生成复盘报告 |
| GET | /api/projects/:id/review | 获取复盘报告 |
| PUT | /api/projects/:id/review | 更新复盘报告 |
| GET | /api/projects/:id/experiences | 获取经验沉淀列表 |
| POST | /api/projects/:id/experiences | 创建经验沉淀 |

### 15.7 UI 交互说明

- 归档操作需要二次确认弹窗，列出将要归档的内容清单
- 复盘报告编辑页与文档编辑页一致，支持 AI 辅助
- 归档后的项目以灰色标识在项目列表中标记，点击进入只读模式
- 经验沉淀以卡片形式展示，支持标签分类和搜索

---

## 16. 非功能需求

### 16.1 性能

| 指标 | 要求 |
|---|---|
| 页面加载 | 首屏加载 < 2 秒（Gzip 后） |
| 接口响应 | 普通 CRUD 接口 < 200ms |
| AI 响应 | 首 token 返回 < 3 秒 |
| 自动保存 | 编辑内容 3 秒无操作自动保存 |
| 并发 | 支持单用户 50+ 项目、1000+ 任务无明显性能下降 |

### 16.2 安全

| 措施 | 说明 |
|---|---|
| 用户认证 | JWT Token + Refresh Token |
| API 鉴权 | 所有接口需验证用户身份 |
| 数据隔离 | 单人模式下数据按用户隔离（预留多租户扩展） |
| 输入校验 | 所有用户输入在服务端校验，防止 XSS 和注入 |
| AI 内容安全 | AI 生成内容经过基础安全过滤 |

### 16.3 可用性

| 能力 | 说明 |
|---|---|
| 响应式设计 | 支持 1280px 及以上屏幕 |
| 自动保存 | 所有编辑页面支持自动保存 |
| 本地草稿缓存 | 防止意外丢失编辑内容 |
| 操作确认 | 破坏性操作（删除、归档）需二次确认 |
| 撤销/重做 | 文档编辑支持 Ctrl+Z / Ctrl+Shift+Z |

### 16.4 可扩展性

| 能力 | 说明 |
|---|---|
| 多用户预留 | 数据模型预留多用户字段（userId, createdById） |
| 接口规范 | 遵循 RESTful 规范，便于后续扩展 |
| AI 服务抽象 | 支持切换不同 AI 提供商 |
| 模板扩展 | 支持自定义模板变量 |
| 配置化 | 阶段产物映射、组件库等可配置 |

### 16.5 桌面级 Web 体验

| 能力 | 说明 |
|---|---|
| 快捷键 | 全局快捷键体系（Cmd+K 命令面板等） |
| 命令面板 | 快速搜索和跳转功能 |
| 全局搜索 | 搜索项目、产物、任务、文档内容 |
| 多栏布局 | 支持侧边栏 + 主内容区 + AI 面板三栏 |
| 拖拽排序 | 看板卡片、任务列表拖拽 |
| 实时预览 | 文档、原型实时预览 |
| 最近访问 | 快速回到最近查看的内容 |
| PWA | 支持安装为桌面应用（第四阶段） |

---

## 17. 实施路线图

### 17.1 第一阶段：核心重构（MVP）

**目标：** 搭建项目工作台核心框架

| 功能 | 优先级 | 对应模块 |
|---|---|---|
| 工作台首页 | P0 | 工作台 |
| 项目空间 + 基础信息管理 | P0 | 项目管理 |
| 8 阶段管理 | P0 | 项目阶段管理 |
| 产物中心（文档/表格/流程图） | P0 | 产物中心 |
| 文档模板 + 内置模板 | P0 | 文档模板管理 |
| 实施方案生成 | P0 | 产物中心 + AI |
| 任务看板（基础版） | P0 | 任务与看板 |
| AI 项目助手（聊天 + 文档生成 + 汇报生成） | P0 | AI 项目助手 |

**交付结果：** TaskHub 从任务工具升级为项目工作台。

### 17.2 第二阶段：方案与原型增强

**目标：** 补齐项目前期工作能力

| 功能 | 优先级 | 对应模块 |
|---|---|---|
| 流程图生成 | P1 | AI 项目助手 |
| HTML 原型生成 | P1 | 原型设计 |
| 原型预览与列表 | P1 | 原型设计 |
| 从原型生成开发清单 | P1 | 原型 + 任务 |
| 项目计划 + 里程碑 | P1 | 项目计划 |
| 待确认事项管理 | P1 | 产物中心 |
| 从方案生成任务 | P1 | AI + 任务 |

**交付结果：** 支持从项目资料快速生成方案、流程、原型和任务。

### 17.3 第三阶段：全栈开发支撑

**目标：** 强化开发实施过程

| 功能 | 优先级 | 对应模块 |
|---|---|---|
| 接口清单管理 | P0 | 接口与技术资料 |
| 环境地址管理 | P0 | 接口与技术资料 |
| 外部链接管理 | P1 | 接口与技术资料 |
| 数据字典 | P1 | 接口与技术资料 |
| 技术方案记录 | P1 | 接口与技术资料 |
| 任务关联原型/接口 | P1 | 任务与看板 |
| 任务子任务 + 验收标准 | P1 | 任务与看板 |
| 复盘归档 | P1 | 复盘归档 |
| 阶段汇报 + 交付汇报 | P1 | 汇报中心 |

**交付结果：** 支持全栈开发从需求到上线的完整执行过程。

### 17.4 第四阶段：体验与桌面增强

**目标：** 提升效率和沉浸感

| 功能 | 优先级 | 对应模块 |
|---|---|---|
| 命令面板 | P1 | 全局 |
| 全局搜索 | P1 | 全局 |
| 快捷键体系 | P1 | 全局 |
| 本地草稿缓存 | P1 | 全局 |
| 产物导出（PDF/Word） | P2 | 产物中心 |
| 简易甘特图 | P2 | 项目计划 |
| PWA 支持 | P2 | 全局 |
| Tauri 桌面端 | P2 | 全局 |
| 风险检查 + 缺失项检查 | P2 | AI 项目助手 |

**交付结果：** TaskHub 具备桌面级 Web App 体验，可扩展为桌面应用。

---

## 附录：典型使用流程

以一个政务应用项目为例：

```
新建项目
↓
选择项目类型
↓
导入应用清单和调研资料
↓
AI 生成实施方案
↓
生成待确认事项
↓
生成业务流程图
↓
生成 HTML 原型
↓
从方案和原型拆解任务
↓
生成项目计划
↓
进入看板开发
↓
管理接口清单
↓
生成测试清单
↓
生成项目汇报
↓
交付归档
↓
复盘沉淀
```

---

## 附录：暂缓功能

以下功能在当前版本不纳入实施范围：

- 可视化原型编辑器（拖拽画布）
- 复杂甘特图
- 多人协作
- 复杂权限体系
- 插件市场
- 原生桌面端（Tauri 在第四阶段评估）
- 完整自动化工作流
- 高级数据分析看板
