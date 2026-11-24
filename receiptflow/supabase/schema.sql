-- ============================================================================
-- ReceiptFlow database schema (v2)
--
-- Run this whole file once: Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Requires PostgreSQL 15 or later (the Supabase default).
--
-- Design notes
--   * Each table is keyed by (user_id, id). Ids only need to be unique per user,
--     and every foreign key includes user_id, so a user can never link their
--     rows to another user's categories, receipts, or budgets.
--   * Money is numeric(12,2), dates are date, and categories/budgets/receipts
--     are real foreign keys instead of text copied into JSON.
--   * Row-level security is enabled on every table, and anon has no access.
--   * Receipt images live in a private Storage bucket with a size and MIME limit.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Tables (parents are created before children)
-- ----------------------------------------------------------------------------

create table if not exists public.categories (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  id         text        not null,
  name       text        not null check (char_length(btrim(name)) between 1 and 80),
  type       text        not null default 'expense' check (type in ('expense', 'income')),
  color      text        not null default '#1d8d5f' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.receipts (
  user_id        uuid           not null references auth.users (id) on delete cascade,
  id             text           not null,
  merchant       text           not null check (char_length(btrim(merchant)) between 1 and 200),
  receipt_date   date           not null,
  total          numeric(12, 2) not null check (total > 0),
  category_id    text,
  payment_method text           not null default 'Card',
  status         text           not null default 'approved'
                                check (status in ('pending', 'approved', 'rejected')),
  source         text           not null default 'manual' check (source in ('scanner', 'manual')),
  image_path     text,
  created_at     timestamptz    not null default now(),
  updated_at     timestamptz    not null default now(),
  primary key (user_id, id),
  constraint receipts_category_fk foreign key (user_id, category_id)
    references public.categories (user_id, id) on delete set null (category_id)
);

create table if not exists public.expenses (
  user_id      uuid           not null references auth.users (id) on delete cascade,
  id           text           not null,
  title        text           not null check (char_length(btrim(title)) between 1 and 200),
  amount       numeric(12, 2) not null check (amount > 0),
  category_id  text,
  expense_date date           not null,
  notes        text           not null default '',
  receipt_id   text,
  created_at   timestamptz    not null default now(),
  updated_at   timestamptz    not null default now(),
  primary key (user_id, id),
  constraint expenses_category_fk foreign key (user_id, category_id)
    references public.categories (user_id, id) on delete set null (category_id),
  constraint expenses_receipt_fk foreign key (user_id, receipt_id)
    references public.receipts (user_id, id) on delete set null (receipt_id)
);

create table if not exists public.budgets (
  user_id     uuid           not null references auth.users (id) on delete cascade,
  id          text           not null,
  name        text           not null check (char_length(btrim(name)) between 1 and 80),
  category_id text           not null,
  amount      numeric(12, 2) not null check (amount > 0),
  period      text           not null check (period in ('weekly', 'monthly')),
  created_at  timestamptz    not null default now(),
  updated_at  timestamptz    not null default now(),
  primary key (user_id, id),
  constraint budgets_category_fk foreign key (user_id, category_id)
    references public.categories (user_id, id) on delete cascade
);

create table if not exists public.notifications (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  id         text        not null,
  budget_id  text,
  period_key text,
  title      text        not null,
  message    text        not null default '',
  type       text        not null default 'info' check (type in ('info', 'success', 'warning')),
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint notifications_budget_fk foreign key (user_id, budget_id)
    references public.budgets (user_id, id) on delete set null (budget_id)
);

create table if not exists public.user_settings (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  currency   text        not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  locale     text        not null default 'en-PH' check (char_length(locale) between 2 and 20),
  updated_at timestamptz not null default now()
);

create table if not exists public.account_profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text        not null,
  full_name  text        not null,
  created_at timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 2. Indexes
-- ----------------------------------------------------------------------------

-- A category name is unique per user, ignoring case and surrounding spaces.
create unique index if not exists categories_user_name_key
  on public.categories (user_id, lower(btrim(name)));

-- At most one budget alert per budget per period.
create unique index if not exists notifications_budget_period_key
  on public.notifications (user_id, budget_id, period_key)
  where budget_id is not null and period_key is not null;

create index if not exists expenses_user_date_idx    on public.expenses (user_id, expense_date desc);
create index if not exists expenses_user_category_idx on public.expenses (user_id, category_id);
create index if not exists expenses_user_receipt_idx  on public.expenses (user_id, receipt_id);
create index if not exists receipts_user_date_idx     on public.receipts (user_id, receipt_date desc);
create index if not exists receipts_user_category_idx on public.receipts (user_id, category_id);
create index if not exists budgets_user_category_idx  on public.budgets (user_id, category_id);
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);


-- ----------------------------------------------------------------------------
-- 3. updated_at maintenance
-- ----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['categories', 'receipts', 'expenses', 'budgets', 'user_settings']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I '
      'for each row execute function public.set_updated_at()', t);
  end loop;
end $$;


-- ----------------------------------------------------------------------------
-- 4. Row-level security: users see and change only their own rows
-- ----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['categories', 'receipts', 'expenses', 'budgets', 'notifications', 'user_settings']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Users manage own %s" on public.%I', t, t);
    execute format(
      'create policy "Users manage own %1$s" on public.%1$I for all to authenticated '
      'using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Profiles: a user can read their own profile and create it once, but only
-- with a Google sign-in and a @gmail.com address.
alter table public.account_profiles enable row level security;

drop policy if exists "Users read own account profile" on public.account_profiles;
create policy "Users read own account profile"
  on public.account_profiles for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users create own account profile" on public.account_profiles;
create policy "Users create own account profile"
  on public.account_profiles for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and lower((select auth.jwt()) ->> 'email') like '%@gmail.com'
    and ((select auth.jwt()) -> 'app_metadata' -> 'providers') ? 'google'
  );

revoke all on public.account_profiles from anon, authenticated;
grant select, insert on public.account_profiles to authenticated;


-- ----------------------------------------------------------------------------
-- 5. Atomic receipt save: stores the receipt and its expense together
--    (called from scan-receipt.html via supabase.rpc)
-- ----------------------------------------------------------------------------

drop function if exists public.save_receipt_with_expense(text, jsonb, text, jsonb);

create or replace function public.save_receipt_with_expense(
  p_receipt_id     text,
  p_merchant       text,
  p_receipt_date   date,
  p_total          numeric,
  p_category_id    text,
  p_payment_method text,
  p_image_path     text,
  p_expense_id     text,
  p_notes          text default ''
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.receipts
    (user_id, id, merchant, receipt_date, total, category_id, payment_method, source, image_path)
  values
    (auth.uid(), p_receipt_id, p_merchant, p_receipt_date, p_total,
     nullif(p_category_id, ''), coalesce(nullif(p_payment_method, ''), 'Card'), 'scanner', p_image_path);

  insert into public.expenses
    (user_id, id, title, amount, category_id, expense_date, notes, receipt_id)
  values
    (auth.uid(), p_expense_id, p_merchant, p_total,
     nullif(p_category_id, ''), p_receipt_date, coalesce(p_notes, ''), p_receipt_id);
end;
$$;

revoke all on function public.save_receipt_with_expense(text, text, date, numeric, text, text, text, text, text)
  from public, anon;
grant execute on function public.save_receipt_with_expense(text, text, date, numeric, text, text, text, text, text)
  to authenticated;


-- ----------------------------------------------------------------------------
-- 6. Private receipt-image bucket: 10 MB limit, images only
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts', 'receipts', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users manage own receipt images" on storage.objects;
create policy "Users manage own receipt images"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
