-- Row level security tests for supabase/schema.sql.
-- Two camps (A and B) plus a staff member of camp A. Each block runs as one
-- signed-in user (role "authenticated" + their user id in the JWT claim) and
-- raises an exception if a camp can see or change another camp's data, or if
-- staff can do something only directors may do.

-- ---------------------------------------------------------------- fixtures
-- Director A and director B sign up (the trigger creates a camp for each).
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'dir-a@example.com', '{"camp_name":"Camp A","full_name":"Dir A"}'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'dir-b@example.com', '{"camp_name":"Camp B","full_name":"Dir B"}');

-- Director A invites a staff member, who then signs up and joins camp A.
insert into public.camp_invites (camp_id, email, role)
select camp_id, 'staff-a@example.com', 'staff' from public.profiles
where id = 'aaaaaaaa-0000-0000-0000-000000000001';
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000002', 'staff-a@example.com');

-- One camper in camp B that camp A must never see.
insert into public.campers (camp_id, first_name, last_name)
select camp_id, 'Bea', 'Private' from public.profiles
where id = 'bbbbbbbb-0000-0000-0000-000000000001';

create table public._ids as
select
  (select camp_id from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001') as camp_a,
  (select camp_id from public.profiles where id = 'bbbbbbbb-0000-0000-0000-000000000001') as camp_b;
grant select on public._ids to authenticated, anon;

-- Signup trigger sanity checks.
do $$
begin
  if (select count(*) from public.camps) <> 2 then
    raise exception 'expected 2 camps after two director signups';
  end if;
  if (select role from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000002') <> 'staff'
     or (select camp_id from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000002')
        <> (select camp_a from public._ids) then
    raise exception 'invited staff member did not join camp A as staff';
  end if;
end $$;

-- ------------------------------------------------- director A: isolation
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
do $$
declare n int;
begin
  if (select count(*) from public.camps) <> 1 then
    raise exception 'director A can see a camp other than their own';
  end if;
  if exists (select 1 from public.campers where first_name = 'Bea') then
    raise exception 'director A can read camp B campers';
  end if;
  if (select count(*) from public.profiles) <> 2 then
    raise exception 'director A should see exactly the 2 profiles in camp A';
  end if;

  -- Writing into their own camp works.
  insert into public.campers (camp_id, first_name, last_name)
  values ((select camp_a from public._ids), 'Al', 'Ok');

  -- Writing into camp B is rejected.
  begin
    insert into public.campers (camp_id, first_name, last_name)
    values ((select camp_b from public._ids), 'Evil', 'Insert');
    raise exception 'director A inserted a camper into camp B';
  exception when insufficient_privilege then null;
  end;

  -- Updating or deleting camp B rows touches nothing.
  update public.campers set notes = 'hacked' where first_name = 'Bea';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'director A updated a camp B camper'; end if;

  update public.camps set name = 'hacked' where id = (select camp_b from public._ids);
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'director A renamed camp B'; end if;

  -- Moving a row from camp A into camp B is rejected.
  begin
    update public.campers set camp_id = (select camp_b from public._ids) where first_name = 'Al';
    raise exception 'director A moved a camper into camp B';
  exception when insufficient_privilege then null;
  end;
end $$;
commit;

-- ------------------------------------- staff A: no self-promotion or hopping
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000002';
do $$
declare n int;
begin
  -- Staff can still edit their own display name.
  update public.profiles set full_name = 'Staff A'
  where id = 'aaaaaaaa-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'staff could not update their own full_name'; end if;

  -- Staff cannot promote themselves to director.
  begin
    update public.profiles set role = 'director'
    where id = 'aaaaaaaa-0000-0000-0000-000000000002';
  exception when insufficient_privilege then null;
  end;

  -- Staff cannot move themselves into another camp.
  begin
    update public.profiles set camp_id = (select camp_b from public._ids)
    where id = 'aaaaaaaa-0000-0000-0000-000000000002';
  exception when insufficient_privilege then null;
  end;

  -- Staff cannot invite people (directors only), least of all as director.
  begin
    insert into public.camp_invites (camp_id, email, role)
    values ((select camp_a from public._ids), 'friend@example.com', 'director');
    raise exception 'staff created an invite';
  exception when insufficient_privilege then null;
  end;

  -- Staff cannot rename the camp.
  update public.camps set name = 'renamed by staff';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'staff renamed the camp'; end if;
end $$;
commit;

-- Checked as the superuser, after the attempts above.
do $$
begin
  if (select role from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000002') <> 'staff' then
    raise exception 'staff promoted themselves to director';
  end if;
  if (select camp_id from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000002')
     <> (select camp_a from public._ids) then
    raise exception 'staff moved themselves into another camp';
  end if;
end $$;

-- ------------------------------------------------------------ billing (M1)
-- Signup starts a 30-day trial.
do $$
begin
  if (select subscription_status from public.camps where id = (select camp_a from public._ids)) <> 'trialing' then
    raise exception 'new camp should start in trialing';
  end if;
  if (select trial_ends_at from public.camps where id = (select camp_a from public._ids))
     not between now() + interval '29 days 23 hours' and now() + interval '30 days 1 hour' then
    raise exception 'handle_new_user should set trial_ends_at to signup + 30 days';
  end if;
end $$;

-- Director A: can read billing, can't write it (only the service role can).
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
do $$
declare n int;
begin
  if (select subscription_status from public.camps) is distinct from 'trialing' then
    raise exception 'director A cannot read their camp subscription_status';
  end if;
  perform trial_ends_at, stripe_customer_id, stripe_subscription_id from public.camps;

  -- Renaming the camp still works.
  update public.camps set name = 'Camp A renamed' where id = (select camp_a from public._ids);
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'director A could not rename their own camp'; end if;

  begin
    update public.camps set subscription_status = 'active'
    where id = (select camp_a from public._ids);
    raise exception 'director A set their own subscription_status';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.camps set trial_ends_at = now() + interval '10 years'
    where id = (select camp_a from public._ids);
    raise exception 'director A extended their own trial';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.camps set stripe_customer_id = 'cus_stolen', stripe_subscription_id = 'sub_stolen'
    where id = (select camp_a from public._ids);
    raise exception 'director A set their own Stripe ids';
  exception when insufficient_privilege then null;
  end;

  -- Nor can they mark camp B as paid, or create a camp of their own.
  begin
    update public.camps set subscription_status = 'canceled'
    where id = (select camp_b from public._ids);
    raise exception 'director A changed camp B billing';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.camps (name, owner_id, subscription_status)
    values ('Free camp', 'aaaaaaaa-0000-0000-0000-000000000001', 'active');
    raise exception 'director A inserted a camp';
  exception when insufficient_privilege then null;
  end;
end $$;
commit;

-- Staff A: can read their camp's billing status, can't change it.
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000002';
do $$
begin
  if (select subscription_status from public.camps) is distinct from 'trialing' then
    raise exception 'staff A cannot read their camp subscription_status';
  end if;
  begin
    update public.camps set subscription_status = 'active';
    raise exception 'staff A set the camp subscription_status';
  exception when insufficient_privilege then null;
  end;
end $$;
commit;

-- Director B can't see camp A's billing columns.
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000001';
do $$
begin
  if exists (select 1 from public.camps where id = (select camp_a from public._ids)) then
    raise exception 'director B can read camp A billing';
  end if;
end $$;
commit;

-- The service role (Stripe webhook) can write billing columns.
begin;
set local role service_role;
do $$
declare n int;
begin
  update public.camps
  set subscription_status = 'active', stripe_customer_id = 'cus_B', stripe_subscription_id = 'sub_B'
  where id = (select camp_b from public._ids);
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'service role could not update camp billing'; end if;
end $$;
commit;

-- Checked as the superuser, after the attempts above.
do $$
begin
  if (select subscription_status from public.camps where id = (select camp_a from public._ids)) <> 'trialing'
     or (select stripe_customer_id from public.camps where id = (select camp_a from public._ids)) is not null then
    raise exception 'camp A billing changed without the service role';
  end if;
  if (select subscription_status from public.camps where id = (select camp_b from public._ids)) <> 'active' then
    raise exception 'service role update to camp B billing did not stick';
  end if;
  if (select name from public.camps where id = (select camp_a from public._ids)) <> 'Camp A renamed' then
    raise exception 'director rename did not stick';
  end if;
end $$;

-- ------------------------------------- staff app tables (chat, retreats)
-- Fixtures, as the superuser: camp B has a retreat group, a routine, a
-- channel and a message; camp A has a standing channel and a direct message
-- between director A and nobody else.
insert into public.retreat_groups (camp_id, name)
select camp_b, 'B Retreat' from public._ids;
insert into public.routines (camp_id, title, target_type)
select camp_b, 'B routine', 'team' from public._ids;
insert into public.channels (camp_id, name, kind)
select camp_b, 'b-general', 'standing' from public._ids;
insert into public.messages (camp_id, channel_id, kind, body)
select camp_b, c.id, 'user', 'B secret' from public._ids, public.channels c where c.name = 'b-general';
insert into public.channels (camp_id, name, kind)
select camp_a, 'a-general', 'standing' from public._ids;
insert into public.channels (camp_id, name, kind, members)
select camp_a, 'dm-dir-a', 'direct', array['aaaaaaaa-0000-0000-0000-000000000001'::uuid] from public._ids;

create table public._chat as
select
  (select id from public.channels where name = 'b-general') as b_channel,
  (select id from public.messages where body = 'B secret') as b_message,
  (select id from public.channels where name = 'a-general') as a_channel,
  (select id from public.channels where name = 'dm-dir-a') as a_dm;
grant select on public._chat to authenticated;

-- Director A: can't see or write camp B's staff-app rows.
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
do $$
declare n int;
begin
  if exists (select 1 from public.retreat_groups where name = 'B Retreat') then
    raise exception 'director A can read camp B retreat groups';
  end if;
  if exists (select 1 from public.routines where title = 'B routine') then
    raise exception 'director A can read camp B routines';
  end if;
  if exists (select 1 from public.channels where name = 'b-general')
     or exists (select 1 from public.messages where body = 'B secret') then
    raise exception 'director A can read camp B chat';
  end if;

  begin
    insert into public.retreat_groups (camp_id, name) values ((select camp_b from public._ids), 'Evil');
    raise exception 'director A created a camp B retreat group';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.channels (camp_id, name) values ((select camp_b from public._ids), 'evil');
    raise exception 'director A created a camp B channel';
  exception when insufficient_privilege then null;
  end;

  -- Posting into camp B's channel, even labelled as camp A, is rejected.
  begin
    insert into public.messages (camp_id, channel_id, author_id, body)
    values ((select camp_a from public._ids), (select b_channel from public._chat),
            'aaaaaaaa-0000-0000-0000-000000000001', 'hi B');
    raise exception 'director A posted into a camp B channel';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.message_reactions (message_id, user_id, emoji)
    values ((select b_message from public._chat), 'aaaaaaaa-0000-0000-0000-000000000001', 'x');
    raise exception 'director A reacted to a camp B message';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.channel_reads (channel_id, user_id)
    values ((select b_channel from public._chat), 'aaaaaaaa-0000-0000-0000-000000000001');
    raise exception 'director A marked a camp B channel read';
  exception when insufficient_privilege then null;
  end;

  -- Their own camp works: post in a channel and in their direct message.
  insert into public.messages (camp_id, channel_id, author_id, body)
  values ((select camp_a from public._ids), (select a_channel from public._chat),
          'aaaaaaaa-0000-0000-0000-000000000001', 'hello A');
  insert into public.messages (camp_id, channel_id, author_id, body)
  values ((select camp_a from public._ids), (select a_dm from public._chat),
          'aaaaaaaa-0000-0000-0000-000000000001', 'note to self');
  insert into public.retreat_groups (camp_id, name) values ((select camp_a from public._ids), 'A Retreat');
end $$;
commit;

-- Staff A: no director-only routines, no posting into a direct message
-- they're not in, no posting as someone else, no editing others' messages.
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000002';
do $$
declare n int;
begin
  begin
    insert into public.routines (camp_id, title, target_type)
    values ((select camp_a from public._ids), 'Staff routine', 'team');
    raise exception 'staff created a routine (directors only)';
  exception when insufficient_privilege then null;
  end;

  if exists (select 1 from public.channels where name = 'dm-dir-a') then
    raise exception 'staff can see a direct message they are not in';
  end if;

  begin
    insert into public.messages (camp_id, channel_id, author_id, body)
    values ((select camp_a from public._ids), (select a_dm from public._chat),
            'aaaaaaaa-0000-0000-0000-000000000002', 'butting in');
    raise exception 'staff posted into a direct message they are not in';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.messages (camp_id, channel_id, author_id, body)
    values ((select camp_a from public._ids), (select a_channel from public._chat),
            'aaaaaaaa-0000-0000-0000-000000000001', 'pretending to be the director');
    raise exception 'staff posted as the director';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.messages set body = 'edited by staff' where body = 'hello A';
    raise exception 'staff edited someone else''s message';
  exception when insufficient_privilege then null;
  end;

  -- Posting as themselves in a camp channel works.
  insert into public.messages (camp_id, channel_id, author_id, body)
  values ((select camp_a from public._ids), (select a_channel from public._chat),
          'aaaaaaaa-0000-0000-0000-000000000002', 'staff hello');
end $$;
commit;

-- ---------------------------------------------- Google Calendar connection
-- Camp B has a connected calendar; camp A starts without one.
insert into public.calendar_accounts (camp_id, email, access_token, refresh_token, expires_at)
select camp_b, 'b@example.com', 'tok-b', 'ref-b', now() + interval '1 hour' from public._ids;

-- Staff A: can't connect the camp calendar (directors only).
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000002';
do $$
begin
  begin
    insert into public.calendar_accounts (camp_id, email, access_token, refresh_token, expires_at)
    values ((select camp_a from public._ids), 'staff@example.com', 't', 'r', now());
    raise exception 'staff connected a calendar';
  exception when insufficient_privilege then null;
  end;
end $$;
commit;

-- Director A: connects their own, can't see or touch camp B's.
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
do $$
declare n int;
begin
  if exists (select 1 from public.calendar_accounts where email = 'b@example.com') then
    raise exception 'director A can read camp B calendar tokens';
  end if;

  begin
    insert into public.calendar_accounts (camp_id, email, access_token, refresh_token, expires_at)
    values ((select camp_b from public._ids), 'evil@example.com', 't', 'r', now());
    raise exception 'director A connected a calendar for camp B';
  exception when insufficient_privilege then null;
  end;

  update public.calendar_accounts set access_token = 'stolen' where email = 'b@example.com';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'director A updated camp B calendar tokens'; end if;

  delete from public.calendar_accounts where email = 'b@example.com';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'director A deleted camp B calendar'; end if;

  insert into public.calendar_accounts (camp_id, email, access_token, refresh_token, expires_at)
  values ((select camp_a from public._ids), 'a@example.com', 'tok-a', 'ref-a', now());
end $$;
commit;

-- Staff A: can read and refresh their camp's tokens, but not repoint the
-- account or disconnect it.
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000002';
do $$
declare n int;
begin
  update public.calendar_accounts set access_token = 'tok-a2', last_synced_at = now()
  where email = 'a@example.com';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'staff could not refresh the calendar token'; end if;

  begin
    update public.calendar_accounts set calendar_id = 'someone-else' where email = 'a@example.com';
    raise exception 'staff repointed the camp calendar';
  exception when insufficient_privilege then null;
  end;

  delete from public.calendar_accounts where email = 'a@example.com';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'staff disconnected the camp calendar'; end if;
end $$;
commit;

-- ----------------------------------------------- signed-out visitor (anon)
begin;
set local role anon;
do $$
begin
  if (select count(*) from public.camps) + (select count(*) from public.campers)
     + (select count(*) from public.profiles) + (select count(*) from public.guardians)
     + (select count(*) from public.email_drafts) + (select count(*) from public.gmail_accounts)
     + (select count(*) from public.calendar_accounts) <> 0 then
    raise exception 'signed-out visitor can read camp data';
  end if;
end $$;
commit;
