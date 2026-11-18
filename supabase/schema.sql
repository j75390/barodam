-- 바로담 마켓 — Supabase schema
-- Run once in the Supabase SQL editor. Safe to re-run (drops and recreates functions/policies, keeps data).
--
-- Design
--  * Auth: Supabase Auth. A member's login ID maps to an internal auth e-mail `<id>@member.barodam.kro.kr`;
--    the contact e-mail lives in `profiles.email`.
--  * Every table has Row Level Security. Members can read only their own rows.
--  * Anything that moves money-like values (points, coupons, orders) happens only inside SECURITY DEFINER
--    functions that re-check the rules on the server, so a modified client cannot grant itself points or coupons.
--  * Timestamps are epoch milliseconds (bigint) to match the front-end types one to one.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.now_ms() returns bigint
language sql stable as $$ select (extract(epoch from clock_timestamp()) * 1000)::bigint $$;

-- ───────────────────────── tables ─────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  login_id    text not null unique check (login_id ~ '^[a-z][a-z0-9]{3,15}$'),
  name        text not null check (char_length(name) between 2 and 30),
  email       text not null unique,
  phone       text not null,
  marketing   boolean not null default false,
  joined      bigint not null default public.now_ms(),
  points      integer not null default 0 check (points >= 0),
  recent      integer[] not null default '{}',
  used_codes  text[] not null default '{}'
);

create table if not exists public.point_logs (
  id    bigint generated always as identity primary key,
  uid   uuid not null references public.profiles on delete cascade,
  t     bigint not null default public.now_ms(),
  amt   integer not null,
  why   text not null,
  bal   integer not null
);
create index if not exists point_logs_uid on public.point_logs (uid, t desc);

create table if not exists public.coupons (
  id    uuid primary key default gen_random_uuid(),
  uid   uuid not null references public.profiles on delete cascade,
  name  text not null,
  type  text not null check (type in ('rate', 'won', 'ship')),
  val   integer not null,
  min   integer not null default 0,
  max   integer,
  cat   text,
  got   bigint not null default public.now_ms(),
  exp   bigint not null,
  used  bigint
);
create index if not exists coupons_uid on public.coupons (uid);

create table if not exists public.addresses (
  id       uuid primary key default gen_random_uuid(),
  uid      uuid not null default auth.uid() references public.profiles on delete cascade,
  label    text not null default '',
  to_name  text not null,
  phone    text not null,
  zip      text not null,
  a1       text not null,
  a2       text not null default '',
  def      boolean not null default false,
  created  bigint not null default public.now_ms()
);
create index if not exists addresses_uid on public.addresses (uid);

-- Members' and guests' orders. `body` holds the order sheet exactly as the UI shows it
-- (items, amounts, payment, address); amounts are recomputed and checked on insert.
create table if not exists public.orders (
  no            text primary key,
  uid           uuid references public.profiles on delete cascade,
  at            bigint not null default public.now_ms(),
  body          jsonb not null,
  cancelled_at  bigint,
  confirmed_at  bigint,
  guest_pw      text,
  check ((uid is null) = (guest_pw is not null))
);
create index if not exists orders_uid on public.orders (uid, at desc);

create table if not exists public.reviews (
  id    uuid primary key default gen_random_uuid(),
  uid   uuid not null references public.profiles on delete cascade,
  oid   text not null,
  k     integer not null,
  pid   integer not null,
  name  text not null,
  opt   text not null,
  star  integer not null check (star between 1 and 5),
  txt   text not null check (char_length(txt) between 1 and 2000),
  t     bigint not null default public.now_ms(),
  who   text not null,
  unique (oid, k)
);
create index if not exists reviews_pid on public.reviews (pid, t desc);

create table if not exists public.inquiries (
  id     uuid primary key default gen_random_uuid(),
  uid    uuid not null references public.profiles on delete cascade,
  pid    integer,
  cat    text not null,
  title  text not null check (char_length(title) between 1 and 100),
  body   text not null check (char_length(body) between 1 and 4000),
  t      bigint not null default public.now_ms(),
  who    text not null
);
create index if not exists inquiries_pid on public.inquiries (pid, t desc);
create index if not exists inquiries_uid on public.inquiries (uid, t desc);

create table if not exists public.applications (
  no            text primary key,
  job_id        text not null,
  email         text not null,
  body          jsonb not null,
  at            bigint not null default public.now_ms(),
  cancelled_at  bigint
);
create index if not exists applications_email on public.applications (email);

create table if not exists public.recruit_inquiries (
  id    bigint generated always as identity primary key,
  name  text not null,
  email text not null,
  type  text not null,
  body  text not null check (char_length(body) between 10 and 2000),
  at    bigint not null default public.now_ms()
);

-- ───────────────────────── row level security ─────────────────────────
alter table public.profiles          enable row level security;
alter table public.point_logs        enable row level security;
alter table public.coupons           enable row level security;
alter table public.addresses         enable row level security;
alter table public.orders            enable row level security;
alter table public.reviews           enable row level security;
alter table public.inquiries         enable row level security;
alter table public.applications      enable row level security;
alter table public.recruit_inquiries enable row level security;

drop policy if exists "own profile"   on public.profiles;
drop policy if exists "own points"    on public.point_logs;
drop policy if exists "own coupons"   on public.coupons;
drop policy if exists "own addresses" on public.addresses;
drop policy if exists "own orders"    on public.orders;
drop policy if exists "read reviews"  on public.reviews;
drop policy if exists "delete own reviews" on public.reviews;
drop policy if exists "read inquiries" on public.inquiries;
drop policy if exists "delete own inquiries" on public.inquiries;

create policy "own profile"   on public.profiles   for select to authenticated using (id = auth.uid());
create policy "own points"    on public.point_logs for select to authenticated using (uid = auth.uid());
create policy "own coupons"   on public.coupons    for select to authenticated using (uid = auth.uid());
create policy "own addresses" on public.addresses  for all    to authenticated using (uid = auth.uid()) with check (uid = auth.uid());
create policy "own orders"    on public.orders     for select to authenticated using (uid = auth.uid());
create policy "read reviews"  on public.reviews    for select to anon, authenticated using (true);
create policy "delete own reviews" on public.reviews for delete to authenticated using (uid = auth.uid());
create policy "read inquiries" on public.inquiries for select to anon, authenticated using (true);
create policy "delete own inquiries" on public.inquiries for delete to authenticated using (uid = auth.uid());
-- applications / recruit_inquiries: no policies → reachable only through the functions below.

grant select on public.profiles, public.point_logs, public.coupons, public.orders to authenticated;
grant select, insert, update, delete on public.addresses to authenticated;
grant select on public.reviews, public.inquiries to anon, authenticated;
grant delete on public.reviews, public.inquiries to authenticated;
-- guest orders (uid is null) are never visible through RLS; guests use the password-checked functions below.

-- ───────────────────────── helpers ─────────────────────────
create or replace function public._err(msg text) returns void language plpgsql as $$
begin raise exception using message = msg, errcode = 'P0001'; end $$;

create or replace function public._mask(s text) returns text language sql immutable as $$
  select case when char_length(s) <= 3 then left(s, 1) || '**'
              else left(s, 3) || repeat('*', least(4, char_length(s) - 3)) end $$;

create or replace function public._points(p_uid uuid, p_amt integer, p_why text) returns void
language plpgsql security definer set search_path = public as $$
declare b integer;
begin
  update profiles set points = points + p_amt where id = p_uid returning points into b;
  insert into point_logs (uid, amt, why, bal) values (p_uid, p_amt, p_why, b);
end $$;

create or replace function public._coupon(p_uid uuid, p_name text, p_type text, p_val int, p_min int, p_max int, p_cat text)
returns void language sql security definer set search_path = public as $$
  insert into coupons (uid, name, type, val, min, max, cat, exp)
  values (p_uid, p_name, p_type, p_val, p_min, p_max, p_cat, now_ms() + 30 * 86400000::bigint) $$;

-- minutes-based order timeline, same as src/domain/orderState.ts (0 paid · 1 ready · 3 shipping · 10 delivered)
create or replace function public._order_step(o public.orders) returns text language sql stable as $$
  select case
    when o.cancelled_at is not null then 'cancel'
    when o.confirmed_at is not null then 'confirmed'
    when now_ms() - o.at >= 10 * 60000 then 'done'
    when now_ms() - o.at >= 3 * 60000 then 'ship'
    when now_ms() - o.at >= 60000 then 'ready'
    else 'paid' end $$;

create or replace function public._order_json(o public.orders) returns jsonb language sql stable as $$
  select o.body || jsonb_build_object('no', o.no, 'at', o.at, 'cancelledAt', o.cancelled_at, 'confirmedAt', o.confirmed_at) $$;

create or replace function public._new_order_no() returns text language plpgsql as $$
declare n text;
begin
  loop
    n := to_char(now() at time zone 'Asia/Seoul', 'YYMMDD') || '-' || (1000000 + floor(random() * 9000000))::int;
    exit when not exists (select 1 from orders where no = n);
  end loop;
  return n;
end $$;

revoke execute on function public._points, public._coupon from public, anon, authenticated;


-- ───────────────────────── sign-up ─────────────────────────
-- Creates the profile with the welcome benefits whenever an auth user is created.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare m jsonb := new.raw_user_meta_data;
begin
  if m ->> 'login_id' is null then perform _err('회원 정보가 없어요.'); end if;
  insert into profiles (id, login_id, name, email, phone, marketing)
  values (new.id, lower(m ->> 'login_id'), m ->> 'name', lower(m ->> 'email'), m ->> 'phone', coalesce((m ->> 'marketing')::boolean, false));
  perform _coupon(new.id, '신규가입 15% 할인', 'rate', 15, 10000, 10000, null);
  perform _coupon(new.id, '첫 주문 배송비 무료', 'ship', 3000, 0, null, null);
  perform _coupon(new.id, '겨울 아우터 5,000원', 'won', 5000, 50000, null, 'fashion');
  perform _points(new.id, 3000, '회원가입 축하 적립금');
  if coalesce((m ->> 'marketing')::boolean, false) then perform _points(new.id, 2000, '마케팅 수신 동의 적립금'); end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_id_taken(p_id text) returns boolean
language sql security definer set search_path = public stable as $$
  select lower(p_id) in ('admin', 'barodam', 'root') or exists (select 1 from profiles where login_id = lower(p_id)) $$;

create or replace function public.is_email_taken(p_email text) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from profiles where email = lower(p_email) and id is distinct from auth.uid()) $$;

create or replace function public.find_login_id(p_name text, p_email text) returns jsonb
language sql security definer set search_path = public stable as $$
  select jsonb_build_object('id', _mask(login_id), 'joined', joined) from profiles where name = p_name and email = lower(p_email) $$;

create or replace function public.verify_reset(p_id text, p_email text) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from profiles where login_id = lower(p_id) and email = lower(p_email)) $$;

create or replace function public.reset_password(p_id text, p_email text, p_password text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare u uuid;
begin
  select id into u from profiles where login_id = lower(p_id) and email = lower(p_email);
  if u is null then perform _err('아이디와 이메일이 일치하는 회원이 없어요.'); end if;
  if p_password !~ '[A-Za-z]' or p_password !~ '[0-9]' or char_length(p_password) not between 8 and 20 then
    perform _err('비밀번호는 영문과 숫자를 섞어 8~20자로 만들어 주세요.');
  end if;
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() where id = u;
end $$;

-- ───────────────────────── account ─────────────────────────
create or replace function public.update_profile(p_name text, p_email text, p_phone text, p_marketing boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then perform _err('로그인이 필요해요.'); end if;
  if exists (select 1 from profiles where email = lower(p_email) and id <> auth.uid()) then
    perform _err('이미 다른 회원이 쓰고 있는 이메일이에요.');
  end if;
  update profiles set name = p_name, email = lower(p_email), phone = p_phone, marketing = p_marketing where id = auth.uid();
end $$;

create or replace function public.set_recent(p_recent integer[]) returns void
language sql security definer set search_path = public as $$
  update profiles set recent = p_recent[1:40] where id = auth.uid() $$;

create or replace function public.delete_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then perform _err('로그인이 필요해요.'); end if;
  delete from auth.users where id = auth.uid();
end $$;

create or replace function public.register_coupon(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare c text := upper(trim(p_code)); u profiles;
begin
  select * into u from profiles where id = auth.uid() for update;
  if u.id is null then perform _err('로그인이 필요해요.'); end if;
  if c not in ('WELCOME2026', 'WINTER10', 'BARODAM') then perform _err('없는 쿠폰 코드예요.'); end if;
  if c = any (u.used_codes) then perform _err('이미 등록한 코드예요.'); end if;
  update profiles set used_codes = used_codes || c where id = u.id;
  if c = 'WELCOME2026' then perform _coupon(u.id, '웰컴 코드 5,000원', 'won', 5000, 30000, null, null); return '웰컴 코드 5,000원'; end if;
  if c = 'WINTER10' then perform _coupon(u.id, '겨울 10% 할인', 'rate', 10, 20000, 20000, null); return '겨울 10% 할인'; end if;
  perform _coupon(u.id, '바로담 3,000원', 'won', 3000, 15000, null, null);
  return '바로담 3,000원';
end $$;

-- ───────────────────────── orders ─────────────────────────
create or replace function public._check_sheet(p jsonb) returns void language plpgsql as $$
begin
  if jsonb_typeof(p -> 'items') <> 'array' or jsonb_array_length(p -> 'items') = 0 then perform _err('주문할 상품이 없어요.'); end if;
  if (p ->> 'sub')::int <> (select sum((i ->> 'price')::int * (i ->> 'qty')::int) from jsonb_array_elements(p -> 'items') i) then
    perform _err('주문 금액이 맞지 않아요. 다시 시도해 주세요.');
  end if;
  if (p ->> 'ship')::int not in (0, 3000) then perform _err('배송비가 맞지 않아요.'); end if;
end $$;

create or replace function public.place_order(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  u profiles; cp coupons; o orders;
  sub int := (p ->> 'sub')::int; ship int := (p ->> 'ship')::int;
  cp_amt int := coalesce((p ->> 'couponAmount')::int, 0); pts int := coalesce((p ->> 'usePoints')::int, 0);
  total int; earn int; v_no text := _new_order_no();
begin
  select * into u from profiles where id = auth.uid() for update;
  if u.id is null then perform _err('로그인이 필요해요.'); end if;
  perform _check_sheet(p);
  if pts < 0 or pts > u.points then perform _err('적립금이 부족해요.'); end if;
  if p ->> 'couponId' is not null then
    select * into cp from coupons where id = (p ->> 'couponId')::uuid and uid = u.id and used is null and exp > now_ms() for update;
    if cp.id is null then perform _err('쓸 수 없는 쿠폰이에요.'); end if;
    if sub < cp.min then perform _err('쿠폰 최소 주문 금액이 안 돼요.'); end if;
    if cp_amt < 0 or cp_amt > sub + ship or (cp.type = 'won' and cp_amt > cp.val) or (cp.max is not null and cp.type = 'rate' and cp_amt > cp.max) then
      perform _err('쿠폰 할인 금액이 맞지 않아요.');
    end if;
    update coupons set used = now_ms() where id = cp.id;
  elsif cp_amt <> 0 then perform _err('쿠폰 할인 금액이 맞지 않아요.');
  end if;
  total := greatest(0, sub - cp_amt - pts + ship);
  earn := floor(total * case when p -> 'pay' ->> 'm' = 'baro' then 0.015 else 0.01 end);
  insert into orders (no, uid, body) values (v_no, u.id, jsonb_build_object(
    'items', p -> 'items', 'sub', sub, 'disc', coalesce((p ->> 'disc')::int, 0), 'cpAmt', cp_amt, 'cp', cp.name, 'cpId', cp.id,
    'usePts', pts, 'ship', ship, 'total', total, 'earn', earn, 'pay', p -> 'pay', 'addr', p -> 'addr', 'memo', coalesce(p ->> 'memo', ''),
    'inv', '5' || (10000000000 + floor(random() * 89999999999))::bigint)) returning * into o;
  if pts > 0 then perform _points(u.id, -pts, '주문 결제에 사용 (' || v_no || ')'); end if;
  return _order_json(o);
end $$;

create or replace function public.cancel_order(p_no text) returns void
language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  select * into o from orders where no = p_no and uid = auth.uid() for update;
  if o.no is null then perform _err('주문을 찾을 수 없어요.'); end if;
  if _order_step(o) not in ('paid', 'ready') then perform _err('이미 배송이 시작돼 취소할 수 없어요.'); end if;
  update orders set cancelled_at = now_ms() where no = p_no;
  if o.body ->> 'cpId' is not null then update coupons set used = null where id = (o.body ->> 'cpId')::uuid and uid = o.uid; end if;
  if (o.body ->> 'usePts')::int > 0 then perform _points(o.uid, (o.body ->> 'usePts')::int, '주문취소 적립금 반환 (' || p_no || ')'); end if;
end $$;

create or replace function public.confirm_order(p_no text) returns integer
language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  select * into o from orders where no = p_no and uid = auth.uid() for update;
  if o.no is null then perform _err('주문을 찾을 수 없어요.'); end if;
  if _order_step(o) <> 'done' then perform _err('배송이 끝난 주문만 구매확정할 수 있어요.'); end if;
  update orders set confirmed_at = now_ms() where no = p_no;
  perform _points(o.uid, (o.body ->> 'earn')::int, '구매확정 적립 (' || p_no || ')');
  return (o.body ->> 'earn')::int;
end $$;

create or replace function public.write_review(p_no text, p_k int, p_star int, p_txt text) returns void
language plpgsql security definer set search_path = public as $$
declare o orders; it jsonb; who text;
begin
  select * into o from orders where no = p_no and uid = auth.uid();
  it := o.body -> 'items' -> p_k;
  if o.no is null or it is null then perform _err('주문을 찾을 수 없어요.'); end if;
  if _order_step(o) not in ('done', 'confirmed') then perform _err('배송이 끝난 뒤에 쓸 수 있어요.'); end if;
  if exists (select 1 from reviews where oid = p_no and k = p_k) then perform _err('이미 상품평을 썼어요.'); end if;
  select _mask(login_id) into who from profiles where id = auth.uid();
  insert into reviews (uid, oid, k, pid, name, opt, star, txt, who) values (
    auth.uid(), p_no, p_k, (it ->> 'pid')::int, it ->> 'name',
    coalesce(nullif(concat_ws(' · ', it ->> 'color', case when it ->> 'size' is not null then '사이즈 ' || (it ->> 'size') end), ''), '기본'),
    p_star, p_txt, who);
  perform _points(auth.uid(), 500, '리뷰 작성 적립');
end $$;

create or replace function public.ask(p_pid int, p_cat text, p_title text, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare who text;
begin
  select _mask(login_id) into who from profiles where id = auth.uid();
  if who is null then perform _err('로그인이 필요해요.'); end if;
  insert into inquiries (uid, pid, cat, title, body, who) values (auth.uid(), p_pid, p_cat, p_title, p_body, who);
end $$;

-- ───────────────────────── guest orders ─────────────────────────
create or replace function public.place_guest_order(p jsonb, p_password text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare o orders; sub int := (p ->> 'sub')::int; ship int := (p ->> 'ship')::int;
begin
  perform _check_sheet(p);
  if char_length(p_password) < 4 then perform _err('주문 비밀번호를 4자 이상 입력해 주세요.'); end if;
  insert into orders (no, body, guest_pw) values (_new_order_no(), jsonb_build_object(
    'items', p -> 'items', 'sub', sub, 'disc', coalesce((p ->> 'disc')::int, 0), 'cpAmt', 0, 'cp', null, 'cpId', null,
    'usePts', 0, 'ship', ship, 'total', sub + ship, 'earn', 0, 'pay', p -> 'pay', 'addr', p -> 'addr', 'memo', coalesce(p ->> 'memo', ''),
    'buyer', p -> 'buyer', 'inv', '5' || (10000000000 + floor(random() * 89999999999))::bigint),
    crypt(p_password, gen_salt('bf'))) returning * into o;
  return _order_json(o);
end $$;

create or replace function public.lookup_guest_order(p_no text, p_password text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare o orders;
begin
  select * into o from orders where no = p_no and uid is null;
  if o.no is null or o.guest_pw <> crypt(p_password, o.guest_pw) then perform _err('주문번호 또는 주문 비밀번호가 맞지 않아요.'); end if;
  return _order_json(o);
end $$;

create or replace function public.cancel_guest_order(p_no text, p_password text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare o orders;
begin
  select * into o from orders where no = p_no and uid is null for update;
  if o.no is null or o.guest_pw <> crypt(p_password, o.guest_pw) then perform _err('주문을 찾을 수 없어요.'); end if;
  if _order_step(o) not in ('paid', 'ready') then perform _err('이미 배송이 시작돼 취소할 수 없어요.'); end if;
  update orders set cancelled_at = now_ms() where no = p_no returning * into o;
  return _order_json(o);
end $$;

-- ───────────────────────── careers ─────────────────────────
create or replace function public.submit_application(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a applications; n text;
begin
  if p ->> 'jobId' is null or p ->> 'email' !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' or char_length(p ->> 'name') < 2 then
    perform _err('지원서 내용을 확인해 주세요.');
  end if;
  if exists (select 1 from applications where job_id = p ->> 'jobId' and email = lower(p ->> 'email') and cancelled_at is null) then
    perform _err('이 이메일로 이미 지원한 포지션이에요. [지원 현황 조회]에서 확인해 주세요.');
  end if;
  loop
    n := 'BD' || (10000000 + floor(random() * 90000000))::int;
    exit when not exists (select 1 from applications where no = n);
  end loop;
  insert into applications (no, job_id, email, body) values (n, p ->> 'jobId', lower(p ->> 'email'), p) returning * into a;
  return a.body || jsonb_build_object('no', a.no, 'at', a.at, 'email', a.email);
end $$;

create or replace function public.lookup_application(p_email text, p_no text) returns jsonb
language sql security definer set search_path = public stable as $$
  select body || jsonb_build_object('no', no, 'at', at, 'email', email, 'cancelledAt', cancelled_at)
  from applications where email = lower(p_email) and no = upper(p_no) $$;

create or replace function public.cancel_application(p_email text, p_no text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update applications set cancelled_at = now_ms()
  where email = lower(p_email) and no = upper(p_no) and cancelled_at is null and now_ms() - at < 3600000;
  if not found then perform _err('취소할 수 없는 지원이에요.'); end if;
end $$;

create or replace function public.recruit_inquire(p_name text, p_email text, p_type text, p_body text) returns void
language sql security definer set search_path = public as $$
  insert into recruit_inquiries (name, email, type, body) values (p_name, lower(p_email), p_type, p_body) $$;

-- members-only functions
revoke execute on function public.update_profile, public.set_recent, public.delete_account, public.register_coupon,
  public.place_order, public.cancel_order, public.confirm_order, public.write_review, public.ask from public, anon;
grant execute on function public.update_profile, public.set_recent, public.delete_account, public.register_coupon,
  public.place_order, public.cancel_order, public.confirm_order, public.write_review, public.ask to authenticated;

-- ───────────────────────── cart · wishlist · followed brands (follow the member across devices) ─────────────────────────
alter table public.profiles add column if not exists cart    jsonb    not null default '[]';
alter table public.profiles add column if not exists wish    integer[] not null default '{}';
alter table public.profiles add column if not exists follows text[]    not null default '{}';

create or replace function public.save_shopping(p_cart jsonb, p_wish integer[], p_follows text[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then perform _err('로그인이 필요해요.'); end if;
  if jsonb_typeof(p_cart) <> 'array' or jsonb_array_length(p_cart) > 100 then perform _err('장바구니에는 100개까지 담을 수 있어요.'); end if;
  update profiles set cart = p_cart, wish = p_wish[1:300], follows = p_follows[1:100] where id = auth.uid();
end $$;
revoke execute on function public.save_shopping from public, anon;
grant execute on function public.save_shopping to authenticated;
