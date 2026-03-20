import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';
import { tursoExec } from '../../lib/turso';
import type { Task } from '../../types';

const resend = new Resend(process.env.RESEND_API_KEY!);
const EMAIL_TO = process.env.EMAIL_TO!;
const EMAIL_FROM = process.env.EMAIL_FROM!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { task } = req.body as { task: Task };
  if (!task) return res.status(400).json({ error: 'task required' });

  try {
    const statusEmoji = task.status === 'completed' ? '✅' : '⬜';
    const dueLine = task.due_date
      ? `\n\n**Due:** ${new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : '';
    const priorityLine = task.priority ? `\n\n**Priority:** ${task.priority}` : '';
    const notesLine = task.notes ? `\n\n**Notes:** ${task.notes}` : '';

    const body = `**${task.title}**

**Status:** ${task.status}${priorityLine}${dueLine}${notesLine}

---

**Quick actions** — reply with any of:
- **done** — mark complete
- **delete** — remove task
- **priority: high/medium/low** — set priority
- **due: Mar 15** — set or change due date
- **note: your text** — add a note

Or just reply with any feedback 💬`;

    await resend.emails.send({
      from: EMAIL_FROM,
      to: [EMAIL_TO],
      subject: `${statusEmoji} Task: ${task.title}`,
      text: body,
    });

    // Mark as emailed in DB
    await tursoExec('UPDATE supernote_tasks SET email_sent = 1 WHERE id = ?', [task.id]);

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
}
