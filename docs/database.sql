create table if not exists dashboard_snapshots (
  id bigserial primary key,
  collected_at timestamptz not null default now(),
  source_url text not null,
  mode text not null,
  payload jsonb not null
);

create index if not exists dashboard_snapshots_collected_at_idx
  on dashboard_snapshots (collected_at desc);
