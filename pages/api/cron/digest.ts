import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';
import { tursoQuery } from '../../../lib/turso';
import type { Task } from '../../../types';

const resend = new Resend(process.env.RESEND_API_KEY!);
const EMAIL_TO = process.env.EMAIL_TO!;
const EMAIL_FROM = process.env.EMAIL_FROM!;

// Called by Vercel cron at 8:00 AM Israel time (6:00 UTC)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const today = new Date().toISOString().split('T')[0];

  // Get active, non-snoozed tasks
  const tasks = (await tursoQuery(
    `SELECT * FROM supernote_tasks
     WHERE status = 'active'
     AND (snoozed_until IS NULL OR snoozed_until <= ?)
     ORDER BY
       CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 ELSE 3 END,
       due_date ASC NULLS LAST,
       created_at DESC`,
    [today]
  )) as unknown as Task[];

  if (tasks.length === 0) {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: [EMAIL_TO],
      subject: '🎉 No active tasks today!',
      text: "You're all caught up! Enjoy your day.",
    });
    return res.json({ ok: true, sent: 0 });
  }

  const priorityEmoji: Record<string, string> = { high: '🔴', medium: '🟡', low: '🟢' };
  const lines = tasks.map((t, i) => {
    const p = t.priority ? `${priorityEmoji[t.priority]} ` : '';
    const due = t.due_date ? ` [Due: ${t.due_date}]` : '';
    const notes = t.notes ? `\n   📝 ${t.notes}` : '';
    return `${i + 1}. ${p}${t.title}${due}${notes}`;
  });

  const body = `Good morning! Here are your ${tasks.length} active tasks:\n\n${lines.join('\n\n')}\n\n---\nReply to this email to update any task:\n- "done: [task number or title]"\n- "priority: high/medium/low [task number]"\n- "due: Mar 25 [task number]"\n- "note: [text] [task number]"\n- "snooze: [task number]"`;

  await resend.emails.send({
    from: EMAIL_FROM,
    to: [EMAIL_TO],
    subject: `📋 Daily Tasks — ${tasks.length} active`,
    text: body,
  });

  return res.json({ ok: true, sent: tasks.length });
}
