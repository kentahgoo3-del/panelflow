# PanelFlow (v1)

A creator-friendly manga reader + publisher built with **Next.js (App Router)**, **Supabase**, and **Stripe subscriptions**.

## What you get in this zip
- Login (email/password) via Supabase Auth
- Creator dashboard: create series, manage chapters, upload pages, publish/unpublish
- Public series page: `/s/[seriesId]`
- Reader: `/r/[chapterId]` (mobile-first vertical scroll, dark/light)
- Free vs Pro gates:
  - Free: 1 series, 5 chapters per series, watermark in reader
  - Pro: unlimited + no watermark
- Stripe Checkout (subscription) + Webhook updates `users.plan` in Supabase
- Stripe Billing Portal (self-serve manage/cancel)

---

## 1) Quick start

```bash
npm install
npm run dev
```

Create `.env.local` from `.env.example` and fill values.

---

## 2) Environment variables
See `.env.example`.

---

## 3) Supabase setup

### Tables
Run this in **Supabase SQL Editor**:

```sql
-- USERS (profile + plan)
create table if not exists public.users (
  id uuid primary key,
  email text,
  plan text not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamp with time zone default now()
);

-- SERIES
create table if not exists public.series (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  cover_image text,
  is_published boolean not null default false,
  created_at timestamp with time zone default now()
);

-- CHAPTERS
create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.series(id) on delete cascade,
  title text,
  chapter_number integer not null,
  is_published boolean not null default false,
  created_at timestamp with time zone default now()
);

-- PAGES
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  image_url text not null,
  page_number integer not null,
  created_at timestamp with time zone default now()
);

create index if not exists idx_series_user_id on public.series(user_id);
create index if not exists idx_chapters_series_id on public.chapters(series_id);
create index if not exists idx_pages_chapter_id on public.pages(chapter_id);
```

### Buckets
Create two Storage buckets:
- `covers` (public)
- `pages` (public)

### Auth → user row sync
When a user signs up, you need a row in `public.users`.
Simplest approach: add a Supabase **Auth Trigger**:

```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, plan)
  values (new.id, new.email, 'free')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
```

### RLS (starter)
Enable RLS and policies (owner-only for dashboard):

```sql
alter table public.users enable row level security;
alter table public.series enable row level security;
alter table public.chapters enable row level security;
alter table public.pages enable row level security;

-- users: user can read/update own row
create policy "users_select_own" on public.users for select using (auth.uid() = id);
create policy "users_update_own" on public.users for update using (auth.uid() = id);

-- series
create policy "series_select_own" on public.series for select using (auth.uid() = user_id);
create policy "series_insert_own" on public.series for insert with check (auth.uid() = user_id);
create policy "series_update_own" on public.series for update using (auth.uid() = user_id);

-- chapters: join back to series owner
create policy "chapters_select_own" on public.chapters for select using (
  exists(select 1 from public.series s where s.id = series_id and s.user_id = auth.uid())
);
create policy "chapters_insert_own" on public.chapters for insert with check (
  exists(select 1 from public.series s where s.id = series_id and s.user_id = auth.uid())
);
create policy "chapters_update_own" on public.chapters for update using (
  exists(select 1 from public.series s where s.id = series_id and s.user_id = auth.uid())
);

-- pages: join back to series owner via chapter->series
create policy "pages_select_own" on public.pages for select using (
  exists(
    select 1 from public.chapters c
    join public.series s on s.id = c.series_id
    where c.id = chapter_id and s.user_id = auth.uid()
  )
);
create policy "pages_insert_own" on public.pages for insert with check (
  exists(
    select 1 from public.chapters c
    join public.series s on s.id = c.series_id
    where c.id = chapter_id and s.user_id = auth.uid()
  )
);
```

Public pages (`/s/*`, `/r/*`) require published reads. For v1 speed, you can keep `series/chapters/pages` buckets public and rely on `is_published` filtering in the app. For stronger security, add separate RLS policies for `is_published = true` reads.

---

## 4) Stripe setup
1) Create Product: **PanelFlow Pro**
2) Create recurring monthly Price and copy `price_...`
3) Add webhook endpoint: `https://YOUR_DOMAIN/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

---

## 5) Deploy
Works great on Vercel. Set env vars in Vercel project settings.

