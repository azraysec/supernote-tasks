import type { NextApiRequest, NextApiResponse } from 'next';

// Called by Vercel cron at 7:50 AM Israel time (5:50 UTC)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Vercel automatically adds Authorization: Bearer <CRON_SECRET> header for cron jobs
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Delegate to the sync handler
  const syncRes = await fetch(`${process.env.APP_URL}/api/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const result = await syncRes.json();
  return res.json(result);
}
