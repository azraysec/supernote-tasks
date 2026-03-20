import type { NextApiRequest, NextApiResponse } from 'next';
import { supernoteLogin, supernoteGetTasks } from '../../lib/supernote';
import { tursoQuery, tursoExec } from '../../lib/turso';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Login to Supernote
    const token = await supernoteLogin();

    // Fetch all tasks
    const tasks = await supernoteGetTasks(token);

    let added = 0;
    let updated = 0;

    for (const t of tasks) {
      const taskId = String(t.id);
      const title = t.content || '';
      const status = t.isFinish === 1 ? 'completed' : 'active';
      const createdAt = t.createTime ? new Date(Number(t.createTime)).toISOString() : new Date().toISOString();
      const completedAt = t.isFinish === 1 && t.finishTime
        ? new Date(Number(t.finishTime)).toISOString()
        : null;

      // Check if exists
      const existing = await tursoQuery(
        'SELECT id FROM supernote_tasks WHERE supernote_task_id = ?',
        [taskId]
      );

      if (existing.length === 0) {
        // Insert new task
        await tursoExec(
          `INSERT INTO supernote_tasks
           (title, status, created_at, completed_at, source, supernote_task_id)
           VALUES (?, ?, ?, ?, 'supernote', ?)`,
          [title, status, createdAt, completedAt, taskId]
        );
        added++;
      } else {
        // Update if changed
        await tursoExec(
          `UPDATE supernote_tasks
           SET title = ?, status = ?, completed_at = ?, updated_at = ?
           WHERE supernote_task_id = ? AND source = 'supernote'`,
          [title, status, completedAt, new Date().toISOString(), taskId]
        );
        updated++;
      }
    }

    return res.json({
      ok: true,
      synced: tasks.length,
      added,
      updated,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Sync error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
