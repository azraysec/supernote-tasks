import React, { useState } from 'react';
import {
  Check, RotateCcw, Trash2, Calendar, ChevronDown, ChevronUp,
  Mail, MailCheck, StickyNote, AlarmClock, AlarmClockOff,
  Pencil, X, Save,
} from 'lucide-react';
import type { Task } from '../types';

interface TaskListProps {
  tasks: Task[];
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onEmail: (task: Task) => Promise<void>;
  onSnooze: (task: Task) => void;
  onUnsnooze: (task: Task) => void;
  onEdit: (task: Task, updates: Partial<Task>) => void;
}

const priorityConfig: Record<string, { label: string; class: string }> = {
  high: { label: 'High', class: 'badge-error' },
  medium: { label: 'Med', class: 'badge-warning' },
  low: { label: 'Low', class: 'badge-ghost' },
};

interface EditForm {
  title: string;
  priority: string;
  due_date: string;
  notes: string;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks, onToggle, onDelete, onEmail, onSnooze, onUnsnooze, onEdit,
}) => {
  const [showCompleted, setShowCompleted] = useState(false);
  const [emailingId, setEmailingId] = useState<number | null>(null);
  const [justSentId, setJustSentId] = useState<number | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ title: '', priority: '', due_date: '', notes: '' });

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditForm({
      title: task.title || '',
      priority: task.priority || '',
      due_date: task.due_date || '',
      notes: task.notes || '',
    });
  };

  const saveEdit = (task: Task) => {
    onEdit(task, {
      title: editForm.title,
      priority: (editForm.priority as Task['priority']) || null,
      due_date: editForm.due_date || null,
      notes: editForm.notes || null,
    });
    setEditingId(null);
  };

  const toggleNotes = (id: number) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEmail = async (task: Task) => {
    setEmailingId(task.id);
    try {
      await onEmail(task);
      setJustSentId(task.id);
      setTimeout(() => setJustSentId(null), 2500);
    } catch {
      alert('Failed to send email');
    } finally {
      setEmailingId(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const today = new Date().toISOString().split('T')[0];

  const renderTask = (task: Task) => {
    const isEmailed = task.email_sent === 1;
    const isSending = emailingId === task.id;
    const justSent = justSentId === task.id;
    const isEditing = editingId === task.id;
    const isSnoozed = task.snoozed_until && task.snoozed_until > today;

    return (
      <div
        key={task.id}
        className={`flex flex-col p-3 rounded-lg bg-base-200 group ${task.status === 'completed' ? 'opacity-60' : ''}`}
      >
        <div className="flex items-start gap-3">
          <button
            className={`btn btn-circle btn-sm mt-0.5 ${task.status === 'active' ? 'btn-outline btn-primary' : 'btn-success'}`}
            onClick={() => onToggle(task)}
            title={task.status === 'active' ? 'Mark complete' : 'Reopen'}
          >
            {task.status === 'active' ? <Check size={14} /> : <RotateCcw size={14} />}
          </button>
          <div className="flex-1 min-w-0">
            <span className={`block ${task.status === 'completed' ? 'line-through text-base-content/40' : 'text-base-content'}`}>
              {task.title}
            </span>
          </div>
          <div className="flex gap-1">
            <button
              className={`btn btn-xs ${isEditing ? 'btn-primary btn-outline' : 'btn-ghost opacity-0 group-hover:opacity-60'}`}
              onClick={() => isEditing ? setEditingId(null) : startEdit(task)}
              title={isEditing ? 'Cancel edit' : 'Edit task'}
            >
              {isEditing ? <X size={14} /> : <Pencil size={14} />}
            </button>
            <button
              className={`btn btn-xs ${isEmailed ? 'btn-info btn-outline' : 'btn-ghost opacity-60 hover:opacity-100'}`}
              onClick={() => handleEmail(task)}
              disabled={isSending}
              title={isEmailed ? 'Re-send email' : 'Email this task'}
            >
              {isSending
                ? <span className="loading loading-spinner loading-xs" />
                : isEmailed ? <MailCheck size={14} /> : <Mail size={14} />
              }
            </button>
            {task.status === 'active' && (
              isSnoozed ? (
                <button
                  className="btn btn-warning btn-xs btn-outline"
                  onClick={() => onUnsnooze(task)}
                  title="Unsnooze"
                >
                  <AlarmClockOff size={14} />
                </button>
              ) : (
                <button
                  className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-60"
                  onClick={() => onSnooze(task)}
                  title="Snooze 10 days"
                >
                  <AlarmClock size={14} />
                </button>
              )
            )}
            <button
              className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-60"
              onClick={() => onDelete(task)}
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const activeTasks = tasks.filter(t => t.status === 'active');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="flex flex-col gap-2">
      {activeTasks.length === 0 && (
        <div className="text-center py-8 text-base-content/40">
          No active tasks — you&apos;re all caught up! 🎉
        </div>
      )}
      {activeTasks.map(renderTask)}
      {completedTasks.length > 0 && (
        <div className="mt-4">
          <button
            className="btn btn-ghost btn-sm gap-1 text-base-content/60"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            {showCompleted ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {completedTasks.length} completed
          </button>
          {showCompleted && (
            <div className="flex flex-col gap-2 mt-2">
              {completedTasks.map(renderTask)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
