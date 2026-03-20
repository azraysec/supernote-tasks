const TURSO_URL = process.env.TURSO_URL!;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN!;

type ArgValue = string | number | null;

interface TursoArg {
  type: 'text' | 'integer' | 'null';
  value?: string;
}

function toArg(v: ArgValue): TursoArg {
  if (v === null) return { type: 'null' };
  if (typeof v === 'number') return { type: 'integer', value: String(v) };
  return { type: 'text', value: String(v) };
}

export async function tursoQuery(sql: string, args?: ArgValue[]) {
  const stmt = args
    ? { sql, args: args.map(toArg) }
    : { sql };

  const res = await fetch(`${TURSO_URL}/v2/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TURSO_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [{ type: 'execute', stmt }, { type: 'close' }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Turso error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const result = data.results?.[0]?.response?.result;
  if (!result) return [];

  const { cols, rows } = result;
  const colNames = cols.map((c: { name: string }) => c.name);

  return rows.map((row: Array<{ type: string; value: string | null }>) => {
    const obj: Record<string, string | number | null> = {};
    colNames.forEach((name: string, i: number) => {
      const cell = row[i];
      if (cell.type === 'null') {
        obj[name] = null;
      } else if (cell.type === 'integer') {
        obj[name] = parseInt(cell.value as string, 10);
      } else {
        obj[name] = cell.value;
      }
    });
    return obj;
  });
}

export async function tursoExec(sql: string, args?: ArgValue[]) {
  const stmt = args
    ? { sql, args: args.map(toArg) }
    : { sql };

  const res = await fetch(`${TURSO_URL}/v2/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TURSO_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [{ type: 'execute', stmt }, { type: 'close' }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Turso error ${res.status}: ${text}`);
  }

  return res.json();
}
