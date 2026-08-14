-- Read-only compatibility gate for 20260811_product_intake_and_sku_gate.sql.
do $$
declare
  v_missing text[] := '{}';
begin
  if to_regclass('public.products') is null then v_missing := array_append(v_missing, 'public.products'); end if;
  if to_regclass('public.brands') is null then v_missing := array_append(v_missing, 'public.brands'); end if;
  if to_regclass('public.categories') is null then v_missing := array_append(v_missing, 'public.categories'); end if;
  if to_regclass('public.audit_logs') is null then v_missing := array_append(v_missing, 'public.audit_logs'); end if;
  if to_regclass('public.product_batches') is null then v_missing := array_append(v_missing, 'public.product_batches'); end if;
  if to_regclass('public.consignments') is null then v_missing := array_append(v_missing, 'public.consignments'); end if;
  if to_regclass('public.consignment_items') is null then v_missing := array_append(v_missing, 'public.consignment_items'); end if;
  if to_regprocedure('public.is_staff()') is null then v_missing := array_append(v_missing, 'public.is_staff()'); end if;
  if to_regprocedure('public.is_admin()') is null then v_missing := array_append(v_missing, 'public.is_admin()'); end if;
  if to_regprocedure('public.add_consignment_item_v2(uuid,text,text,text,date,integer)') is null then
    v_missing := array_append(v_missing, 'public.add_consignment_item_v2(uuid,text,text,text,date,integer)');
  end if;
  if to_regprocedure('public.reconcile_product_batches(text,jsonb,text)') is null then
    v_missing := array_append(v_missing, 'public.reconcile_product_batches(text,jsonb,text)');
  end if;
  if cardinality(v_missing) > 0 then
    raise exception 'MAP-018 preflight missing dependencies: %', array_to_string(v_missing, ', ');
  end if;

  if exists (
    select 1 from (values
      ('products','id','uuid'), ('products','sku','character varying'),
      ('products','barcode','character varying'), ('products','brand_id','uuid'),
      ('products','category_id','uuid'), ('products','status','character varying'),
      ('products','ingredients','text'), ('products','published','boolean'),
      ('audit_logs','table_name','text'), ('audit_logs','record_id','text'),
      ('audit_logs','action','text'), ('audit_logs','new_data','jsonb'),
      ('audit_logs','user_id','uuid')
    ) expected(table_name, column_name, data_type)
    where not exists (
      select 1 from information_schema.columns actual
      where actual.table_schema = 'public'
        and actual.table_name = expected.table_name
        and actual.column_name = expected.column_name
        and actual.data_type = expected.data_type
    )
  ) then
    raise exception 'MAP-018 preflight found an incompatible live column contract';
  end if;

  if to_regclass('public.product_intake_sessions') is not null and exists (
    select 1 from (values
      ('id'), ('request_id'), ('created_by'), ('checklist_step'),
      ('draft_payload'), ('field_decisions'), ('assigned_sku'), ('product_id')
    ) expected(column_name)
    where not exists (
      select 1 from information_schema.columns actual
      where actual.table_schema = 'public'
        and actual.table_name = 'product_intake_sessions'
        and actual.column_name = expected.column_name
    )
  ) then
    raise exception 'MAP-018 preflight found an incompatible existing intake table';
  end if;

  raise notice 'MAP-018 product-intake preflight passed';
end $$;
