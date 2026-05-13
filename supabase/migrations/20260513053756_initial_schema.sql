-- =====================
-- MEX 初期スキーマ
-- =====================

-- seasons
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  started_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'closed')),
  created_at timestamptz not null default now()
);

-- users
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  mpoint_account_id text,
  mpoint_access_token text,
  joined_at timestamptz not null default now()
);

-- stocks
create table public.stocks (
  id uuid primary key default gen_random_uuid(),
  ticker text unique not null,
  name text not null,
  type text not null check (type in ('fictional', 'insider')),
  owner_user_id uuid references public.users(id),
  stock_pool numeric not null default 10000,
  mpoint_pool numeric not null default 10000,
  k_constant numeric not null default 100000000,
  mpoint_account_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- holdings
create table public.holdings (
  user_id uuid not null references public.users(id) on delete cascade,
  stock_id uuid not null references public.stocks(id) on delete cascade,
  quantity numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, stock_id)
);

-- pending_trades
create table public.pending_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  stock_id uuid not null references public.stocks(id) on delete cascade,
  side text not null check (side in ('buy', 'sell')),
  mpoint_amount numeric not null,
  expected_stock numeric not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'failed')),
  created_at timestamptz not null default now()
);

-- trades
create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  stock_id uuid not null references public.stocks(id) on delete cascade,
  side text not null check (side in ('buy', 'sell')),
  mpoint_amount numeric not null,
  stock_amount numeric not null,
  price numeric not null,
  fee numeric not null default 0,
  mpoint_tx_id text,
  executed_at timestamptz not null default now()
);

-- price_history
create table public.price_history (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references public.stocks(id) on delete cascade,
  price numeric not null,
  recorded_at timestamptz not null default now()
);

-- events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid references public.stocks(id) on delete cascade,
  event_type text not null,
  impact_pct numeric not null,
  headline text not null,
  occurred_at timestamptz not null default now()
);

-- =====================
-- RLS 有効化
-- =====================
alter table public.seasons enable row level security;
alter table public.users enable row level security;
alter table public.stocks enable row level security;
alter table public.holdings enable row level security;
alter table public.pending_trades enable row level security;
alter table public.trades enable row level security;
alter table public.price_history enable row level security;
alter table public.events enable row level security;

-- =====================
-- RLS ポリシー
-- =====================

-- seasons: 全員読み取り可
create policy "seasons_select" on public.seasons for select using (true);

-- users: 自分の行のみ
create policy "users_select" on public.users for select using (auth.uid() = id);
create policy "users_insert" on public.users for insert with check (auth.uid() = id);

-- stocks: 全員読み取り可
create policy "stocks_select" on public.stocks for select using (true);

-- holdings: 自分の行のみ
create policy "holdings_select" on public.holdings for select using (auth.uid() = user_id);

-- pending_trades: 自分の行のみ
create policy "pending_trades_select" on public.pending_trades for select using (auth.uid() = user_id);

-- trades: 自分の行のみ
create policy "trades_select" on public.trades for select using (auth.uid() = user_id);

-- price_history: 全員読み取り可
create policy "price_history_select" on public.price_history for select using (true);

-- events: 全員読み取り可
create policy "events_select" on public.events for select using (true);

-- =====================
-- ユーザー自動作成トリガー
-- =====================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();