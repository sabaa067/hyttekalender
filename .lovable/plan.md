# Hyttekalender – Major Structure Update

Big architectural change with auth, roles, notifications, and history. Breaking into clear phases.

## 1. Rename to "Hyttekalender"

Replace every "Familiekalender" string across:
- `src/routes/__root.tsx` (browser `<title>` / head meta)
- `src/routes/index.tsx` (header, mobile)
- `src/lib/assistant.functions.ts` (system prompt)
- Login page, menu, notification copy
- Any other occurrence (sweep via `rg`)

## 2. Database (single migration)

```sql
-- Users (password-based, no signup; admin-seeded)
create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  password text not null unique,         -- plain for simplicity; family app, low threat
  role text not null check (role in ('admin','viewer')),
  created_at timestamptz default now()
);

-- Activity log (only calendar mutations)
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references app_users(id) on delete set null,
  actor_name text not null,
  action text not null check (action in ('create','update','delete')),
  entry_title text not null,
  entry_category text,
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

-- Per-user read state for notifications
create table public.activity_reads (
  user_id uuid references app_users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id)
);

alter table app_users enable row level security;
alter table activity_log enable row level security;
alter table activity_reads enable row level security;

-- Open policies (app-level auth via password; no Supabase auth)
create policy "read users" on app_users for select using (true);
create policy "read log" on activity_log for select using (true);
create policy "insert log" on activity_log for insert with check (true);
create policy "read reads" on activity_reads for select using (true);
create policy "upsert reads" on activity_reads for insert with check (true);
create policy "update reads" on activity_reads for update using (true);

alter publication supabase_realtime add table activity_log;

-- Seed users
insert into app_users (name, password, role) values
  ('Farfar','farfarerbest','admin'),
  ('Morten','kabelbakke','admin'),
  ('Jørgen','stødig','admin'),
  ('Sander','sanderseralt','viewer');
```

## 3. Auth (client-side session)

`src/lib/auth.tsx`:
- `AuthProvider` storing `{ id, name, role }` in `localStorage` under `hk_user`
- `useAuth()` hook
- `login(password)` → query `app_users` where `password = ?`, store user
- `logout()` clears

Mount provider in `__root.tsx`. Default route shows login if not authed.

## 4. Login page

New component (not a separate route – rendered inline by index when unauthed) or a `/login` route. Keep simple inline gate in `routes/index.tsx`.

Design: centered card, large title "Hyttekalender", single password input, "Logg inn" button, soft gradient background, no signup.

## 5. Hamburger menu (top-left, fixed)

`src/components/AppMenu.tsx` – Sheet from shadcn, fixed top-left button. Items:
- Current user display
- "Logg inn / Logg ut"
- "Historikk" → opens history dialog/sheet

## 6. Notification bell (top-right, fixed)

`src/components/NotificationBell.tsx`:
- Subscribes to `activity_log` via supabase realtime + initial fetch
- Badge = count of entries with `created_at > last_read_at` AND `actor_id != current user`
- Click → Popover with latest 2 + "Se historikk" link
- On open: update `activity_reads.last_read_at = now()`

## 7. History panel

Full list of activity_log entries formatted like:
"Jørgen opprettet: Hyttetur på Paradis – 22–24 mai"

## 8. Role enforcement (Sander = viewer)

In `routes/index.tsx` and child components: pass `canEdit = role === 'admin'`. Hide "+ Nytt" buttons, disable edit/delete actions, hide AssistantBar publish/edit buttons (or keep ask but hide publish). Actually keep AssistantBar working but hide publish/edit if viewer.

## 9. Activity logging hook

Wrap `createEntry`, `updateEntry`, `deleteEntry` in `src/lib/entries.ts` so each calls a helper that inserts into `activity_log` with current user from a passed-in actor. Cleanest: keep entries.ts pure, and add wrappers in components or a `useEntryMutations` hook that logs after success.

Action text:
- create → "opprettet"
- update → "redigerte"
- delete → "slettet"

Format: `${actor} ${verb}: ${title} – ${dateRange}`

## 10. Realtime sync

Add realtime to `calendar_entries` (already? check) and `activity_log`. Invalidate `["entries"]` query on changes so all logged-in users see updates instantly.

## 11. AI context

Pass current user name + role to assistant context so it can address user by name.

---

## File changes summary

**New:**
- `src/lib/auth.tsx` (provider/hook)
- `src/lib/activity.ts` (log + read helpers, realtime hook)
- `src/components/LoginGate.tsx`
- `src/components/AppMenu.tsx`
- `src/components/NotificationBell.tsx`
- `src/components/HistoryPanel.tsx`
- migration file

**Edited:**
- `src/routes/__root.tsx` (title, AuthProvider)
- `src/routes/index.tsx` (gate, header with menu+bell, pass canEdit, log mutations)
- `src/components/CalendarGrid.tsx`, `ExcelView.tsx`, `YearOverview.tsx`, `DayDetailPanel.tsx`, `EntryDialog.tsx`, `AssistantBar.tsx` (respect canEdit, log mutations via wrapper)
- `src/lib/assistant.functions.ts` (Hyttekalender + user context)

## Notes

- Passwords stored plain since this is a small private family app and auth is purely a soft gate; happy to add hashing later if user wants.
- Sander password set to `sanderseralt` (placeholder; user can change via prompt).
- Realtime requires `calendar_entries` already in publication; will add in migration if missing.
