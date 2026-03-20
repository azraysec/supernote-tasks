export interface Task {
  id: number;
  title: string;
  status: 'active' | 'completed';
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
  source: string | null;
  notes: string | null;
  priority: 'high' | 'medium' | 'low' | null;
  email_sent: number;
  snoozed_until: string | null;
  supernote_task_id: string | null;
  updated_at: string | null;
}
