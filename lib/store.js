function connectionString() {
  return (
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    ""
  );
}

export function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+$/.test(email);
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
  await sql`
    create table if not exists dashboard_access_users (
      id bigserial primary key,
      email text not null unique check (email = lower(email)),
      name text,
      is_active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      deactivated_at timestamptz,
      created_by text
    )
  `;
  await sql`
    create index if not exists dashboard_access_users_active_idx
    on dashboard_access_users (is_active, email)
  `;
  return true;
}

function serializeAccessUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name || "",
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deactivatedAt: row.deactivated_at,
    createdBy: row.created_by || ""
  };
}

export async function isAccessUserActive(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!hasDatabase() || !isValidEmail(normalizedEmail)) return false;

  const sql = await getSql();
  await ensureSchema();
  const rows = await sql`
    select id
    from dashboard_access_users
    where email = ${normalizedEmail}
      and is_active = true
    limit 1
  `;
  return rows.length > 0;
}

export async function listAccessUsers() {
  if (!hasDatabase()) return [];

  const sql = await getSql();
  await ensureSchema();
  const rows = await sql`
    select id, email, name, is_active, created_at, updated_at, deactivated_at, created_by
    from dashboard_access_users
    order by is_active desc, email asc
  `;
  return rows.map(serializeAccessUser);
}

export async function upsertAccessUser({ email, name, createdBy }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedCreatedBy = normalizeEmail(createdBy);

  if (!isValidEmail(normalizedEmail)) throw new Error("invalid_email");
  if (!hasDatabase()) throw new Error("database_not_configured");

  const sql = await getSql();
  await ensureSchema();
  const rows = await sql`
    insert into dashboard_access_users (email, name, is_active, created_by)
    values (${normalizedEmail}, ${normalizedName || null}, true, ${normalizedCreatedBy || null})
    on conflict (email) do update
    set
      name = coalesce(excluded.name, dashboard_access_users.name),
      is_active = true,
      updated_at = now(),
      deactivated_at = null
    returning id, email, name, is_active, created_at, updated_at, deactivated_at, created_by
  `;
  return serializeAccessUser(rows[0]);
}

export async function setAccessUserActive(email, isActive) {
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) throw new Error("invalid_email");
  if (!hasDatabase()) throw new Error("database_not_configured");

  const sql = await getSql();
  await ensureSchema();
  const rows = await sql`
    update dashboard_access_users
    set
      is_active = ${isActive},
      updated_at = now(),
      deactivated_at = case when ${isActive} then null else now() end
    where email = ${normalizedEmail}
    returning id, email, name, is_active, created_at, updated_at, deactivated_at, created_by
  `;
  return rows[0] ? serializeAccessUser(rows[0]) : null;
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
