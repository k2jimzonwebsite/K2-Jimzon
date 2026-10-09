-- IDEA-20261002-02 / MAP-023/017/020. Prepared only; no historical backfill.
-- Apply after the whole confirmation, payment/handover and structured-payment
-- migrations. Preserve the latest structured record, reviewer and signed wrapper.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

do $structured_commitment$
declare
  v_oid oid:=to_regprocedure('public.set_order_request_payment_status(uuid,text,text,jsonb)');
  v_before pg_proc%rowtype; v_after pg_proc%rowtype;
  v_definition text; v_expected text; v_old text; v_new text;
begin
  if v_oid is null or to_regprocedure('public.commit_order_request_stock_v1(uuid,text,text)') is null
     or position('K2_RESERVATION_COMMITTED_COVERAGE_V1' in pg_get_functiondef(
       'public.reserve_order_request_lots_v1(uuid,text)'::regprocedure))=0
     or position('K2_HANDOVER_STOCK_COMMITMENT_V1' in pg_get_functiondef(
       'public.fulfill_order_request(uuid,text)'::regprocedure))=0 then
    raise exception 'MAP-023 structured commitment: apply complete lifecycle prerequisites';
  end if;
  select * into v_before from pg_proc where oid=v_oid;
  select replace(pg_get_functiondef(v_oid),E'\r\n',E'\n') into v_definition;
  -- Pin the entire reviewed original/current body, including authorization and
  -- distinct-reviewer conditions outside the four patch anchors. LF-normalized
  -- prosrc hashes come from the whole 20260916 structured source and this patch.
  -- Accept no partially patched body or unreviewed security/default metadata.
  if md5(replace(v_before.prosrc,E'\r\n',E'\n')) not in (
       '2cb985d74388f88859b354dd819922f1','c306b7e5f3df57efcfad47c718d58dd4')
     or not v_before.prosecdef or v_before.prorettype<>'public.order_requests'::regtype
     or v_before.proowner<>'postgres'::regrole or v_before.proargdefaults is not null
     or v_before.proisstrict or v_before.provolatile<>'v'
     or v_before.proconfig is distinct from array['search_path=""']
     or v_before.proacl is null
     or exists(select 1 from aclexplode(v_before.proacl) a where a.grantee<>v_before.proowner)
     or position('K2_PAYMENT_BALANCE_INTEGRITY_V1' in v_definition)=0
     or position('K2_PAYMENT_INDEPENDENT_REVIEW_REQUIRED' in v_definition)=0
     or position('payment_evidence = v_structured_evidence' in v_definition)=0 then
    raise exception 'MAP-023 structured commitment: unfamiliar payment definition';
  end if;

  v_expected:=v_definition;
  for v_old,v_new in select * from (values
    ($old$or r.expires_at is null or r.expires_at<=clock_timestamp()$old$,
     $new$or ((r.committed_at is not null or r.committed_by is not null or r.commit_cause is not null)
              and not coalesce(r.committed_at is not null and r.committed_by is not null
                and r.commit_cause in ('confirmation','payment_verification'),false))
            or (r.committed_at is null and (r.expires_at is null or r.expires_at<=clock_timestamp()))$new$),
    ($old$and r.expires_at>clock_timestamp()$old$,
     $new$and (r.committed_at is not null or r.expires_at>clock_timestamp())$new$),
    ($old$if v_method not in ('gcash', 'bank_transfer', 'maya', 'cash', 'other') then$old$,
     $new$if v_method is null or v_method not in ('gcash', 'bank_transfer', 'maya', 'cash', 'other') then$new$),
    ($old$    v_structured_evidence := coalesce(v_order.payment_evidence, '{}'::jsonb) || jsonb_build_object($old$,
     $new$    -- K2_STRUCTURED_PAYMENT_STOCK_COMMITMENT_V1: after eligibility and distinct review.
    perform public.commit_order_request_stock_v1(v_order.id,'payment_verification',p_evidence_note);
    v_structured_evidence := coalesce(v_order.payment_evidence, '{}'::jsonb) || jsonb_build_object($new$)
  ) as replacements(old_text,new_text)
  loop
    if (length(v_expected)-length(replace(v_expected,v_new,'')))/length(v_new)=1 then
      if (length(v_expected)-length(replace(v_expected,v_old,'')))/length(v_old)
         <>(length(v_new)-length(replace(v_new,v_old,'')))/length(v_old) then
        raise exception 'MAP-023 structured commitment: mixed payment guards';
      end if;
    elsif (length(v_expected)-length(replace(v_expected,v_old,'')))/length(v_old)=1 then
      v_expected:=replace(v_expected,v_old,v_new);
    else
      raise exception 'MAP-023 structured commitment: payment anchor changed';
    end if;
  end loop;
  if v_expected<>v_definition then execute v_expected; end if;
  select * into v_after from pg_proc where oid=v_oid;
  if replace(pg_get_functiondef(v_oid),E'\r\n',E'\n')<>v_expected
     or md5(replace(v_after.prosrc,E'\r\n',E'\n'))<>'c306b7e5f3df57efcfad47c718d58dd4'
     or v_after.proowner<>v_before.proowner
     or v_after.proacl is distinct from v_before.proacl
     or v_after.proconfig is distinct from v_before.proconfig
     or v_after.proargdefaults is distinct from v_before.proargdefaults then
    raise exception 'MAP-023 structured commitment: payment metadata changed';
  end if;
end $structured_commitment$;
notify pgrst,'reload schema';
commit;
