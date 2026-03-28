-- =============================================================
-- Tokoco initial schema
-- Applies: tables, indexes, triggers, RLS policies
-- =============================================================

-- ---------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------
create extension if not exists moddatetime schema extensions;

-- ---------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------

-- profiles (1:1 with auth.users)
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- shops
create table public.shops (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  name            text not null,
  area            text,
  address         text,
  phone           text,
  category        text,
  price_range     text check (price_range in ('〜¥999', '¥1,000〜¥2,999', '¥3,000〜¥5,999', '¥6,000〜¥9,999', '¥10,000〜', '価格帯不明')),
  external_rating numeric(3, 1),
  business_hours  text,
  website_url     text,
  google_maps_url text,
  source_url      text,
  photo_url       text,
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- tags
create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- shop_tags
create table public.shop_tags (
  id      uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  tag_id  uuid not null references public.tags(id) on delete cascade,
  unique (shop_id, tag_id)
);

-- events
create table public.events (
  id            uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  description   text,
  share_token   text not null unique,
  closed_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- event_shops
create table public.event_shops (
  id       uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  shop_id  uuid not null references public.shops(id) on delete cascade,
  unique (event_id, shop_id)
);

-- votes
create table public.votes (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  voter_name text not null,
  user_id    uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- vote_choices
create table public.vote_choices (
  id            uuid primary key default gen_random_uuid(),
  vote_id       uuid not null references public.votes(id) on delete cascade,
  event_shop_id uuid not null references public.event_shops(id) on delete cascade,
  unique (vote_id, event_shop_id)
);

-- ---------------------------------------------------------------
-- updated_at auto-update triggers (moddatetime)
-- ---------------------------------------------------------------
create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function extensions.moddatetime(updated_at);

create trigger set_updated_at_shops
  before update on public.shops
  for each row execute function extensions.moddatetime(updated_at);

create trigger set_updated_at_events
  before update on public.events
  for each row execute function extensions.moddatetime(updated_at);

-- ---------------------------------------------------------------
-- Trigger: on_auth_user_created
-- profiles レコードを auth.users INSERT 時に自動生成 (AUTH-04)
-- ---------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', '名無し')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- Trigger: on_profile_deleted
-- 退会時に votes.voter_name を匿名化 (AUTH-15)
-- ---------------------------------------------------------------
create or replace function public.handle_user_delete()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.votes
  set voter_name = '退会済みユーザー'
  where user_id = old.id;
  return old;
end;
$$;

create trigger on_profile_deleted
  before delete on public.profiles
  for each row execute function public.handle_user_delete();

-- ---------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------

-- shops
create index idx_shops_user_id       on public.shops(user_id);
create index idx_shops_user_category on public.shops(user_id, category);
create index idx_shops_user_price    on public.shops(user_id, price_range);
create index idx_shops_user_area     on public.shops(user_id, area);

-- tags
create index idx_tags_user_id        on public.tags(user_id);

-- shop_tags
create index idx_shop_tags_shop_id   on public.shop_tags(shop_id);
create index idx_shop_tags_tag_id    on public.shop_tags(tag_id);

-- events
create index idx_events_owner_user_id on public.events(owner_user_id);
create index idx_events_share_token   on public.events(share_token);

-- event_shops
create index idx_event_shops_event_id on public.event_shops(event_id);

-- votes
create index idx_votes_event_id       on public.votes(event_id);

-- vote_choices
create index idx_vote_choices_vote_id       on public.vote_choices(vote_id);
create index idx_vote_choices_event_shop_id on public.vote_choices(event_shop_id);

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------

-- profiles
alter table public.profiles enable row level security;

create policy "profiles: select own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

-- shops
alter table public.shops enable row level security;

create policy "shops: select own" on public.shops
  for select using (auth.uid() = user_id);

create policy "shops: insert own" on public.shops
  for insert with check (auth.uid() = user_id);

create policy "shops: update own" on public.shops
  for update using (auth.uid() = user_id);

create policy "shops: delete own" on public.shops
  for delete using (auth.uid() = user_id);

-- tags
alter table public.tags enable row level security;

create policy "tags: select own" on public.tags
  for select using (auth.uid() = user_id);

create policy "tags: insert own" on public.tags
  for insert with check (auth.uid() = user_id);

create policy "tags: delete own" on public.tags
  for delete using (auth.uid() = user_id);

-- shop_tags
alter table public.shop_tags enable row level security;

create policy "shop_tags: select own" on public.shop_tags
  for select using (
    exists (select 1 from public.shops where shops.id = shop_tags.shop_id and shops.user_id = auth.uid())
  );

create policy "shop_tags: insert own" on public.shop_tags
  for insert with check (
    exists (select 1 from public.shops where shops.id = shop_tags.shop_id and shops.user_id = auth.uid())
  );

create policy "shop_tags: delete own" on public.shop_tags
  for delete using (
    exists (select 1 from public.shops where shops.id = shop_tags.shop_id and shops.user_id = auth.uid())
  );

-- events
alter table public.events enable row level security;

create policy "events: select own" on public.events
  for select using (auth.uid() = owner_user_id);

create policy "events: insert own" on public.events
  for insert with check (auth.uid() = owner_user_id);

create policy "events: update own" on public.events
  for update using (auth.uid() = owner_user_id);

create policy "events: delete own" on public.events
  for delete using (auth.uid() = owner_user_id);

-- event_shops
alter table public.event_shops enable row level security;

create policy "event_shops: select own" on public.event_shops
  for select using (
    exists (select 1 from public.events where events.id = event_shops.event_id and events.owner_user_id = auth.uid())
  );

create policy "event_shops: insert own" on public.event_shops
  for insert with check (
    exists (select 1 from public.events where events.id = event_shops.event_id and events.owner_user_id = auth.uid())
  );

create policy "event_shops: delete own" on public.event_shops
  for delete using (
    exists (select 1 from public.events where events.id = event_shops.event_id and events.owner_user_id = auth.uid())
  );

-- votes
alter table public.votes enable row level security;

create policy "votes: select own event" on public.votes
  for select using (
    exists (select 1 from public.events where events.id = votes.event_id and events.owner_user_id = auth.uid())
  );

-- vote_choices
alter table public.vote_choices enable row level security;

create policy "vote_choices: select own event" on public.vote_choices
  for select using (
    exists (
      select 1 from public.votes
      join public.events on events.id = votes.event_id
      where votes.id = vote_choices.vote_id and events.owner_user_id = auth.uid()
    )
  );
