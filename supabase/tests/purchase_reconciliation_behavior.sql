begin;
do $$
declare v_payload jsonb; v_events integer;
begin
  select jsonb_build_array(jsonb_build_object('id',id,'quantity',quantity,
    'box_code',box_code,'expiry_date',expiry_date,'inventory_status','available'))
    into v_payload from product_batches where sku='RECON-RACE';
  select count(*) into v_events from batch_change_events;
  begin
    perform reconcile_product_batches('RECON-RACE',jsonb_set(v_payload,'{0,quantity}','0'),'Invalid count below hold');
    raise exception 'Recount destroyed reserved units';
  exception when raise_exception then
    if sqlerrm<>'Batch quantity cannot be lower than its reserved quantity' then raise; end if;
  end;
  begin
    perform reconcile_product_batches('RECON-RACE','[]','Missing physical lot');
    raise exception 'Recount removed a historical lot';
  exception when raise_exception then
    if sqlerrm not like 'Existing lots cannot be removed.%' then raise; end if;
  end;
  if (select count(*) from batch_change_events)<>v_events
    or (select reserved_quantity from product_batches where sku='RECON-RACE')<>1
    or (select stock_available from products where sku='RECON-RACE')<>1
    then raise exception 'Rejected recount changed ledger'; end if;
  -- Balance creation must retain commitments represented by existing lot counters.
  delete from inventory_balances where sku='RECON-RACE';
  perform reconcile_product_batches('RECON-RACE',v_payload,'Rebuild missing balance from exact lots');
  if not exists(select 1 from inventory_balances where sku='RECON-RACE' and on_hand=2 and reserved=1)
    then raise exception 'Balance initialization lost reserved units'; end if;
  -- First count of a new product still works without a pre-existing balance.
  insert into products(sku,name,srp) values('RECON-NEW','First count fixture',100);
  perform reconcile_product_batches('RECON-NEW',jsonb_build_array(jsonb_build_object(
    'quantity',2,'box_code','NEW-BOX','expiry_date',current_date+180)),'First physical count');
  if not exists(select 1 from inventory_balances where sku='RECON-NEW' and on_hand=2 and reserved=0)
    then raise exception 'First-count balance is incorrect'; end if;
end $$;
rollback;
