-- CampFlow Admin - database schema (v2: camp workspaces)
-- Run this once in the Supabase SQL editor (or via the CLI) for a new project.
--
-- Data model: every director/staff member belongs to exactly one camp
-- (their workspace). All records are scoped to camp_id, and row level
-- security only lets members of a camp see that camp's data.
--
-- Signup flow: a trigger creates a profile for every new auth user. If a
-- pending invite exists for their email they join that camp as staff;
-- otherwise a fresh camp is created and they become its director.

create extension if not exists "pgcrypto";

-- Keep updated_at accurate automatically on every update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- camps: one row per camp workspace
-- ---------------------------------------------------------------------------
create table if not exists public.camps (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My Camp',
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- profiles: one row per user, links them to their camp
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  camp_id uuid references public.camps (id) on delete set null,
  role text not null default 'director' check (role in ('director', 'staff')),
  created_at timestamptz not null default now()
);

-- Helper: the camp the current user belongs to. Security definer so RLS
-- policies can call it without recursing into profiles' own policies.
create or replace function public.user_camp_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select camp_id from public.profiles where id = auth.uid();
$$;

alter table public.camps enable row level security;

create policy "Members can view their camp" on public.camps
  for select using (id = public.user_camp_id());
create policy "Directors can update their camp" on public.camps
  for update using (
    id = public.user_camp_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'director'
    )
  );

alter table public.profiles enable row level security;

create policy "Users can view profiles in their camp" on public.profiles
  for select using (id = auth.uid() or camp_id = public.user_camp_id());
create policy "Users can update their own profile" on public.profiles
  for update using (id = auth.uid());
create policy "Users can insert their own profile" on public.profiles
  for insert with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- camp_invites: email invites so staff can join an existing camp
-- ---------------------------------------------------------------------------
create table if not exists public.camp_invites (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references public.camps (id) on delete cascade,
  email text not null,
  role text not null default 'staff' check (role in ('director', 'staff')),
  invited_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (camp_id, email)
);

alter table public.camp_invites enable row level security;

create policy "Members manage their camp invites" on public.camp_invites
  for all using (camp_id = public.user_camp_id())
  with check (camp_id = public.user_camp_id());

create index if not exists camp_invites_email_idx on public.camp_invites (lower(email));

-- Auto-provision on signup: join an invited camp, or create a new one.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  invite record;
  new_camp_id uuid;
begin
  select * into invite
  from public.camp_invites
  where lower(email) = lower(new.email) and accepted_at is null
  order by created_at asc
  limit 1;

  if invite.id is not null then
    insert into public.profiles (id, full_name, camp_id, role)
    values (new.id, new.raw_user_meta_data ->> 'full_name', invite.camp_id, invite.role)
    on conflict (id) do nothing;

    update public.camp_invites set accepted_at = now() where id = invite.id;
  else
    insert into public.camps (name, owner_id)
    values (coalesce(nullif(new.raw_user_meta_data ->> 'camp_name', ''), 'My Camp'), new.id)
    returning id into new_camp_id;

    insert into public.profiles (id, full_name, camp_id, role)
    values (new.id, new.raw_user_meta_data ->> 'full_name', new_camp_id, 'director')
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- tasks: the camp's to-dos / reminders
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references public.camps (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  title text not null,
  description text,
  due_date date,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'open' check (status in ('open', 'done')),
  source_email_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "Members manage their camp tasks" on public.tasks
  for all using (camp_id = public.user_camp_id())
  with check (camp_id = public.user_camp_id());

create index if not exists tasks_camp_id_idx on public.tasks (camp_id);
create index if not exists tasks_due_date_idx on public.tasks (due_date);

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- knowledge_base: camp rules, pickup times, packing lists, policies
-- ---------------------------------------------------------------------------
create table if not exists public.knowledge_base (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references public.camps (id) on delete cascade,
  category text not null default 'other' check (
    category in ('rules', 'pickup_times', 'packing_list', 'policy', 'other')
  ),
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.knowledge_base enable row level security;

create policy "Members manage their camp knowledge base" on public.knowledge_base
  for all using (camp_id = public.user_camp_id())
  with check (camp_id = public.user_camp_id());

create index if not exists knowledge_base_camp_id_idx on public.knowledge_base (camp_id);

drop trigger if exists knowledge_base_set_updated_at on public.knowledge_base;
create trigger knowledge_base_set_updated_at
  before update on public.knowledge_base
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- guardians: parent / guardian contact records
-- ---------------------------------------------------------------------------
create table if not exists public.guardians (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references public.camps (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  relationship text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.guardians enable row level security;

create policy "Members manage their camp guardians" on public.guardians
  for all using (camp_id = public.user_camp_id())
  with check (camp_id = public.user_camp_id());

create index if not exists guardians_camp_id_idx on public.guardians (camp_id);

drop trigger if exists guardians_set_updated_at on public.guardians;
create trigger guardians_set_updated_at
  before update on public.guardians
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- campers: basic camper records, optionally linked to a guardian
-- ---------------------------------------------------------------------------
create table if not exists public.campers (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references public.camps (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  cabin text,
  age int,
  guardian_id uuid references public.guardians (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.campers enable row level security;

create policy "Members manage their camp campers" on public.campers
  for all using (camp_id = public.user_camp_id())
  with check (camp_id = public.user_camp_id());

create index if not exists campers_camp_id_idx on public.campers (camp_id);
create index if not exists campers_guardian_id_idx on public.campers (guardian_id);

drop trigger if exists campers_set_updated_at on public.campers;
create trigger campers_set_updated_at
  before update on public.campers
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- staff: basic staff records
-- ---------------------------------------------------------------------------
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references public.camps (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  role text,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.staff enable row level security;

create policy "Members manage their camp staff" on public.staff
  for all using (camp_id = public.user_camp_id())
  with check (camp_id = public.user_camp_id());

create index if not exists staff_camp_id_idx on public.staff (camp_id);

drop trigger if exists staff_set_updated_at on public.staff;
create trigger staff_set_updated_at
  before update on public.staff
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- retreat_groups: retreat-centre bookings outside the summer camp season
-- (groups of 20-110, September to June).
-- ---------------------------------------------------------------------------
create table if not exists public.retreat_groups (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references public.camps (id) on delete cascade,
  name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  arrival_date date,
  departure_date date,
  headcount integer check (headcount is null or headcount >= 0),
  status text not null default 'inquiry'
    check (status in ('inquiry', 'tentative', 'confirmed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.retreat_groups enable row level security;

create policy "Members manage their camp retreat groups" on public.retreat_groups
  for all using (camp_id = public.user_camp_id())
  with check (camp_id = public.user_camp_id());

create index if not exists retreat_groups_camp_id_idx on public.retreat_groups (camp_id, arrival_date);

drop trigger if exists retreat_groups_set_updated_at on public.retreat_groups;
create trigger retreat_groups_set_updated_at
  before update on public.retreat_groups
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- email_drafts: pasted or Gmail-synced emails, AI triage, and drafted replies.
-- The AI never sends anything - status only ever moves from pending to
-- approved/dismissed by a human in the UI. Approving a Gmail-sourced email
-- saves the reply into the Gmail *drafts* folder, never the outbox.
-- ---------------------------------------------------------------------------
create table if not exists public.email_drafts (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references public.camps (id) on delete cascade,
  original_email text not null,
  sender_name text,
  sender_email text,
  subject text,
  source text not null default 'manual' check (source in ('manual', 'gmail')),
  gmail_message_id text,
  gmail_thread_id text,
  category text check (
    category in ('pickup', 'medical', 'behavior', 'billing', 'logistics', 'general', 'other')
  ),
  urgency text check (urgency in ('low', 'medium', 'high', 'urgent')),
  ai_summary text,
  ai_draft text,
  edited_draft text,
  suggested_task_title text,
  suggested_task_due date,
  suggested_task_accepted boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (camp_id, gmail_message_id)
);

alter table public.email_drafts enable row level security;

create policy "Members manage their camp email drafts" on public.email_drafts
  for all using (camp_id = public.user_camp_id())
  with check (camp_id = public.user_camp_id());

create index if not exists email_drafts_camp_id_idx on public.email_drafts (camp_id);
create index if not exists email_drafts_status_idx on public.email_drafts (status);

drop trigger if exists email_drafts_set_updated_at on public.email_drafts;
create trigger email_drafts_set_updated_at
  before update on public.email_drafts
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- gmail_accounts: one connected Gmail inbox per camp.
-- Tokens are only ever used server-side (route handlers / server actions);
-- they are visible to camp members through the API, which is acceptable for
-- a small trusted team but should move to a service-role-only table if the
-- app ever opens to untrusted members.
-- ---------------------------------------------------------------------------
create table if not exists public.gmail_accounts (
  camp_id uuid primary key references public.camps (id) on delete cascade,
  email text not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  connected_by uuid references auth.users (id) on delete set null,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gmail_accounts enable row level security;

create policy "Members manage their camp gmail account" on public.gmail_accounts
  for all using (camp_id = public.user_camp_id())
  with check (camp_id = public.user_camp_id());

drop trigger if exists gmail_accounts_set_updated_at on public.gmail_accounts;
create trigger gmail_accounts_set_updated_at
  before update on public.gmail_accounts
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Team tasks: who's on staff when, recurring routines, and who each task is for.
--
-- staff.team groups people for sending tasks ("Cabin leaders", "Kitchen").
-- staff.season is 'summer' for seasonal staff, whose access_ends date stops
-- routines reaching them once the summer is over. staff.profile_id links a
-- staff record to the login that sees "My tasks".
-- ---------------------------------------------------------------------------
alter table public.staff add column if not exists team text;
alter table public.staff add column if not exists season text not null default 'year_round';
alter table public.staff add column if not exists under_18 boolean not null default false;
alter table public.staff add column if not exists access_ends date;
alter table public.staff add column if not exists profile_id uuid references auth.users (id) on delete set null;

do $$ begin
  alter table public.staff add constraint staff_season_check check (season in ('year_round', 'summer'));
exception when duplicate_object then null; end $$;

create index if not exists staff_profile_id_idx on public.staff (profile_id);

-- routines: tasks the director sends once that repeat on a schedule. Each
-- day it runs, every person it targets gets their own task.
create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references public.camps (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  title text not null,
  description text,
  target_type text not null check (target_type in ('person', 'team')),
  target_staff_id uuid references public.staff (id) on delete cascade,
  target_team text,
  frequency text not null default 'daily' check (frequency in ('daily', 'weekly')),
  -- 0 = Sunday ... 6 = Saturday; used when frequency is 'weekly'.
  weekdays smallint[],
  due_time text,
  starts_on date not null default current_date,
  ends_on date,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.routines enable row level security;

drop policy if exists "Members read their camp routines" on public.routines;
create policy "Members read their camp routines" on public.routines
  for select using (camp_id = public.user_camp_id());

drop policy if exists "Directors manage their camp routines" on public.routines;
create policy "Directors manage their camp routines" on public.routines
  for all using (
    camp_id = public.user_camp_id()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'director')
  )
  with check (camp_id = public.user_camp_id());

create index if not exists routines_camp_id_idx on public.routines (camp_id);

drop trigger if exists routines_set_updated_at on public.routines;
create trigger routines_set_updated_at
  before update on public.routines
  for each row execute procedure public.set_updated_at();

-- Tasks can now be for a specific person, and can come from a routine.
alter table public.tasks add column if not exists assigned_to uuid references public.staff (id) on delete set null;
alter table public.tasks add column if not exists routine_id uuid references public.routines (id) on delete set null;
alter table public.tasks add column if not exists due_time text;
alter table public.tasks add column if not exists completed_at timestamptz;

create index if not exists tasks_assigned_to_idx on public.tasks (assigned_to, due_date);
-- One copy of a routine per person per day, however many times it's generated.
create unique index if not exists tasks_routine_person_day_idx
  on public.tasks (routine_id, assigned_to, due_date)
  where routine_id is not null;

-- Checklists: a routine (or a one-off send) can list the steps that make up
-- "done". Each task gets its own copy to tick through.
alter table public.routines add column if not exists checklist text[];
alter table public.tasks add column if not exists checklist jsonb;

-- ---------------------------------------------------------------------------
-- Chat: channels, messages and what each person has read.
--
-- kind 'standing' channels (#office, #kitchen) last all year. A 'retreat_group'
-- channel is opened for each confirmed booking and archived after the group
-- leaves. 'summer' channels hold a season's session and cabin-team chat.
-- Messages are never deleted (safeguarding); kind 'system' is posted by the
-- app itself, and task_id links a message to the task made from it.
-- ---------------------------------------------------------------------------
create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references public.camps (id) on delete cascade,
  name text not null,
  kind text not null default 'standing' check (kind in ('standing', 'retreat_group', 'summer')),
  description text,
  retreat_group_id uuid references public.retreat_groups (id) on delete set null,
  archived boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (camp_id, name)
);

alter table public.channels enable row level security;

drop policy if exists "Members use their camp channels" on public.channels;
create policy "Members use their camp channels" on public.channels
  for all using (camp_id = public.user_camp_id())
  with check (camp_id = public.user_camp_id());

create unique index if not exists channels_retreat_group_idx
  on public.channels (retreat_group_id) where retreat_group_id is not null;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references public.camps (id) on delete cascade,
  channel_id uuid not null references public.channels (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  author_name text,
  kind text not null default 'user' check (kind in ('user', 'system')),
  body text not null,
  task_id uuid references public.tasks (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

drop policy if exists "Members read their camp messages" on public.messages;
create policy "Members read their camp messages" on public.messages
  for select using (camp_id = public.user_camp_id());

drop policy if exists "Members post in their camp" on public.messages;
create policy "Members post in their camp" on public.messages
  for insert with check (camp_id = public.user_camp_id());

-- Only linking a task is allowed after posting; there is no delete policy.
drop policy if exists "Members link tasks to messages" on public.messages;
create policy "Members link tasks to messages" on public.messages
  for update using (camp_id = public.user_camp_id())
  with check (camp_id = public.user_camp_id());

create index if not exists messages_channel_idx on public.messages (channel_id, created_at);

create table if not exists public.channel_reads (
  channel_id uuid not null references public.channels (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

alter table public.channel_reads enable row level security;

drop policy if exists "People manage their own read markers" on public.channel_reads;
create policy "People manage their own read markers" on public.channel_reads
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Direct messages are channels of kind 'direct' that only their members see.
alter table public.channels add column if not exists members uuid[];
alter table public.channels drop constraint if exists channels_kind_check;
alter table public.channels add constraint channels_kind_check
  check (kind in ('standing', 'retreat_group', 'summer', 'direct'));

drop policy if exists "Members use their camp channels" on public.channels;
create policy "Members use their camp channels" on public.channels
  for all using (
    camp_id = public.user_camp_id()
    and (kind <> 'direct' or auth.uid() = any (members))
  )
  with check (camp_id = public.user_camp_id());

drop policy if exists "Members read their camp messages" on public.messages;
create policy "Members read their camp messages" on public.messages
  for select using (
    camp_id = public.user_camp_id()
    and exists (select 1 from public.channels c where c.id = channel_id)
  );

-- Reactions: a quick way to say "seen", "done" or "thanks" without a message.
create table if not exists public.message_reactions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  user_name text,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

alter table public.message_reactions enable row level security;

drop policy if exists "Members see reactions" on public.message_reactions;
create policy "Members see reactions" on public.message_reactions
  for select using (exists (select 1 from public.messages m where m.id = message_id));

drop policy if exists "People manage their own reactions" on public.message_reactions;
create policy "People manage their own reactions" on public.message_reactions
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Threads: a reply points at the message it answers. Pins: one message per
-- channel kept at the top (the weekend schedule, the gate code...).
alter table public.messages add column if not exists parent_id uuid references public.messages (id) on delete cascade;
create index if not exists messages_parent_idx on public.messages (parent_id);
alter table public.channels add column if not exists pinned_message_id uuid references public.messages (id) on delete set null;

-- Announcements: messages everyone is asked to confirm ("Got it"). The
-- confirmation is stored as a reaction with emoji 'ack'.
alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages add constraint messages_kind_check check (kind in ('user', 'system', 'announcement'));

-- A quick status for the day ("On site", "Off today"), cleared the next day.
alter table public.staff add column if not exists status_emoji text;
alter table public.staff add column if not exists status_text text;
alter table public.staff add column if not exists status_date date;

-- A task can belong to a retreat group (its prep list).
alter table public.tasks add column if not exists retreat_group_id uuid references public.retreat_groups (id) on delete set null;
create index if not exists tasks_retreat_group_idx on public.tasks (retreat_group_id);
