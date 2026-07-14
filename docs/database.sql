create table if not exists dashboard_snapshots (
  id bigserial primary key,
  collected_at timestamptz not null default now(),
  source_url text not null,
  mode text not null,
  payload jsonb not null
);

create index if not exists dashboard_snapshots_collected_at_idx
  on dashboard_snapshots (collected_at desc);

-- Google accounts listed in ALLOWED_EMAILS are administrators and are not stored here.
-- All regular dashboard users are managed from /admin/users.
create table if not exists dashboard_access_users (
  id bigserial primary key,
  email text not null unique check (email = lower(email)),
  name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deactivated_at timestamptz,
  created_by text
);

create index if not exists dashboard_access_users_active_idx
  on dashboard_access_users (is_active, email);
