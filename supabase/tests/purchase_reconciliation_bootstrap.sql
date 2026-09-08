-- Extends only the disposable purchase fixture for the actual recount function.
alter table products add column total_stock integer default 0;
alter table product_batches add column quantity_available integer default 0,
  add column box_code text, add column batch_code text, add column landed_date date,
  add column hub text, add column custodian text, add column channel text,
  add column is_pinned boolean default false, add column clearance_approved_by uuid;
create table batch_change_events (
  batch_id uuid,sku text,reason text,old_data jsonb,new_data jsonb,actor_id uuid
);
insert into products(sku,name,srp,stock_available) values ('RECON-RACE','Recount race',100,2);
insert into product_batches(id,sku,quantity,quantity_available,expiry_date,box_code)
  values('90000000-0000-4000-8000-000000000001','RECON-RACE',2,2,current_date+180,'RACE-BOX');
insert into inventory_balances(sku,location_code,on_hand) values('RECON-RACE','MANILA_MAIN',2);
insert into order_requests(id,idempotency_key,channel_source)
  values('90000000-0000-4000-8000-000000000002','recon-purchase','pasabuy');
insert into order_request_items(order_request_id,sku,quantity,unit_price,line_total)
  values('90000000-0000-4000-8000-000000000002','RECON-RACE',1,100,100);
create function fixture_pause_recon_purchase() returns trigger language plpgsql as $$
begin if new.sku='RECON-RACE' then perform pg_sleep(2); end if; return new; end $$;
create trigger fixture_pause_recon_purchase before insert on inventory_reservations
  for each row execute function fixture_pause_recon_purchase();
