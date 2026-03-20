import type { NextApiRequest, NextApiResponse } from 'next';
import { tursoQuery, tursoExec } from '../../lib/turso';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const tasks = await tursoQuery(
        `SELECT id, title, status, due_date, created_at, completed_at, source, notes, priority,
                email_sent, snoozed_until, supernote_task_id, updated_at
         FROM supernote_tasks
         ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at DESC`
      );
      return res.json(tasks);
    }

    if (req.method === 'POST') {
      const { title, due_date } = req.body;
      if (!title) return res.status(400).json({ error: 'title required' });
      const now = new Date().toISOString();
      await tursoExec(
        `INSERT INTO supernote_tasks (title, status, due_date, created_at, source)
         VALUES (?, 'active', ?, ?, 'manual')`,
        [title, due_date || null, now]
      );
      const rows = await tursoQuery('SELECT * FROM supernote_tasks ORDER BY id DESC LIMIT 1');
      return res.status(201).json(rows[0]);
    }

    if (req.method === 'PATCH') {
      const { id, ...updates } = req.body;
      if (!id) return res.status(400).json({ error: 'id required' });

      const now = new Date().toISOString();
      const allowed = ['title', 'status', 'due_date', 'notes', 'priority', 'email_sent', 'snoozed_until', 'completed_at'];
      const setClauses: string[] = [];
      const args: (string | number | null)[] = [];

      for (const key of allowed) {
        if (key in updates) {
          setClauses.push(`${key} = ?`);
          args.push(updates[key] ?? null);
        }
      }

      if (setClauses.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

      setClauses.push('updated_at = ?');
      args.push(now);
      args.push(id);

      await tursoExec(
        `UPDATE supernote_tasks SET ${setClauses.join(', ')} WHERE id = ?`,
        args
      );
      return res.json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id required' });
      await tursoExec('DELETE FROM supernote_tasks WHERE id = ?', [Number(id)]);
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
}
