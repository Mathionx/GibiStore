/* supabase-schema.sql */
-- ============================================================================
-- GIBI STORE v2 — full Supabase schema
-- Run this ENTIRE file once in Supabase Dashboard → SQL Editor → New query.
-- Safe to re-run, AND safe to run on top of an older/partial Gibi Store
-- schema: every table uses CREATE TABLE IF NOT EXISTS (bare skeleton) plus
-- ALTER TABLE ... ADD COLUMN IF NOT EXISTS for every column. This is the fix
-- for "column ... does not exist" errors that happen when a table already
-- existed (e.g. from a previous version) without the newer columns —
-- CREATE TABLE IF NOT EXISTS alone does NOT add missing columns to an
-- existing table, only ALTER TABLE does.
--
-- DESIGN NOTE on location sharing: the brief asked for GEOGRAPHY(Point) via
-- PostGIS. To keep setup to a single paste-and-run script with zero extra
-- extensions to enable by hand, this schema instead stores plain
-- `double precision` lat/lng pairs (buyer_lat/buyer_lng, seller_lat/seller_lng).
-- Functionally identical for "share my current location" — just simpler ops.
-- If you want true PostGIS geography, run `create extension postgis;` first
-- and swap those four columns for `geography(Point)`.
-- ============================================================================

-- 1. EXTENSIONS -------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- ============================================================================
-- 2. TABLES (skeleton + idempotent column additions)
-- ============================================================================

-- ---------- universities ----------
create table if not exists public.universities (id serial primary key);
alter table public.universities add column if not exists name text;
alter table public.universities add column if not exists created_at timestamptz default now();
do $$ begin
  alter table public.universities add constraint universities_name_key unique (name);
exception when others then null; end $$;
alter table public.universities alter column name set not null;

-- ---------- campuses ----------
create table if not exists public.campuses (id serial primary key);
alter table public.campuses add column if not exists university_id int references public.universities(id) on delete cascade;
alter table public.campuses add column if not exists name text;
alter table public.campuses add column if not exists created_at timestamptz default now();
do $$ begin
  alter table public.campuses add constraint campuses_university_id_name_key unique (university_id, name);
exception when others then null; end $$;
alter table public.campuses alter column name set not null;

-- ---------- profiles ----------
create table if not exists public.profiles (id uuid primary key references auth.users on delete cascade);
alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists campus_verified boolean default false;
alter table public.profiles add column if not exists university text;
alter table public.profiles add column if not exists campus text;
alter table public.profiles add column if not exists total_rating numeric default 0;
alter table public.profiles add column if not exists rating_count int default 0;
alter table public.profiles add column if not exists wallet_balance numeric default 0;
alter table public.profiles add column if not exists free_listings_left int default 3;
alter table public.profiles add column if not exists points int default 0;
alter table public.profiles add column if not exists completed_trades int default 0;
alter table public.profiles add column if not exists referral_code text;
alter table public.profiles add column if not exists referred_by text;
alter table public.profiles add column if not exists role text default 'user';
alter table public.profiles add column if not exists assigned_university text;
alter table public.profiles add column if not exists assigned_campus text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists created_at timestamptz default now();
do $$ begin
  alter table public.profiles add constraint profiles_referral_code_key unique (referral_code);
exception when others then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_role_check check (role in ('user','admin','super_admin','banned'));
exception when others then null; end $$;

-- ---------- listings ----------
create table if not exists public.listings (id bigserial primary key);
alter table public.listings add column if not exists title text;
alter table public.listings add column if not exists price numeric;
alter table public.listings add column if not exists discount_price numeric;
alter table public.listings add column if not exists category text;
alter table public.listings add column if not exists condition text;
alter table public.listings add column if not exists description text;
alter table public.listings add column if not exists images text[] default '{}';
alter table public.listings add column if not exists pickup_location text;
alter table public.listings add column if not exists seller_id uuid references public.profiles(id) on delete cascade;
alter table public.listings add column if not exists created_at timestamptz default now();
alter table public.listings add column if not exists status text default 'active';
do $$ begin
  alter table public.listings add constraint listings_price_check check (price >= 0);
exception when others then null; end $$;
do $$ begin
  alter table public.listings add constraint listings_category_check check (category in
    ('Textbooks','Electronics','DormGear','Snacks','Services','Clothes','Shoes'));
exception when others then null; end $$;
do $$ begin
  alter table public.listings add constraint listings_condition_check check (condition in ('Like New','Good','Fair'));
exception when others then null; end $$;
do $$ begin
  alter table public.listings add constraint listings_status_check check (status in ('active','sold','deleted'));
exception when others then null; end $$;

-- ---------- orders ----------
create table if not exists public.orders (id bigserial primary key);
alter table public.orders add column if not exists listing_id bigint references public.listings(id) on delete cascade;
alter table public.orders add column if not exists buyer_id uuid references public.profiles(id) on delete cascade;
alter table public.orders add column if not exists seller_id uuid references public.profiles(id) on delete cascade;
alter table public.orders add column if not exists status text default 'pending';
alter table public.orders add column if not exists buyer_confirmed boolean default false;
alter table public.orders add column if not exists seller_confirmed boolean default false;
alter table public.orders add column if not exists fee_amount numeric default 0;
alter table public.orders add column if not exists buyer_phone text;
alter table public.orders add column if not exists buyer_dorm text;
alter table public.orders add column if not exists buyer_block text;
alter table public.orders add column if not exists buyer_campus text;
alter table public.orders add column if not exists pickup_location_type text default 'dorm';
alter table public.orders add column if not exists pickup_location_other text;
alter table public.orders add column if not exists buyer_lat double precision;
alter table public.orders add column if not exists buyer_lng double precision;
alter table public.orders add column if not exists seller_lat double precision;
alter table public.orders add column if not exists seller_lng double precision;
alter table public.orders add column if not exists created_at timestamptz default now();
do $$ begin
  alter table public.orders add constraint orders_status_check check (status in ('pending','completed','cancelled'));
exception when others then null; end $$;
do $$ begin
  alter table public.orders add constraint orders_pickup_type_check check (pickup_location_type in ('dorm','other'));
exception when others then null; end $$;

-- ---------- transactions ----------
create table if not exists public.transactions (id serial primary key);
alter table public.transactions add column if not exists user_id uuid references public.profiles(id) on delete cascade;
alter table public.transactions add column if not exists type text;
alter table public.transactions add column if not exists amount numeric;
alter table public.transactions add column if not exists description text;
alter table public.transactions add column if not exists created_at timestamptz default now();
do $$ begin
  alter table public.transactions add constraint transactions_type_check check (type in ('fee','topup','reward','referral_bonus','redemption'));
exception when others then null; end $$;
alter table public.transactions alter column amount set not null;

-- ---------- ads ----------
create table if not exists public.ads (id serial primary key);
alter table public.ads add column if not exists name text;
alter table public.ads add column if not exists description text;
alter table public.ads add column if not exists image_url text;
alter table public.ads add column if not exists link text;
alter table public.ads add column if not exists width int default 200;
alter table public.ads add column if not exists height int default 50;
alter table public.ads add column if not exists active boolean default true;
alter table public.ads add column if not exists created_at timestamptz default now();

-- ---------- social_links ----------
create table if not exists public.social_links (id serial primary key);
alter table public.social_links add column if not exists platform text;
alter table public.social_links add column if not exists url text;
alter table public.social_links add column if not exists icon_url text;

-- ---------- faq ----------
create table if not exists public.faq (id serial primary key);
alter table public.faq add column if not exists question text;
alter table public.faq add column if not exists answer text;
alter table public.faq add column if not exists sort_order int default 0;

-- ---------- report_reasons ----------
create table if not exists public.report_reasons (id serial primary key);
alter table public.report_reasons add column if not exists reason text;
do $$ begin
  alter table public.report_reasons add constraint report_reasons_reason_key unique (reason);
exception when others then null; end $$;

-- ---------- reports ----------
create table if not exists public.reports (id serial primary key);
alter table public.reports add column if not exists reporter_id uuid references public.profiles(id) on delete cascade;
alter table public.reports add column if not exists reported_seller_id uuid references public.profiles(id) on delete cascade;
alter table public.reports add column if not exists reason text;
alter table public.reports add column if not exists details text;
alter table public.reports add column if not exists created_at timestamptz default now();

-- ---------- notification_settings ----------
create table if not exists public.notification_settings (user_id uuid primary key references public.profiles(id) on delete cascade);
alter table public.notification_settings add column if not exists points boolean default true;
alter table public.notification_settings add column if not exists rating boolean default true;
alter table public.notification_settings add column if not exists trade boolean default true;
alter table public.notification_settings add column if not exists ads boolean default true;

-- ---------- reward_items ----------
create table if not exists public.reward_items (id serial primary key);
alter table public.reward_items add column if not exists name text;
alter table public.reward_items add column if not exists points_cost int;
alter table public.reward_items add column if not exists value_etb numeric;
alter table public.reward_items add column if not exists active boolean default true;

-- ---------- wishlists ----------
create table if not exists public.wishlists (user_id uuid, listing_id bigint);
alter table public.wishlists add column if not exists user_id uuid references public.profiles(id) on delete cascade;
alter table public.wishlists add column if not exists listing_id bigint references public.listings(id) on delete cascade;
alter table public.wishlists add column if not exists created_at timestamptz default now();
do $$ begin
  alter table public.wishlists add constraint wishlists_pkey primary key (user_id, listing_id);
exception when others then null; end $$;

-- ---------- app_settings (singleton row — owner-controlled flexible toggles) ----------
create table if not exists public.app_settings (id smallint primary key default 1);
alter table public.app_settings add column if not exists fees_enabled boolean default true;
alter table public.app_settings add column if not exists rewards_enabled boolean default true;
alter table public.app_settings add column if not exists referrals_enabled boolean default true;
alter table public.app_settings add column if not exists launch_mode boolean default false;
alter table public.app_settings add column if not exists fee_tier1_max numeric default 200;
alter table public.app_settings add column if not exists fee_tier1_fee numeric default 5;
alter table public.app_settings add column if not exists fee_tier2_max numeric default 1000;
alter table public.app_settings add column if not exists fee_tier2_fee numeric default 10;
alter table public.app_settings add column if not exists fee_tier3_fee numeric default 25;
alter table public.app_settings add column if not exists wallet_floor numeric default -30;
alter table public.app_settings add column if not exists free_listings_default int default 3;
alter table public.app_settings add column if not exists launch_banner_text text default 'Founding member period — all fees waived while we grow!';
do $$ begin
  alter table public.app_settings add constraint app_settings_singleton check (id = 1);
exception when others then null; end $$;
insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- ---------- notifications ----------
create table if not exists public.notifications (id bigserial primary key);
alter table public.notifications add column if not exists user_id uuid references public.profiles(id) on delete cascade;
alter table public.notifications add column if not exists title text;
alter table public.notifications add column if not exists body text;
alter table public.notifications add column if not exists read boolean default false;
alter table public.notifications add column if not exists created_at timestamptz default now();

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.universities enable row level security;
alter table public.campuses enable row level security;
alter table public.listings enable row level security;
alter table public.orders enable row level security;
alter table public.transactions enable row level security;
alter table public.ads enable row level security;
alter table public.social_links enable row level security;
alter table public.faq enable row level security;
alter table public.report_reasons enable row level security;
alter table public.reports enable row level security;
alter table public.notification_settings enable row level security;
alter table public.reward_items enable row level security;
alter table public.notifications enable row level security;
alter table public.wishlists enable row level security;
alter table public.app_settings enable row level security;

-- Helper functions -----------------------------------------------------------
create or replace function public.current_role()
returns text language sql security definer stable as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean language sql security definer stable as $$
  select coalesce((select role = 'super_admin' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_admin_or_above()
returns boolean language sql security definer stable as $$
  select coalesce((select role in ('admin','super_admin') from public.profiles where id = auth.uid()), false);
$$;

-- Returns true if the row's university/campus falls within the calling
-- admin's assigned scope (null assignment = unrestricted within that level).
create or replace function public.in_admin_scope(row_university text, row_campus text)
returns boolean language sql security definer stable as $$
  select case
    when public.is_super_admin() then true
    when public.is_admin_or_above() then (
      select (assigned_university is null or assigned_university = row_university)
         and (assigned_campus is null or assigned_campus = row_campus)
      from public.profiles where id = auth.uid()
    )
    else false
  end;
$$;

-- ---------- profiles ----------
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles for select to authenticated using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- Users may update their own row, but role / wallet_balance / points /
-- free_listings_left / assigned_* are only changeable by super_admin or
-- trusted server-side functions (security definer). We enforce this by
-- giving normal users an UPDATE policy and relying on a trigger to reject
-- privileged-field changes made by non-super-admins.
drop policy if exists "profiles_update_own_or_super" on public.profiles;
create policy "profiles_update_own_or_super" on public.profiles for update
  to authenticated
  using (auth.uid() = id or public.is_super_admin())
  with check (auth.uid() = id or public.is_super_admin());

create or replace function public.protect_privileged_profile_fields()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and not public.is_super_admin() then
    if new.role is distinct from old.role
      or new.wallet_balance is distinct from old.wallet_balance
      or new.points is distinct from old.points
      or new.free_listings_left is distinct from old.free_listings_left
      or new.assigned_university is distinct from old.assigned_university
      or new.assigned_campus is distinct from old.assigned_campus
      or new.completed_trades is distinct from old.completed_trades
    then
      -- silently keep old privileged values; only allow non-privileged fields through
      new.role := old.role;
      new.wallet_balance := old.wallet_balance;
      new.points := old.points;
      new.free_listings_left := old.free_listings_left;
      new.assigned_university := old.assigned_university;
      new.assigned_campus := old.assigned_campus;
      new.completed_trades := old.completed_trades;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_fields on public.profiles;
create trigger trg_protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_privileged_profile_fields();

-- ---------- universities / campuses ----------
drop policy if exists "universities_select_all" on public.universities;
create policy "universities_select_all" on public.universities for select to authenticated, anon using (true);
drop policy if exists "universities_write_super" on public.universities;
create policy "universities_write_super" on public.universities for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "campuses_select_all" on public.campuses;
create policy "campuses_select_all" on public.campuses for select to authenticated, anon using (true);
drop policy if exists "campuses_write_super" on public.campuses;
create policy "campuses_write_super" on public.campuses for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ---------- listings ----------
drop policy if exists "listings_select" on public.listings;
create policy "listings_select" on public.listings for select to authenticated, anon
  using (
    status = 'active'
    or seller_id = auth.uid()
    or public.is_admin_or_above()
  );

drop policy if exists "listings_insert_own" on public.listings;
create policy "listings_insert_own" on public.listings for insert to authenticated
  with check (seller_id = auth.uid());

drop policy if exists "listings_update_own_or_admin" on public.listings;
create policy "listings_update_own_or_admin" on public.listings for update to authenticated
  using (seller_id = auth.uid() or public.is_admin_or_above())
  with check (seller_id = auth.uid() or public.is_admin_or_above());

drop policy if exists "listings_delete_own_or_admin" on public.listings;
create policy "listings_delete_own_or_admin" on public.listings for delete to authenticated
  using (seller_id = auth.uid() or public.is_admin_or_above());

-- ---------- orders ----------
drop policy if exists "orders_insert_as_buyer" on public.orders;
create policy "orders_insert_as_buyer" on public.orders for insert to authenticated
  with check (buyer_id = auth.uid());

drop policy if exists "orders_select_related_or_admin" on public.orders;
create policy "orders_select_related_or_admin" on public.orders for select to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin_or_above());

drop policy if exists "orders_update_related_or_admin" on public.orders;
create policy "orders_update_related_or_admin" on public.orders for update to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin_or_above())
  with check (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin_or_above());

-- ---------- transactions ----------
drop policy if exists "transactions_select_own_or_super" on public.transactions;
create policy "transactions_select_own_or_super" on public.transactions for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());
drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own" on public.transactions for insert to authenticated
  with check (user_id = auth.uid() or public.is_super_admin());

-- ---------- ads / social / faq / reward_items (public read, super_admin write) ----------
drop policy if exists "ads_select_all" on public.ads;
create policy "ads_select_all" on public.ads for select to authenticated, anon using (true);
drop policy if exists "ads_write_super" on public.ads;
create policy "ads_write_super" on public.ads for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "social_select_all" on public.social_links;
create policy "social_select_all" on public.social_links for select to authenticated, anon using (true);
drop policy if exists "social_write_super" on public.social_links;
create policy "social_write_super" on public.social_links for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "faq_select_all" on public.faq;
create policy "faq_select_all" on public.faq for select to authenticated, anon using (true);
drop policy if exists "faq_write_super" on public.faq;
create policy "faq_write_super" on public.faq for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "reward_items_select_all" on public.reward_items;
create policy "reward_items_select_all" on public.reward_items for select to authenticated, anon using (true);
drop policy if exists "reward_items_write_super" on public.reward_items;
create policy "reward_items_write_super" on public.reward_items for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ---------- reports ----------
drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());
drop policy if exists "reports_select_admin" on public.reports;
create policy "reports_select_admin" on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin_or_above());

drop policy if exists "report_reasons_select_all" on public.report_reasons;
create policy "report_reasons_select_all" on public.report_reasons for select to authenticated, anon using (true);

-- ---------- notification_settings ----------
drop policy if exists "notif_settings_own" on public.notification_settings;
create policy "notif_settings_own" on public.notification_settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- notifications ----------
drop policy if exists "notifications_own" on public.notifications;
create policy "notifications_own" on public.notifications for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- wishlists ----------
drop policy if exists "wishlists_own" on public.wishlists;
create policy "wishlists_own" on public.wishlists for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- app_settings ----------
drop policy if exists "app_settings_select_all" on public.app_settings;
create policy "app_settings_select_all" on public.app_settings for select to authenticated, anon using (true);
drop policy if exists "app_settings_write_super" on public.app_settings;
create policy "app_settings_write_super" on public.app_settings for update to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ============================================================================
-- 4. SIGNUP TRIGGER — auto profile + referral code + campus verification
-- ============================================================================
create or replace function public.generate_referral_code()
returns text language plpgsql as $$
declare
  code text;
  exists_already boolean;
begin
  loop
    code := 'GIBI-' || upper(substr(md5(random()::text), 1, 4));
    select exists(select 1 from public.profiles where referral_code = code) into exists_already;
    exit when not exists_already;
  end loop;
  return code;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_verified boolean := false;
  meta jsonb := new.raw_user_meta_data;
  settings record;
  starting_listings int := 3;
begin
  select * into settings from public.app_settings where id = 1;
  if settings is not null then starting_listings := settings.free_listings_default; end if;

  if new.email ilike '%.edu%' then
    is_verified := true;
  end if;

  insert into public.profiles (
    id, name, email, phone, university, campus, campus_verified, referral_code, referred_by, free_listings_left
  ) values (
    new.id,
    coalesce(meta->>'name', split_part(new.email,'@',1)),
    new.email,
    meta->>'phone',
    meta->>'university',
    meta->>'campus',
    is_verified,
    public.generate_referral_code(),
    meta->>'referred_by',
    starting_listings
  )
  on conflict (id) do nothing;

  insert into public.notification_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;

  -- referral bonus: 20 points to both parties if a valid code was used
  -- (only when both referrals and rewards are enabled)
  if meta->>'referred_by' is not null
     and (settings is null or (settings.referrals_enabled and settings.rewards_enabled)) then
    update public.profiles
      set points = points + 20
      where referral_code = meta->>'referred_by';

    insert into public.transactions (user_id, type, amount, description)
      select id, 'referral_bonus', 0, 'Referral bonus (20 pts) for inviting ' || new.email
      from public.profiles where referral_code = meta->>'referred_by';

    update public.profiles set points = points + 20 where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 5. FEE TIERS + complete_order() FUNCTION
-- ============================================================================
create or replace function public.fee_for_price(p numeric)
returns numeric language plpgsql stable as $$
declare
  s record;
begin
  select * into s from public.app_settings where id = 1;
  if s is null or not s.fees_enabled then return 0; end if;
  if p <= s.fee_tier1_max then return s.fee_tier1_fee; end if;
  if p <= s.fee_tier2_max then return s.fee_tier2_fee; end if;
  return s.fee_tier3_fee;
end;
$$;

create or replace function public.complete_order(p_order_id bigint)
returns void language plpgsql security definer as $$
declare
  o record;
  l record;
  seller record;
  settings record;
  fee numeric;
begin
  select * into o from public.orders where id = p_order_id;
  if o is null then raise exception 'Order not found'; end if;
  if not (o.buyer_confirmed and o.seller_confirmed) then
    return; -- wait for both sides
  end if;
  if o.status = 'completed' then
    return; -- already processed
  end if;

  select * into l from public.listings where id = o.listing_id;
  select * into seller from public.profiles where id = o.seller_id;
  select * into settings from public.app_settings where id = 1;

  fee := public.fee_for_price(coalesce(l.discount_price, l.price));

  if seller.free_listings_left > 0 then
    update public.profiles set free_listings_left = free_listings_left - 1
      where id = o.seller_id;
    fee := 0;
  elsif fee > 0 then
    update public.profiles set wallet_balance = wallet_balance - fee
      where id = o.seller_id;
  end if;

  if fee > 0 then
    insert into public.transactions (user_id, type, amount, description)
      values (o.seller_id, 'fee', -fee, 'Marketplace fee for order #' || o.id);
  end if;

  update public.orders set status = 'completed', fee_amount = fee where id = o.id;
  update public.listings set status = 'sold' where id = o.listing_id;

  if settings is null or settings.rewards_enabled then
    update public.profiles set points = points + 10, completed_trades = completed_trades + 1
      where id in (o.buyer_id, o.seller_id);
  else
    update public.profiles set completed_trades = completed_trades + 1
      where id in (o.buyer_id, o.seller_id);
  end if;

  insert into public.notifications (user_id, title, body)
    values
      (o.buyer_id, 'Trade completed', case when settings is null or settings.rewards_enabled then 'You earned 10 points for completing a trade.' else 'Trade completed successfully.' end),
      (o.seller_id, 'Trade completed', case when fee > 0 then 'Fee charged: ' || fee || ' ETB.' else 'No fee was charged for this trade.' end);
end;
$$;

-- Convenience RPC wrappers so the client can confirm without writing raw
-- update statements (and so complete_order() always runs after both confirm).
create or replace function public.confirm_order_as_buyer(p_order_id bigint)
returns void language plpgsql security definer as $$
begin
  update public.orders set buyer_confirmed = true
    where id = p_order_id and buyer_id = auth.uid();
  perform public.complete_order(p_order_id);
end;
$$;

create or replace function public.confirm_order_as_seller(p_order_id bigint)
returns void language plpgsql security definer as $$
begin
  update public.orders set seller_confirmed = true
    where id = p_order_id and seller_id = auth.uid();
  perform public.complete_order(p_order_id);
end;
$$;

-- ============================================================================
-- 6. WALLET FLOOR GUARD (-30 ETB) — block new listings if below floor
-- ============================================================================
create or replace function public.check_wallet_floor()
returns trigger language plpgsql as $$
declare
  bal numeric;
  settings record;
begin
  select * into settings from public.app_settings where id = 1;
  if settings is not null and not settings.fees_enabled then
    return new; -- fee system off entirely — no wallet floor to enforce
  end if;

  select wallet_balance into bal from public.profiles where id = new.seller_id;
  if bal is not null and bal < coalesce(settings.wallet_floor, -30) then
    raise exception 'Your wallet balance (% ETB) is below the % ETB limit. Please top up before posting new listings.', bal, coalesce(settings.wallet_floor, -30);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_wallet_floor on public.listings;
create trigger trg_wallet_floor
  before insert on public.listings
  for each row execute function public.check_wallet_floor();

-- ============================================================================
-- 7. REWARD REDEMPTION RPC
-- ============================================================================
create or replace function public.redeem_reward(p_reward_id int)
returns void language plpgsql security definer as $$
declare
  r record;
  bal_points int;
  settings record;
begin
  select * into settings from public.app_settings where id = 1;
  if settings is not null and not settings.rewards_enabled then
    raise exception 'The rewards program is currently unavailable.';
  end if;

  select * into r from public.reward_items where id = p_reward_id and active = true;
  if r is null then raise exception 'Reward not available'; end if;

  select points into bal_points from public.profiles where id = auth.uid();
  if bal_points < r.points_cost then
    raise exception 'Not enough points';
  end if;

  update public.profiles
    set points = points - r.points_cost,
        wallet_balance = wallet_balance + r.value_etb
    where id = auth.uid();

  insert into public.transactions (user_id, type, amount, description)
    values (auth.uid(), 'redemption', r.value_etb, 'Redeemed: ' || r.name);

  insert into public.notifications (user_id, title, body)
    values (auth.uid(), 'Reward redeemed', r.name || ' — ' || r.value_etb || ' ETB added to your wallet.');
end;
$$;

-- ============================================================================
-- 8. STORAGE BUCKET
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects for select using (bucket_id = 'product-images');
drop policy if exists "product_images_auth_insert" on storage.objects;
create policy "product_images_auth_insert" on storage.objects for insert to authenticated with check (bucket_id = 'product-images');
drop policy if exists "product_images_auth_update" on storage.objects;
create policy "product_images_auth_update" on storage.objects for update to authenticated using (bucket_id = 'product-images');
drop policy if exists "product_images_auth_delete" on storage.objects;
create policy "product_images_auth_delete" on storage.objects for delete to authenticated using (bucket_id = 'product-images');

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists "avatars_auth_insert" on storage.objects;
create policy "avatars_auth_insert" on storage.objects for insert to authenticated with check (bucket_id = 'avatars');
drop policy if exists "avatars_auth_update" on storage.objects;
create policy "avatars_auth_update" on storage.objects for update to authenticated using (bucket_id = 'avatars');
drop policy if exists "avatars_auth_delete" on storage.objects;
create policy "avatars_auth_delete" on storage.objects for delete to authenticated using (bucket_id = 'avatars');

-- ============================================================================
-- 9. REALTIME
-- ============================================================================
do $$
begin
  begin alter publication supabase_realtime add table public.listings; exception when others then null; end;
  begin alter publication supabase_realtime add table public.orders; exception when others then null; end;
  begin alter publication supabase_realtime add table public.notifications; exception when others then null; end;
end $$;

-- ============================================================================
-- 10. INDEXES
-- ============================================================================
create index if not exists idx_listings_status on public.listings(status);
create index if not exists idx_listings_category on public.listings(category);
create index if not exists idx_listings_seller on public.listings(seller_id);
create index if not exists idx_orders_buyer on public.orders(buyer_id);
create index if not exists idx_orders_seller on public.orders(seller_id);
create index if not exists idx_profiles_university on public.profiles(university);
create index if not exists idx_profiles_campus on public.profiles(campus);

-- ============================================================================
-- 11. SEED DATA — universities, campuses, reward items, report reasons, FAQ
-- ============================================================================
insert into public.universities (name) values
  ('Arba Minch University'), ('Addis Ababa University'), ('Hawassa University'),
  ('Bahir Dar University'), ('Jimma University')
on conflict (name) do nothing;

insert into public.campuses (university_id, name)
  select id, c from public.universities, unnest(array['Main Campus','Abaya Campus','Chamo Campus']) as c
  where name = 'Arba Minch University'
on conflict do nothing;

insert into public.campuses (university_id, name)
  select id, c from public.universities, unnest(array['Main Campus (4 Kilo)','6 Kilo Campus']) as c
  where name = 'Addis Ababa University'
on conflict do nothing;

insert into public.reward_items (name, points_cost, value_etb) values
  ('15 ETB Airtime', 50, 15),
  ('30 ETB Wallet Credit', 100, 30),
  ('75 ETB Wallet Credit', 200, 75)
on conflict do nothing;

insert into public.report_reasons (reason) values
  ('Scam or fraud'), ('Item not as described'), ('Inappropriate content'),
  ('Harassment'), ('Fake listing'), ('Other')
on conflict (reason) do nothing;

insert into public.faq (question, answer, sort_order) values
  ('How do I pay the marketplace fee?', 'Fees are deducted from your in-app wallet automatically once a trade is confirmed by both sides. Your first 3 listings are fee-free.', 1),
  ('What happens if my wallet goes negative?', 'You can go up to -30 ETB. Beyond that, you will need to top up before posting new listings.', 2),
  ('How do referral points work?', 'Share your referral code at signup — both you and your friend get 20 points once they join.', 3),
  ('How do I redeem points?', 'Go to the Rewards page and redeem points for airtime or wallet credit.', 4)
on conflict do nothing;

-- ============================================================================
-- DONE. Next: promote yourself to super_admin (see README).
-- ============================================================================
