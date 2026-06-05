-- Shophouse Row — Supabase (Postgres) schema for Phase 5 (cloud multiplayer).
-- Mirrors the local-first data model in src/data/localStore.js so the data layer
-- can be swapped behind src/data/api.js without changing any screen.
--
-- Run this in the Supabase SQL editor after creating the project.
-- The static item *catalogue* stays in code (src/pixel/items.js); only player data lives here.

create table if not exists players (
  id              text primary key,                 -- e.g. 'claireh'
  name            text not null,
  name_lower      text not null unique,             -- case-insensitive login match
  shop_type       text,
  is_admin        boolean not null default false,
  setup_complete  boolean not null default false,
  avatar          jsonb,
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now()
);

-- Secret codes are bcrypt-hashed (never plaintext). Set/reset by the admin.
create table if not exists secret_codes (
  player_id   text primary key references players(id) on delete cascade,
  code_hash   text not null
);

create table if not exists shops (
  owner_id      text primary key references players(id) on delete cascade,
  sign_text     text,
  awning_color  text,
  wall_color    text,
  roof_color    text,
  facade_item   text,
  greeting      text,
  interior      jsonb not null default '[]',         -- ground-floor placements
  interior2     jsonb not null default '[]',         -- 2nd-floor placements
  interior_theme text,                               -- chosen interior theme (null = match shop)
  updated_at    timestamptz not null default now()
);
-- Additive for existing projects (introduced with the interior upgrade):
alter table shops add column if not exists interior_theme text;

create table if not exists inventory (
  player_id   text not null references players(id) on delete cascade,
  item_id     text not null,                         -- 'gift' | 'book:Matilda' | 'creation:cr5' ...
  qty         integer not null default 0,
  primary key (player_id, item_id)
);

-- Custom pixel creations: global registry (so a traded/gifted creation renders for anyone).
create table if not exists creations (
  id          text primary key,                      -- 'cr5'
  name        text not null,
  sprite      jsonb not null,                        -- array of row strings
  by_player   text references players(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists trades (
  id                text primary key,
  from_player       text not null references players(id) on delete cascade,
  to_player         text not null references players(id) on delete cascade,
  offered_item_id   text not null,
  requested_item_id text not null,
  status            text not null default 'pending', -- pending | accepted | declined
  created_at        timestamptz not null default now()
);

create table if not exists messages (
  id          text primary key,
  from_player text not null references players(id) on delete cascade,
  to_player   text not null references players(id) on delete cascade,
  body        text not null,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Admin broadcast announcements: Claire H. posts → everyone sees them in the News tab.
create table if not exists announcements (
  id          text primary key,
  body        text not null,
  by_player   text references players(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Per-player "last time I opened the News tab" — anything newer counts as unread.
alter table players add column if not exists news_seen_at timestamptz;

-- Lightweight play-session log (admin-read only). One row per session; a >10-min
-- online gap starts a new one. Online time = last_ping_at − started_at;
-- active time = active_seconds (only beats with real input accrue it).
create table if not exists sessions (
  id             text primary key,
  player_id      text not null references players(id) on delete cascade,
  started_at     timestamptz not null default now(),
  last_ping_at   timestamptz not null default now(),
  last_active_at timestamptz,
  active_seconds integer not null default 0
);

create index if not exists idx_inventory_player on inventory(player_id);
create index if not exists idx_trades_to on trades(to_player, status);
create index if not exists idx_messages_to on messages(to_player, read);
create index if not exists idx_announcements_created on announcements(created_at desc);
create index if not exists idx_sessions_player on sessions(player_id, last_ping_at desc);

-- Row Level Security: all writes go through Vercel serverless functions using the
-- service-role key (which bypasses RLS). Enable RLS and add NO public policies so the
-- anon key can't read/write directly. (Realtime presence uses Supabase Realtime channels.)
alter table players       enable row level security;
alter table secret_codes  enable row level security;
alter table shops         enable row level security;
alter table inventory     enable row level security;
alter table creations     enable row level security;
alter table trades        enable row level security;
alter table messages      enable row level security;
alter table announcements enable row level security;
alter table sessions      enable row level security;

-- The serverless functions use the service_role key (bypasses RLS). On new projects
-- with the new API keys, that role may lack table grants, so grant them explicitly.
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
