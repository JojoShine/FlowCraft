export const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'get_tasks',
      description: '查询项目中的任务。支持按完成状态、优先级、看板列、截止日期、标题关键词等条件筛选。当用户查找特定任务时必须传 keyword 参数。',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: '项目ID，不传则使用当前上下文项目' },
          completed: { type: 'boolean', description: 'true=已完成, false=未完成, 不传=全部' },
          priority: { type: 'string', enum: ['high', 'med', 'low'], description: '按优先级筛选' },
          column: { type: 'string', description: '按看板列筛选，如 todo, doing, review, done' },
          overdue: { type: 'boolean', description: 'true=只查逾期任务（截止日已过且未完成）' },
          dueWithinDays: { type: 'integer', description: '查询未来N天内到期的任务' },
          keyword: { type: 'string', description: '用户提到的任务名称或业务关键词，如"登录"、"支付"。用户查找特定任务时必须传递此参数' },
          limit: { type: 'integer', description: '返回数量上限，默认50' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_reports',
      description: '查询项目报告（日报、周报、月报）。当用户查找特定报告时必须传 keyword 参数。',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: '项目ID，不传则使用当前上下文项目' },
          type: { type: 'string', enum: ['daily', 'weekly', 'monthly'], description: '报告类型' },
          keyword: { type: 'string', description: '用户提到的报告标题或内容关键词。用户查找特定报告时必须传递此参数' },
          limit: { type: 'integer', description: '返回数量上限，默认20' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_artifacts',
      description: '查询项目产物和交付物（文档、设计稿、原型等）。当用户查找特定产物时必须传 keyword 参数进行精确匹配。',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: '项目ID，不传则使用当前上下文项目' },
          type: { type: 'string', description: '产物类型筛选：file（文件）或 folder（文件夹）' },
          keyword: { type: 'string', description: '必需：用户提到的产物名称或业务关键词，如"需求文档"、"用户手册"。用户查找特定产物时必须传递此参数' },
          limit: { type: 'integer', description: '返回数量上限，默认50' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_project_overview',
      description: '获取项目概况，包括基本信息、阶段列表、任务/产物/报告统计数量。',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: '项目ID，不传则使用当前上下文项目' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_phase_details',
      description: '获取项目各阶段详情，包括每个阶段的任务总数和已完成数。',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: '项目ID，不传则使用当前上下文项目' },
        },
      },
    },
  },
] as const;

export type ToolName = 'get_tasks' | 'get_reports' | 'get_artifacts' | 'get_project_overview' | 'get_phase_details';
