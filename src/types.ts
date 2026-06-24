export interface SubTask {
  id: string;
  title: string;
  estimatedMinutes: number;
  completed: boolean;
  scheduledBlockId?: string;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'backlog' | 'scheduled' | 'working' | 'completed';

export interface Task {
  id: string;
  title: string;
  originalDeadline: string; // ISO date string or human description
  priority: TaskPriority;
  estimatedHours: number;
  status: TaskStatus;
  description: string;
  subtasks: SubTask[];
  category?: string;
}

export type BlockType = 'focus' | 'break' | 'class' | 'sleep' | 'personal';

export interface CalendarBlock {
  id: string;
  taskId?: string;
  subTaskId?: string;
  title: string;
  start: string; // ISO string
  end: string;   // ISO string
  type: BlockType;
  completed?: boolean;
}

export type LogType = 'info' | 'optimizing' | 'tracking' | 'scheduled' | 'warning' | 'alert';

export interface AgentLog {
  id: string;
  timestamp: string; // ISO string or short time
  text: string;
  type: LogType;
}

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: string;
  suggestions?: string[];
}
