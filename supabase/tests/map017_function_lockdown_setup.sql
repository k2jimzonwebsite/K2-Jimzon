-- Isolated disposable fixture. Real function bodies are installed by the runner.
create temp table lockdown_definitions as
select oid, pg_get_functiondef(oid) definition from pg_proc
where pronamespace='public'::regnamespace;

do $$ declare r record; begin
  for r in select oid::regprocedure signature from pg_proc
    where pronamespace='public'::regnamespace and proname in
    ('reject_event_mutation','sync_product_compat_columns','sync_product_batch_compat_columns',
     'prevent_conversation_event_mutation','touch_staff_allocations','receive_po','receive_po_scanned')
  loop
    execute format('grant execute on function %s to public, anon, authenticated',r.signature);
  end loop;
end $$;

create table public.purchase_orders(id uuid primary key, status public.po_status);
insert into public.purchase_orders values ('00000000-0000-0000-0000-000000000017','Received');
grant select, update on public.purchase_orders to service_role;

create temp table lockdown_events(value text);
create temp table lockdown_conversations(value text);
create temp table lockdown_staff(updated_at timestamptz);
create temp table lockdown_products(
  sku text, name text, title text, srp numeric, retail_price numeric,
  wholesale_price numeric, vip_price numeric, stock_available integer,
  total_stock integer, updated_at timestamptz
);
create temp table lockdown_batches(
  box_code text, batch_code text, expiry_date date, best_before_date date,
  quantity integer, quantity_available integer
);
create trigger guard before update or delete on lockdown_events
  for each row execute function public.reject_event_mutation();
create trigger guard before update or delete on lockdown_conversations
  for each row execute function public.prevent_conversation_event_mutation();
create trigger touch before update on lockdown_staff
  for each row execute function public.touch_staff_allocations();
create trigger sync before insert or update on lockdown_products
  for each row execute function public.sync_product_compat_columns();
create trigger sync before insert or update on lockdown_batches
  for each row execute function public.sync_product_batch_compat_columns();
insert into lockdown_events values ('preserve');
insert into lockdown_conversations values ('preserve');
insert into lockdown_staff values ('2000-01-01');
grant select, insert, update, delete on lockdown_events, lockdown_conversations,
  lockdown_staff, lockdown_products, lockdown_batches to authenticated;
