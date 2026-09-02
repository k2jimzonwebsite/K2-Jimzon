do $preflight$
begin
  if to_regclass('public.channel_shops') is null then
    raise exception 'channel_shops is required';
  end if;
  if to_regclass('public.products') is null
     or to_regprocedure('public.generate_k2_sku_internal()') is null then
    raise exception 'server product identity is required';
  end if;
  if to_regclass('k2_private.admin_command_receipts') is null
     or to_regprocedure('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)') is null then
    raise exception 'signed Admin BFF foundation is required';
  end if;
  if to_regclass('k2_private.marketplace_snapshot_imports') is not null then
    if exists(
      select 1
      from k2_private.marketplace_snapshot_imports
      where schema_version<>'k2.marketplace-snapshot.v1'
    ) then
      raise exception 'unexpected staged snapshot schema version exists';
    end if;
  end if;
end
$preflight$;
select 'MARKETPLACE_SNAPSHOT_PREFLIGHT_OK';
