-- MAP-023 / IDEA-20261030-01: Italy counts a physical box; product lot facts
-- may remain unknown until receiving. Unknown-date received stock is quarantine.
begin;

alter table public.consignment_items alter column batch_code drop not null;
alter table public.consignment_items alter column best_before_date drop not null;

-- Preserve one count-only line per SKU/box when the lot is still unknown.
create unique index consignment_items_manifest_lot_box_nullsafe_uniq
  on public.consignment_items (consignment_id, sku, batch_code, box_code) nulls not distinct;
drop index public.consignment_items_manifest_lot_box_uniq;

do $patch$
declare d text; old text; replacement text;
begin
 d:=pg_get_functiondef('k2_private.apply_consignment_packing_v1(uuid,jsonb)'::regprocedure);

 old:='or length(trim(coalesce(p->>''batchCode'',''''))) not between 1 and 120';
 replacement:='or not (p ? ''batchCode'' and p ? ''bestBeforeDate'')
    or (p->''batchCode'' <> ''null''::jsonb and length(trim(coalesce(p->>''batchCode'',''''))) not between 1 and 120)
    or ((p->>''batchCode'' is null) <> (p->>''bestBeforeDate'' is null))';
 if (length(d)-length(replace(d,old,'')))/length(old)<>1 then raise exception 'K2_PACKING_SOURCE_DRIFT'; end if;
 d:=replace(d,old,replacement);

 old:='if expiry is null or expiry<stamp or expiry>(stamp+interval ''10 years'')::date then';
 replacement:='if expiry is not null and (expiry<stamp or expiry>(stamp+interval ''10 years'')::date) then';
 if (length(d)-length(replace(d,old,'')))/length(old)<>1 then raise exception 'K2_PACKING_SOURCE_DRIFT'; end if;
 d:=replace(d,old,replacement);

 old:='row(trim(p->>''boxCode''),trim(p->>''batchCode''),expiry)';
 replacement:='row(trim(p->>''boxCode''),nullif(trim(p->>''batchCode''),''''),expiry)';
 if (length(d)-length(replace(d,old,'')))/length(old)<>1 then raise exception 'K2_PACKING_SOURCE_DRIFT'; end if;
 d:=replace(d,old,replacement);

 old:='select * into i from public.consignment_items where consignment_id=c.id and consignment_items.sku=product.sku
     and box_code=trim(p->>''boxCode'') and batch_code=trim(p->>''batchCode'') for update;';
 replacement:='select count(*) into matches from public.consignment_items where consignment_id=c.id
     and consignment_items.sku=product.sku and box_code=trim(p->>''boxCode'')
     and batch_code is not distinct from nullif(trim(p->>''batchCode''),'''')
     and best_before_date is not distinct from expiry;
   if matches>1 then raise exception ''K2_PACKING_LOT_MISMATCH''; end if;
   select * into i from public.consignment_items where consignment_id=c.id and consignment_items.sku=product.sku
     and box_code=trim(p->>''boxCode'')
     and batch_code is not distinct from nullif(trim(p->>''batchCode''),'''')
     and best_before_date is not distinct from expiry for update;';
 if (length(d)-length(replace(d,old,'')))/length(old)<>1 then raise exception 'K2_PACKING_SOURCE_DRIFT'; end if;
 d:=replace(d,old,replacement);

 old:='if i.best_before_date<>expiry then raise exception ''K2_PACKING_LOT_MISMATCH''; end if;';
 replacement:='if expiry is not null and i.best_before_date is distinct from expiry then raise exception ''K2_PACKING_LOT_MISMATCH''; end if;';
 if (length(d)-length(replace(d,old,'')))/length(old)<>1 then raise exception 'K2_PACKING_SOURCE_DRIFT'; end if;
 d:=replace(d,old,replacement);

 execute d;
end $patch$;

-- The batch compatibility trigger otherwise copies a box code into a missing
-- batch. Name the quarantined holding lot explicitly as unverified instead.
-- The existing NULL-date branch remains quarantine, never available stock.
do $receiving$
declare d text; old text; replacement text;
begin
 d:=pg_get_functiondef('k2_private.finalize_consignment_receipt_v1(uuid,text,text,text)'::regprocedure);
 old:='v_item.sku, v_item.box_code, v_item.batch_code,';
 replacement:='v_item.sku, v_item.box_code, coalesce(v_item.batch_code,''UNVERIFIED-''||v_item.box_code),';
 if (length(d)-length(replace(d,old,'')))/length(old)<>1 then raise exception 'K2_RECEIVING_SOURCE_DRIFT'; end if;
 if position('v_days:=null;' in d)=0
   or position('if v_item.best_before_date is not null and pg_catalog.isfinite(v_item.best_before_date) then' in d)=0
   or position('v_status := case when v_days>=v_minimum then ''available'' else ''quarantine'' end;' in d)=0
   then raise exception 'K2_RECEIVING_QUARANTINE_DRIFT'; end if;
 d:=replace(d,old,replacement);
 execute d;
end $receiving$;

notify pgrst,'reload schema';
commit;
