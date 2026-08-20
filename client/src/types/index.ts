export interface User {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  projectId: string | null;
}

export interface Phase {
  id: string;
  projectId: string;
  name: string;
  order: number;
  startDate: string | null;
  endDate: string | null;
  _count?: { tasks: number };
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  status: string;
  startDate: string | null;
  dueDate: string | null;
  projectId: string;
  phaseId: string | null;
  assigneeId: string | null;
  column: string;
  isMilestone: boolean;
  completedAt?: string | null;
  phase?: Pick<Phase, 'id' | 'name' | 'order'> | null;
  assignee?: Pick<User, 'id' | 'name'> | null;
  artifacts?: Artifact[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Artifact {
  id: string;
  name: string;
  type: string;
  status: string;
  filePath: string | null;
  content: string | null;
  shareToken?: string | null;
  taskId: string | null;
  projectId: string;
  creatorId: string | null;
  createdAt?: string;
  updatedAt?: string;
  task?: Pick<Task, 'id' | 'title'> | null;
  creator?: Pick<User, 'id' | 'name'> | null;
}

export interface Project {
  id: string;
  name: string;
  type: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  ownerId: string;
  owner?: Pick<User, 'id' | 'name' | 'email'> | null;
  phases?: Phase[];
  tasks?: Task[];
  artifacts?: Artifact[];
}

export interface Template {
  id: string;
  name: string;
  category: string;
  description: string | null;
  content: string;
  fileType: string;
  usageCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Report {
  id: string;
  type: string;
  label: string;
  content: string;
  date: string;
  projectId: string;
}
