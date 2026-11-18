-- ───────────────────────── unit prices and stock (run after products.sql) ─────────────────────────
-- Every order line is checked against public.products: the unit price must match and enough stock must be left.
-- Stock is taken in the same transaction as the order and given back when an order is cancelled.

create or replace function public._check_sheet(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare it jsonb; pr products; qty int;
begin
  if jsonb_typeof(p -> 'items') <> 'array' or jsonb_array_length(p -> 'items') = 0 then perform _err('주문할 상품이 없어요.'); end if;
  if jsonb_array_length(p -> 'items') > 50 then perform _err('한 번에 50개 상품까지 주문할 수 있어요.'); end if;
  if (p ->> 'sub')::int <> (select sum((i ->> 'price')::int * (i ->> 'qty')::int) from jsonb_array_elements(p -> 'items') i) then
    perform _err('주문 금액이 맞지 않아요. 다시 시도해 주세요.');
  end if;
  if (p ->> 'ship')::int not in (0, 3000) then perform _err('배송비가 맞지 않아요.'); end if;
  for it in select * from jsonb_array_elements(p -> 'items') loop
    qty := (it ->> 'qty')::int;
    if qty is null or qty < 1 or qty > 99 then perform _err('주문 수량을 확인해 주세요.'); end if;
    select * into pr from products where id = (it ->> 'pid')::int for update;
    if pr.id is null then perform _err('판매하지 않는 상품이 있어요. 장바구니를 다시 확인해 주세요.'); end if;
    if pr.price <> (it ->> 'price')::int then perform _err('「' || pr.name || '」 가격이 바뀌었어요. 장바구니를 다시 확인해 주세요.'); end if;
    if pr.stock < qty then
      perform _err(case when pr.stock = 0 then '「' || pr.name || '」 상품이 품절됐어요.'
                        else '「' || pr.name || '」 재고가 부족해요. (남은 수량 ' || pr.stock || '개)' end);
    end if;
    update products set stock = stock - qty where id = pr.id;
  end loop;
end $$;

create or replace function public._restock(o public.orders) returns void
language sql security definer set search_path = public as $$
  update products p set stock = p.stock + x.qty
  from (select (i ->> 'pid')::int pid, sum((i ->> 'qty')::int) qty from jsonb_array_elements(o.body -> 'items') i group by 1) x
  where p.id = x.pid $$;

create or replace function public._cancel(o public.orders, p_why text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update orders set cancelled_at = now_ms() where no = o.no;
  perform _restock(o);
  if o.uid is not null and o.body ->> 'cpId' is not null then
    update coupons set used = null where id = (o.body ->> 'cpId')::uuid and uid = o.uid;
  end if;
  if o.uid is not null and (o.body ->> 'usePts')::int > 0 then
    perform _points(o.uid, (o.body ->> 'usePts')::int, p_why || ' 적립금 반환 (' || o.no || ')');
  end if;
end $$;

create or replace function public.cancel_guest_order(p_no text, p_password text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare o orders;
begin
  select * into o from orders where no = p_no and uid is null for update;
  if o.no is null or o.guest_pw <> crypt(p_password, o.guest_pw) then perform _err('주문을 찾을 수 없어요.'); end if;
  if _order_step(o) not in ('paid', 'ready') then perform _err('이미 배송이 시작돼 취소할 수 없어요.'); end if;
  perform _cancel(o, '주문취소');
  select * into o from orders where no = p_no;
  return _order_json(o);
end $$;

-- internal helpers are not part of the public API
revoke execute on function public._check_sheet, public._restock, public._cancel, public._points, public._coupon from public, anon, authenticated;
