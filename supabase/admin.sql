-- ───────────────────────── admin (운영자) ─────────────────────────
-- Run after schema.sql. Grant the role with:  update public.profiles set is_admin = true where login_id = '<아이디>';
alter table public.profiles     add column if not exists is_admin    boolean not null default false;
alter table public.inquiries    add column if not exists answer      text;
alter table public.inquiries    add column if not exists answered_at bigint;
alter table public.applications add column if not exists status      text not null default '접수 완료';
alter table public.applications add column if not exists status_at   bigint;
alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check
  check (status in ('접수 완료', '서류 검토 중', '면접 진행', '최종 합격', '불합격'));

create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false) $$;

create or replace function public._need_admin() returns void language plpgsql security definer set search_path = public as $$
begin if not is_admin() then perform _err('관리자만 할 수 있어요.'); end if; end $$;

-- cancellation shared by the member and the operator
create or replace function public._cancel(o public.orders, p_why text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update orders set cancelled_at = now_ms() where no = o.no;
  if o.uid is not null and o.body ->> 'cpId' is not null then
    update coupons set used = null where id = (o.body ->> 'cpId')::uuid and uid = o.uid;
  end if;
  if o.uid is not null and (o.body ->> 'usePts')::int > 0 then
    perform _points(o.uid, (o.body ->> 'usePts')::int, p_why || ' 적립금 반환 (' || o.no || ')');
  end if;
end $$;

create or replace function public.cancel_order(p_no text) returns void
language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  select * into o from orders where no = p_no and uid = auth.uid() for update;
  if o.no is null then perform _err('주문을 찾을 수 없어요.'); end if;
  if _order_step(o) not in ('paid', 'ready') then perform _err('이미 배송이 시작돼 취소할 수 없어요.'); end if;
  perform _cancel(o, '주문취소');
end $$;

create or replace function public.admin_overview() returns jsonb
language plpgsql security definer set search_path = public stable as $$
declare day_start bigint := (extract(epoch from (date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul')) * 1000)::bigint;
begin
  perform _need_admin();
  return jsonb_build_object(
    'members', (select count(*) from profiles),
    'membersToday', (select count(*) from profiles where joined >= day_start),
    'ordersToday', (select count(*) from orders where at >= day_start and cancelled_at is null),
    'salesToday', (select coalesce(sum((body ->> 'total')::int), 0) from orders where at >= day_start and cancelled_at is null),
    'salesTotal', (select coalesce(sum((body ->> 'total')::int), 0) from orders where cancelled_at is null),
    'ordersTotal', (select count(*) from orders where cancelled_at is null),
    'cancelled', (select count(*) from orders where cancelled_at is not null),
    'pendingInquiries', (select count(*) from inquiries where answer is null),
    'newApplications', (select count(*) from applications where status = '접수 완료' and cancelled_at is null),
    'recruitInquiries', (select count(*) from recruit_inquiries),
    'reviews', (select count(*) from reviews));
end $$;

create or replace function public.admin_orders(p_limit int default 100) returns jsonb
language plpgsql security definer set search_path = public stable as $$
begin
  perform _need_admin();
  return coalesce((select jsonb_agg(x order by (x ->> 'at')::bigint desc) from (
    select _order_json(o) || jsonb_build_object('step', _order_step(o), 'member', p.login_id, 'memberName', p.name) x
    from orders o left join profiles p on p.id = o.uid order by o.at desc limit least(p_limit, 500)) t), '[]');
end $$;

create or replace function public.admin_cancel_order(p_no text) returns void
language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  perform _need_admin();
  select * into o from orders where no = p_no for update;
  if o.no is null then perform _err('주문을 찾을 수 없어요.'); end if;
  if o.cancelled_at is not null or o.confirmed_at is not null then perform _err('이미 취소됐거나 구매확정된 주문이에요.'); end if;
  perform _cancel(o, '판매자 취소');
end $$;

create or replace function public.admin_inquiries(p_pending boolean default false) returns jsonb
language plpgsql security definer set search_path = public stable as $$
begin
  perform _need_admin();
  return coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'pid', q.pid, 'cat', q.cat, 'title', q.title, 'body', q.body, 't', q.t,
           'who', q.who, 'member', p.login_id, 'answer', q.answer, 'answeredAt', q.answered_at) order by q.answer is not null, q.t desc)
    from inquiries q join profiles p on p.id = q.uid where not p_pending or q.answer is null), '[]');
end $$;

create or replace function public.answer_inquiry(p_id uuid, p_answer text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _need_admin();
  if char_length(trim(p_answer)) < 5 then perform _err('답변을 5자 이상 써 주세요.'); end if;
  update inquiries set answer = trim(p_answer), answered_at = now_ms() where id = p_id;
  if not found then perform _err('문의를 찾을 수 없어요.'); end if;
end $$;

create or replace function public.admin_reviews() returns jsonb
language plpgsql security definer set search_path = public stable as $$
begin
  perform _need_admin();
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'pid', pid, 'name', name, 'opt', opt, 'star', star, 'txt', txt, 't', t, 'who', who) order by t desc)
    from (select * from reviews order by t desc limit 300) r), '[]');
end $$;

create or replace function public.admin_delete_review(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin perform _need_admin(); delete from reviews where id = p_id; end $$;

create or replace function public.admin_applications() returns jsonb
language plpgsql security definer set search_path = public stable as $$
begin
  perform _need_admin();
  return coalesce((select jsonb_agg(body || jsonb_build_object('no', no, 'at', at, 'email', email, 'status', status, 'statusAt', status_at, 'cancelledAt', cancelled_at) order by at desc)
    from applications), '[]');
end $$;

create or replace function public.admin_set_application(p_no text, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _need_admin();
  update applications set status = p_status, status_at = now_ms() where no = p_no and cancelled_at is null;
  if not found then perform _err('지원서를 찾을 수 없거나 취소된 지원이에요.'); end if;
end $$;

create or replace function public.admin_recruit_inquiries() returns jsonb
language plpgsql security definer set search_path = public stable as $$
begin
  perform _need_admin();
  return coalesce((select jsonb_agg(to_jsonb(r) order by r.at desc) from recruit_inquiries r), '[]');
end $$;

-- applicants see the status the operator set; they can cancel only before review starts
create or replace function public.lookup_application(p_email text, p_no text) returns jsonb
language sql security definer set search_path = public stable as $$
  select body || jsonb_build_object('no', no, 'at', at, 'email', email, 'cancelledAt', cancelled_at, 'status', status, 'statusAt', status_at)
  from applications where email = lower(p_email) and no = upper(p_no) $$;

create or replace function public.cancel_application(p_email text, p_no text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update applications set cancelled_at = now_ms()
  where email = lower(p_email) and no = upper(p_no) and cancelled_at is null and status = '접수 완료';
  if not found then perform _err('서류 검토가 시작된 지원은 취소할 수 없어요. 채용 문의로 연락해 주세요.'); end if;
end $$;

revoke execute on function public._cancel, public._need_admin from public, anon, authenticated;
revoke execute on function public.admin_overview, public.admin_orders, public.admin_cancel_order, public.admin_inquiries, public.answer_inquiry,
  public.admin_delete_review, public.admin_reviews, public.admin_applications, public.admin_set_application, public.admin_recruit_inquiries from public, anon;
grant execute on function public.admin_overview, public.admin_orders, public.admin_cancel_order, public.admin_inquiries, public.answer_inquiry,
  public.admin_delete_review, public.admin_reviews, public.admin_applications, public.admin_set_application, public.admin_recruit_inquiries, public.is_admin to authenticated;
