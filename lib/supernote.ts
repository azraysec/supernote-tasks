const LOGIN_URL = 'https://cloud.supernote.com/api/official/user/account/login/new';
const TASKS_URL = 'https://cloud.supernote.com/api/file/schedule/task/all';

export interface SupernoteTask {
  id: string;
  content: string;
  finishTime?: string;
  createTime?: string;
  updateTime?: string;
  isFinish?: number;
  priority?: number;
}

export async function supernoteLogin(): Promise<string> {
  const email = process.env.SUPERNOTE_EMAIL!;
  const password = process.env.SUPERNOTE_PASSWORD!;

  const res = await fetch(LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      countryCode: '1',
      account: email,
      password,
      equipment: 'ANDROID',
    }),
  });

  if (!res.ok) throw new Error(`Supernote login failed: ${res.status}`);

  const data = await res.json();
  if (!data.success) throw new Error(`Supernote login error: ${data.errorMsg}`);

  // Token may be in data.token or in Set-Cookie header
  const token = data.token || data.userToken || data.data?.token;
  if (!token) throw new Error('No token in Supernote login response');

  return token;
}

export async function supernoteGetTasks(token: string): Promise<SupernoteTask[]> {
  const res = await fetch(TASKS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token,
    },
    body: JSON.stringify({ maxResults: 10000 }),
  });

  if (!res.ok) throw new Error(`Supernote tasks fetch failed: ${res.status}`);

  const data = await res.json();
  if (!data.success) throw new Error(`Supernote tasks error: ${data.errorMsg}`);

  return data.taskList || data.list || data.data || [];
}
