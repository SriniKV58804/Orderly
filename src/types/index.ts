export type User = {
  id: string;
  email: string;
  fullName: string;
  canvasToken?: string;
};

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  course?: string;
  course_id?: string;
  due_date: Date;
  work_date?: Date;
  priority: 1 | 2 | 3 | 4 | 5;
  category: string;
  status: 'pending' | 'in_progress' | 'completed';
  is_canvas_task: boolean;
  canvas_task_id?: string;
  created_at: Date;
  updated_at: Date;
}

export type AuthStackParamList = {
  login: undefined;
  signup: undefined;
};

export type AuthResponse = {
  success: boolean;
  error?: string;
};

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface TaskFormData {
  title: string;
  description?: string;
  due_date: Date;
  work_date?: Date | null;
  priority: 1 | 2 | 3 | 4 | 5;
  category: string;
  course?: string;
  course_id?: string;
}

export type SignupCredentials = LoginCredentials & {
  fullName: string;
};