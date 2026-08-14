-- Assertions for the exact MAP-018 migration. Safe inside rollback rehearsals.
do $$
declare
  v_bucket record;
  v_constraint text;
begin
  if to_regclass('public.product_intake_sessions') is null then
    raise exception 'product_intake_sessions was not created';
  end if;
  if not exists (
    select 1 from information_schema.columns where table_schema = 'public'
      and table_name = 'product_batches' and column_name = 'unit_cost'
  ) or not exists (
    select 1 from information_schema.columns where table_schema = 'public'
      and table_name = 'product_batches' and column_name = 'owner_code'
  ) or not exists (
    select 1 from information_schema.columns where table_schema = 'public'
      and table_name = 'product_batches' and column_name = 'source_type'
  ) then raise exception 'lot cost/owner/source columns were not added'; end if;
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'product_intake_sessions'
      and c.relrowsecurity and c.relforcerowsecurity
  ) then raise exception 'intake RLS is not enabled and forced'; end if;

  if has_table_privilege('anon', 'public.product_intake_sessions', 'SELECT')
     or has_table_privilege('anon', 'public.product_intake_sessions', 'INSERT')
     or has_table_privilege('anon', 'public.product_intake_sessions', 'UPDATE')
     or has_table_privilege('anon', 'public.product_intake_sessions', 'DELETE') then
    raise exception 'anon retains intake-table privileges';
  end if;
  if has_column_privilege('authenticated', 'public.product_intake_sessions', 'product_id', 'UPDATE')
     or has_column_privilege('authenticated', 'public.product_intake_sessions', 'assigned_sku', 'UPDATE')
     or has_column_privilege('authenticated', 'public.product_intake_sessions', 'status', 'UPDATE')
     or has_column_privilege('authenticated', 'public.product_intake_sessions', 'inventory_result', 'UPDATE') then
    raise exception 'browser role can update server-owned intake columns';
  end if;
  if not has_column_privilege('authenticated', 'public.product_intake_sessions', 'checklist_step', 'UPDATE')
     or not has_column_privilege('authenticated', 'public.product_intake_sessions', 'draft_payload', 'UPDATE') then
    raise exception 'browser role lacks intended resumable-session columns';
  end if;

  if (select count(*) from pg_policies where schemaname = 'public'
      and tablename = 'product_intake_sessions') <> 3 then
    raise exception 'unexpected intake RLS policy count';
  end if;

  if has_function_privilege('anon', 'public.create_product_draft_server(uuid,uuid,jsonb,jsonb)', 'EXECUTE')
     or has_function_privilege('anon', 'public.create_product_first_inventory_server(uuid,uuid,text,jsonb)', 'EXECUTE')
     or has_function_privilege('anon', 'public.transition_product_publication_server(uuid,text)', 'EXECUTE') then
    raise exception 'anon can execute a staff intake command';
  end if;
  if not has_function_privilege('authenticated', 'public.create_product_draft_server(uuid,uuid,jsonb,jsonb)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.create_product_first_inventory_server(uuid,uuid,text,jsonb)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.transition_product_publication_server(uuid,text)', 'EXECUTE') then
    raise exception 'authenticated staff role lacks an intake command grant';
  end if;
  if has_function_privilege('authenticated', 'public.generate_k2_sku_internal()', 'EXECUTE')
     or has_function_privilege('anon', 'public.generate_k2_sku_internal()', 'EXECUTE') then
    raise exception 'internal SKU generator is externally executable';
  end if;
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'generate_k2_sku_internal', 'create_product_draft_server',
        'create_product_first_inventory_server', 'transition_product_publication_server'
      )
      and (
        not p.prosecdef
        or not exists (
          select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) setting
          where setting like 'search_path=%'
        )
      )
  ) then raise exception 'a privileged intake function lacks definer/search-path hardening'; end if;

  select public, file_size_limit, allowed_mime_types into v_bucket
  from storage.buckets where id = 'product-intake-evidence';
  if not found or v_bucket.public or v_bucket.file_size_limit <> 10485760
     or not (v_bucket.allowed_mime_types @> array['image/jpeg','image/png','image/webp']::text[])
     or cardinality(v_bucket.allowed_mime_types) <> 3 then
    raise exception 'private evidence bucket limits are incorrect';
  end if;
  if (select count(*) from pg_policies where schemaname = 'storage'
      and tablename = 'objects' and policyname like 'product_intake_evidence_%') <> 4 then
    raise exception 'private evidence Storage policies are incomplete';
  end if;

  select pg_get_constraintdef(oid) into v_constraint
  from pg_constraint
  where conrelid = 'public.products'::regclass and conname = 'products_status_check';
  if v_constraint is null or position('Under Review' in v_constraint) = 0 then
    raise exception 'publication status constraint was not upgraded';
  end if;
  if not exists (
    select 1 from pg_trigger where tgrelid = 'public.products'::regclass
      and tgname = 'trg_sync_product_publication_status' and not tgisinternal
  ) then raise exception 'publication sync trigger is missing'; end if;

  raise notice 'MAP-018 product-intake postflight passed';
end $$;
