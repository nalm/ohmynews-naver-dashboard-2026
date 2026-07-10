function connectionString() {
  return (
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    ""
  );
}

export function hasDatabase() {
  return Boolean(connectionString());
}

async function getSql() {
  const { neon } = await import("@neondatabase/serverless");
  return neon(connectionString());
}

export async function ensureSchema() {
  if (!hasDatabase()) return false;
  const sql = await getSql();
  await sql`
    create table if not exists dashboard_snapshots (
      id bigserial primary key,
      collected_at timestamptz not null default now(),
      source_url text not null,
      mode text not null,
      payload jsonb not null
    )
  `;
  await sql`
    create index if not exists dashboard_snapshots_collected_at_idx
    on dashboard_snapshots (collected_at desc)
  `;
  return true;
}

export async function saveSnapshot(payload) {
  if (!hasDatabase()) return null;
  const sql = await getSql();
  await ensureSchema();
  const json = JSON.stringify(payload);
  const rows = await sql`
    insert into dashboard_snapshots (source_url, mode, payload)
    values (${payload.sourceUrl}, ${payload.mode}, ${json}::jsonb)
    returning id
  `;
  return rows[0]?.id || null;
}

export async function loadLatestSnapshot() {
  if (!hasDatabase()) return null;
  const sql = await getSql();
  await ensureSchema();
  const rows = await sql`
    select payload
    from dashboard_snapshots
    order by collected_at desc
    limit 1
  `;
  return rows[0]?.payload || null;
}
