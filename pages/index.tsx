import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Send, Search, RotateCcw } from 'lucide-react';
import { TaskList } from '../components/TaskList';
import { AddTask } from '../components/AddTask';
import type { Task } from '../types';

type EmailFilter = 'all' | 'emailed' | 'not-emailed' | 'snoozed';

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [emailFilter, setEmailFilter] = useState<EmailFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleToggle = async (task: Task) => {
    const newStatus = task.status === 'active' ? 'completed' : 'active';
    const now = new Date().toISOString();
    const completedAt = newStatus === 'completed' ? now : null;

    setTasks(prev => prev.map(t =>
      t.id == task.id ? { ...t, status: newStatus, completed_at: completedAt } : t
    ));

    await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, status: newStatus, completed_at: completedAt }),
    });
  };

  const handleAdd = async (title: string, dueDate: string | null) => {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, due_date: dueDate }),
    });
    const newTask = await res.json();
    setTasks(prev => [newTask, ...prev]);
  };

  const handleDelete = async (task: Task) => {
    setTasks(prev => prev.filter(t => t.id !== task.id));
    await fetch(`/api/tasks?id=${task.id}`, { method: 'DELETE' });
  };

  const handleSnooze = async (task: Task) => {
    const snoozeDate = new Date();
    snoozeDate.setDate(snoozeDate.getDate() + 10);
    const snoozedUntil = snoozeDate.toISOString().split('T')[0];

    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, snoozed_until: snoozedUntil } : t
    ));

    await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, snoozed_until: snoozedUntil }),
    });
  };

  const handleUnsnooze = async (task: Task) => {
    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, snoozed_until: null } : t
    ));

    await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, snoozed_until: null }),
    });
  };

  const handleEdit = async (task: Task, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, ...updates } : t
    ));

    await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, ...updates }),
    });
  };

  const handleEmail = async (task: Task) => {
    const res = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task }),
    });
    if (!res.ok) throw new Error('Email failed');
    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, email_sent: 1 } : t
    ));
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setSyncMsg(`✅ Synced: +${data.added} new, ${data.updated} updated`);
        await loadTasks();
      } else {
        setSyncMsg(`⁝ Sync failed: ${data.error}`);
      }
    } catch {
      setSyncMsg('❌ Sync error');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(''), 5000);
    }
  };

  const handleDigest = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/cron/digest', { method: 'POST' });
      const data = await res.json();
      if (data.ok) setSyncMsg(`📧 Digest sent (${data.sent} tasks)`);
      else setSyncMsg(`❌ ${data.error}`);
    } catch {
      setSyncMsg('❌ Failed to send digest');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(''), 5000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const isSnoozed = (t: Task) => !!(t.snoozed_until && t.snoozed_until > today);
  const activeCount = tasks.filter(t => t.status === 'active' && !isSnoozed(t)).length;
  const snoozedCount = tasks.filter(t => t.status === 'active' && isSnoozed(t)).length;
  const emailedCount = tasks.filter(t => t.email_sent === 1).length;

  const filteredTasks = tasks.filter(t => {
    if (emailFilter === 'snoozed') {
      if (!isSnoozed(t)) return false;
    } else {
      if (isSnoozed(t)) return false;
      if (emailFilter === 'emailed' && t.email_sent !== 1) return false;
      if (emailFilter === 'not-emailed' && t.email_sent === 1) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!t.title?.toLowerCase().includes(q) && !t.notes?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div data-theme="light" className="min-h-screen bg-base-100">
      <div className="max-w-2xl mx-auto p-4 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">📋 Tasks</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-base-content/60 text-sm">{activeCount} active</span>
              {snoozedCount > 0 && (
                <span className="text-warning/70 text-sm">💤 {snoozedCount} snoozed</span>
              )}
              {emailedCount > 0 && (
                <span className="text-info/70 text-sm">📧 {emailedCount} emailed</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm gap-1" onClick={handleDigest} disabled={syncing}>
              <Send size={14} /> Digest
            </button>
            <button className="btn btn-ghost btn-sm gap-1" onClick={handleSync} disabled={syncing}>
              <RotateCcw size={14} className={syncing ? 'animate-spin' : ''} /> Sync
            </button>
            <button className="btn btn-ghost btn-sm gap-1" onClick={loadTasks}>
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Sync message */}
        {syncMsg && (
          <div className="alert alert-info py-2 text-sm">{syncMsg}</div>
        )}

        {/* Filter tabs */}
        <div className="tabs tabs-boxed tabs-sm bg-base-200 w-fit">
          {(['all', 'not-emailed', 'emailed', 'snoozed'] as EmailFilter[]).map(f => (
            <button
              key={f}
              className={`tab ${emailFilter === f ? 'tab-active' : ''}`}
              onClick={() => setEmailFilter(f)}
            >
              {f === 'snoozed' ? `💤 Snoozed${snoozedCount > 0 ? ` (${snoozedCount})` : ''}`
                : f === 'all' ? 'All'
                : f === 'emailed' ? 'Emailed'
                : 'Not emailed'}
            </button>
          ))}
        </div>

        {/* Search */}
        <label className="input input-bordered flex items-center gap-2">
          <Search className="h-ï[1em] opacity-50" />
          <input
            type="search"
            className="grow"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>

        <AddTask onAdd={handleAdd} />

        <TaskList
          tasks={filteredTasks}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onEmail={handleEmail}
          onSnooze={handleSnooze}
          onUnsnooze={handleUnsnooze}
          onEdit={handleEdit}
        />
      </div>
    </div>
  );
}
