-- IDEA-20261002-05 / MAP-018. PREPARED ONLY, outside activation migrations.
-- Connected staff entry, post-resource context, eligibility and success cleanup.
-- Guest callers need their separately approved authority protocol before activation.
-- Exact canonical bodies/security metadata required; apply in one caller-owned transaction.
do $staff_policy$
declare t record;b pg_catalog.pg_proc%rowtype;a pg_catalog.pg_proc%rowtype;
 body text;definition text;r jsonb;old_text text;new_text text;metadata jsonb;
begin
 if current_user<>'postgres' or to_regprocedure('k2_private.current_category_lot_context_v1()') is null
  or to_regprocedure('k2_private.lock_category_policy_v1(boolean)') is null
  or to_regclass('k2_private.category_policy_command_config') is null then
  raise exception 'K2_CATEGORY_STAFF_TARGET_INVALID';
 end if;
 for t in select * from jsonb_to_recordset('[
  {
    "signature": "public.execute_admin_fulfillment_command_v1(text, bigint, uuid, uuid, text, text)",
    "md5": "450b82d654020b64c1b67658076cd16b",
    "metadata": {
      "proacl": [
        "postgres=X/postgres",
        "authenticated=X/postgres"
      ],
      "proconfig": [
        "search_path=\"\""
      ],
      "prosecdef": true,
      "provolatile": "v",
      "proparallel": "u",
      "proisstrict": false,
      "proretset": false,
      "proleakproof": false,
      "prokind": "f",
      "pronargdefaults": 0,
      "proargnames": [
        "p_action",
        "p_timestamp",
        "p_nonce",
        "p_idempotency_key",
        "p_payload_text",
        "p_signature"
      ],
      "proargmodes": null
    },
    "rules": [
      {
        "from": "  if p_action = ''confirm_order'' then",
        "to": "  -- Saved signed receipts above retain their historical outcome.\n  perform k2_private.lock_category_policy_v1(false);\n  if p_action = ''confirm_order'' then",
        "mode": "once"
      }
    ]
  },
  {
    "signature": "k2_private.lot_is_eligible_v1(public.product_batches)",
    "md5": "2339bbb8c55024babf0ea1d873e46413",
    "metadata": {
      "proacl": [
        "postgres=X/postgres"
      ],
      "proconfig": [
        "search_path=\"\""
      ],
      "prosecdef": false,
      "provolatile": "s",
      "proparallel": "u",
      "proisstrict": false,
      "proretset": false,
      "proleakproof": false,
      "prokind": "f",
      "pronargdefaults": 0,
      "proargnames": [
        "p_lot"
      ],
      "proargmodes": null
    },
    "rules": [
      {
        "from": "\n  with policy as (\n    select (pg_catalog.transaction_timestamp() at time zone ''Asia/Manila'')::date as today\n  )\n  select exists (\n    select 1 from public.hubs h\n    join public.custodians c on c.id=p_lot.custodian and c.hub_id=h.id\n    cross join policy d\n    where h.id=p_lot.hub and h.id=''HUB-MNL-CENTRAL'' and h.country=''PH''\n      and p_lot.inventory_status=''available'' and p_lot.quantity>0\n      and p_lot.reserved_quantity>=0 and p_lot.reserved_quantity<=p_lot.quantity\n      and (\n        coalesce(p_lot.expiry_date,p_lot.best_before_date)>=d.today+90\n        or (\n          coalesce(p_lot.expiry_date,p_lot.best_before_date) between d.today+31 and d.today+89\n          and p_lot.clearance_approved_at is not null and p_lot.clearance_approved_by is not null\n          and p_lot.clearance_approved_at<=pg_catalog.transaction_timestamp()\n          and exists (\n            select 1 from public.batch_change_events e\n            where e.batch_id=p_lot.id and e.sku=p_lot.sku and e.actor_id=p_lot.clearance_approved_by\n              and nullif(pg_catalog.btrim(e.reason),'''') is not null\n              -- Both supported approval writers save the marker and event with\n              -- now() in one transaction. A later recount is not an approval.\n              and e.created_at=p_lot.clearance_approved_at\n              and e.created_at<=pg_catalog.transaction_timestamp()\n              and coalesce(e.new_data->>''expiry_date'',e.new_data->>''best_before_date'')=\n                coalesce(p_lot.expiry_date,p_lot.best_before_date)::text\n              and (\n                e.new_data->''clearance_approved''=''true''::jsonb\n                or (e.new_data->>''clearance_approved_by''=p_lot.clearance_approved_by::text\n                  and case when pg_catalog.pg_input_is_valid(\n                    e.new_data->>''clearance_approved_at'',''timestamp with time zone'')\n                    then (e.new_data->>''clearance_approved_at'')::timestamptz end=p_lot.clearance_approved_at\n                  and e.old_data->''clearance_approved_at'' is distinct from e.new_data->''clearance_approved_at'')\n              )\n              and not exists (\n                select 1 from public.batch_change_events x\n                where x.batch_id=p_lot.id and x.sku=p_lot.sku and x.id<>e.id\n                  and x.created_at>=p_lot.clearance_approved_at\n                  and x.created_at<=pg_catalog.transaction_timestamp()\n                  and (\n                    x.new_data->''clearance_approved''=''false''::jsonb\n                    or (x.new_data ? ''inventory_status'' and (\n                      x.new_data->>''inventory_status'' is distinct from ''available''\n                      or x.old_data->''expiry_date'' is distinct from x.new_data->''expiry_date''\n                      or x.old_data->''best_before_date'' is distinct from x.new_data->''best_before_date''\n                    ))\n                  )\n              )\n          )\n        )\n      )\n  );\n",
        "to": "\n  select k2_private.lot_is_eligible_for_category_v1(p_lot,c.maximum_depth,c.evaluation_instant)\n  from k2_private.current_category_lot_context_v1() c;\n",
        "mode": "once"
      }
    ]
  },
  {
    "signature": "public.reserve_order_request_lots_v1(uuid, text)",
    "md5": "e32eb0b2dc671859256e4c21bc7886b0",
    "metadata": {
      "proacl": [
        "postgres=X/postgres"
      ],
      "proconfig": [
        "search_path=public"
      ],
      "prosecdef": true,
      "provolatile": "v",
      "proparallel": "u",
      "proisstrict": false,
      "proretset": false,
      "proleakproof": false,
      "prokind": "f",
      "pronargdefaults": 1,
      "proargnames": [
        "p_order_request_id",
        "p_reason"
      ],
      "proargmodes": null
    },
    "rules": [
      {
        "from": "declare",
        "to": "declare\n  v_k2_context k2_private.category_lot_command_context;\n  v_k2_owned boolean:=false;\n  v_k2_depth integer;\n  v_k2_instant timestamptz;\n",
        "mode": "once"
      },
      {
        "from": "begin\n",
        "to": "begin\n  v_k2_context:=k2_private.current_category_lot_context_v1();\n  v_k2_instant:=v_k2_context.evaluation_instant;\n",
        "mode": "first"
      },
      {
        "from": "        order_request_id, order_request_item_id, batch_id, sku, quantity\n",
        "to": "        order_request_id, order_request_item_id, batch_id, sku, quantity, expires_at, created_at, updated_at\n",
        "mode": "once"
      },
      {
        "from": "      ) values (v_order.id, v_line.id, v_batch.id, v_line.sku, v_take);",
        "to": "      ) values (v_order.id, v_line.id, v_batch.id, v_line.sku, v_take,\n        case when v_order.channel_source=''website'' then v_k2_instant+interval ''30 minutes'' end,v_k2_instant,v_k2_instant);",
        "mode": "once"
      },
      {
        "from": "clock_timestamp()",
        "to": "v_k2_instant",
        "mode": "all"
      },
      {
        "from": "now()",
        "to": "v_k2_instant",
        "mode": "all"
      },
      {
        "from": "insert into public.inventory_events (sku, location_code, event_type, quantity, reference_type, reference_id, reason, actor_id)\n    values (v_line.sku, ''MANILA_MAIN'', ''reserved'', v_line.quantity, ''order_request'', v_order.id, p_reason, auth.uid())",
        "to": "insert into public.inventory_events (sku, location_code, event_type, quantity, reference_type, reference_id, reason, actor_id, created_at)\n    values (v_line.sku, ''MANILA_MAIN'', ''reserved'', v_line.quantity, ''order_request'', v_order.id, p_reason, auth.uid(), v_k2_instant)",
        "mode": "once"
      }
    ]
  },
  {
    "signature": "public.commit_order_request_stock_v1(uuid, text, text)",
    "md5": "38c0c7dff91cf479dda9ac6de6f7895d",
    "metadata": {
      "proacl": [
        "postgres=X/postgres"
      ],
      "proconfig": [
        "search_path=\"\""
      ],
      "prosecdef": true,
      "provolatile": "v",
      "proparallel": "u",
      "proisstrict": false,
      "proretset": false,
      "proleakproof": false,
      "prokind": "f",
      "pronargdefaults": 1,
      "proargnames": [
        "p_order_request_id",
        "p_cause",
        "p_reason"
      ],
      "proargmodes": null
    },
    "rules": [
      {
        "from": "declare",
        "to": "declare\n  v_k2_context k2_private.category_lot_command_context;\n  v_k2_owned boolean:=false;\n  v_k2_depth integer;\n  v_k2_instant timestamptz;\n",
        "mode": "once"
      },
      {
        "from": "begin\n",
        "to": "begin\n  v_k2_context:=k2_private.current_category_lot_context_v1();\n  v_k2_instant:=v_k2_context.evaluation_instant;\n",
        "mode": "first"
      },
      {
        "from": "clock_timestamp()",
        "to": "v_k2_instant",
        "mode": "all"
      },
      {
        "from": "insert into public.inventory_events\n      (sku, location_code, event_type, quantity, reference_type, reference_id, reason, actor_id)\n    values\n      (v_res.sku, ''MANILA_MAIN'', ''stock_committed'', v_res.quantity,\n       ''order_request'', p_order_request_id,\n       ''Ownership committed at '' || p_cause || '': ''\n         || coalesce(nullif(trim(coalesce(p_reason, '''')), ''''), ''(no reason)'')\n         || ''; batch '' || v_res.batch_id::text,\n       auth.uid())",
        "to": "insert into public.inventory_events\n      (sku, location_code, event_type, quantity, reference_type, reference_id, reason, actor_id, created_at)\n    values\n      (v_res.sku, ''MANILA_MAIN'', ''stock_committed'', v_res.quantity,\n       ''order_request'', p_order_request_id,\n       ''Ownership committed at '' || p_cause || '': ''\n         || coalesce(nullif(trim(coalesce(p_reason, '''')), ''''), ''(no reason)'')\n         || ''; batch '' || v_res.batch_id::text,\n       auth.uid(), v_k2_instant)",
        "mode": "once"
      }
    ]
  },
  {
    "signature": "public.confirm_order_request(uuid, text)",
    "md5": "d09a7b2ae386b5da9c7b0c1849a3897f",
    "metadata": {
      "proacl": null,
      "proconfig": [
        "search_path=public"
      ],
      "prosecdef": true,
      "provolatile": "v",
      "proparallel": "u",
      "proisstrict": false,
      "proretset": false,
      "proleakproof": false,
      "prokind": "f",
      "pronargdefaults": 1,
      "proargnames": [
        "p_order_request_id",
        "p_reason"
      ],
      "proargmodes": null
    },
    "rules": [
      {
        "from": "declare",
        "to": "declare\n  v_k2_context k2_private.category_lot_command_context;\n  v_k2_owned boolean:=false;\n  v_k2_depth integer;\n  v_k2_instant timestamptz;\n",
        "mode": "once"
      },
      {
        "from": "begin\n",
        "to": "begin\n  perform k2_private.lock_category_policy_v1(false);\n",
        "mode": "first"
      },
      {
        "from": "  if v_order.coupon_id is not null then",
        "to": "  perform 1 from public.coupons where id=v_order.coupon_id for update;\n  perform 1 from public.products p where p.sku in(select sku from public.order_request_items where order_request_id=v_order.id) order by p.sku,p.id for update;\n  insert into public.inventory_balances(sku,location_code,on_hand)\n  select p.sku,''MANILA_MAIN'',greatest(coalesce(sum(b.quantity),0),0)::integer\n  from public.products p left join public.product_batches b on b.sku=p.sku\n  where p.sku in(select sku from public.order_request_items where order_request_id=v_order.id)\n  group by p.sku order by p.sku on conflict(sku,location_code) do nothing;\n  perform 1 from public.order_request_items where order_request_id=v_order.id order by sku,id for update;\n  perform 1 from public.products p where p.sku in(select sku from public.order_request_items where order_request_id=v_order.id) order by p.sku,p.id for update;\n  perform 1 from public.inventory_balances b where b.location_code=''MANILA_MAIN'' and b.sku in(select sku from public.order_request_items where order_request_id=v_order.id) order by b.sku for update;\n  perform 1 from public.inventory_reservations r where r.order_request_id=v_order.id order by r.sku,r.batch_id,r.id for update;\n  perform 1 from public.product_batches b where b.sku in(select sku from public.order_request_items where order_request_id=v_order.id) order by b.sku,b.id for update;\n  if exists(select 1 from k2_private.category_lot_command_context\n    where backend_pid=pg_catalog.pg_backend_pid() and transaction_id=pg_catalog.pg_current_xact_id()) then\n    v_k2_context:=k2_private.current_category_lot_context_v1();\n    v_k2_instant:=v_k2_context.evaluation_instant;\n  else\n    select maximum_depth into v_k2_depth from k2_private.category_policy_command_config where singleton;\n    if v_k2_depth is null or v_k2_depth<1 then\n      raise exception using errcode=''55000'',message=''K2_CATEGORY_POLICY_NOT_CONFIGURED'';\n    end if;\n    v_k2_instant:=k2_private.start_category_lot_context_v1(v_k2_depth);\n    v_k2_owned:=true;\n  end if;\n  if v_order.coupon_id is not null then",
        "mode": "once"
      },
      {
        "from": "  return v_order;\n",
        "to": "  if v_k2_owned then perform k2_private.clear_category_lot_context_v1();end if;\n  return v_order;\n",
        "mode": "once"
      },
      {
        "from": "now()",
        "to": "v_k2_instant",
        "mode": "all"
      },
      {
        "from": "insert into public.order_request_events (order_request_id, from_status, to_status, reason, actor_id)\n  values (v_order.id, ''submitted'', ''confirmed'', p_reason, auth.uid())",
        "to": "insert into public.order_request_events (order_request_id, from_status, to_status, reason, actor_id, created_at)\n  values (v_order.id, ''submitted'', ''confirmed'', p_reason, auth.uid(), v_k2_instant)",
        "mode": "once"
      }
    ]
  },
  {
    "signature": "public.set_order_request_payment_status(uuid, text, text, jsonb)",
    "md5": "8528429beab5aedf914ba197dfdef429",
    "metadata": {
      "proacl": [
        "postgres=X/postgres"
      ],
      "proconfig": [
        "search_path=\"\""
      ],
      "prosecdef": true,
      "provolatile": "v",
      "proparallel": "u",
      "proisstrict": false,
      "proretset": false,
      "proleakproof": false,
      "prokind": "f",
      "pronargdefaults": 0,
      "proargnames": [
        "p_order_request_id",
        "p_to_status",
        "p_evidence_note",
        "p_payment_evidence"
      ],
      "proargmodes": null
    },
    "rules": [
      {
        "from": "declare",
        "to": "declare\n  v_k2_context k2_private.category_lot_command_context;\n  v_k2_owned boolean:=false;\n  v_k2_depth integer;\n  v_k2_instant timestamptz;\n",
        "mode": "once"
      },
      {
        "from": "begin\n",
        "to": "begin\n  perform k2_private.lock_category_policy_v1(false);\n",
        "mode": "first"
      },
      {
        "from": "  if p_to_status in (''evidence_submitted'',''verified'') then",
        "to": "  perform 1 from public.order_request_items where order_request_id=v_order.id order by sku,id for update;\n  perform 1 from public.products p where p.sku in(select sku from public.order_request_items where order_request_id=v_order.id) order by p.sku,p.id for update;\n  perform 1 from public.inventory_balances b where b.location_code=''MANILA_MAIN'' and b.sku in(select sku from public.order_request_items where order_request_id=v_order.id) order by b.sku for update;\n  perform 1 from public.inventory_reservations r where r.order_request_id=v_order.id order by r.sku,r.batch_id,r.id for update;\n  perform 1 from public.product_batches b where b.sku in(select sku from public.order_request_items where order_request_id=v_order.id) order by b.sku,b.id for update;\n  if exists(select 1 from k2_private.category_lot_command_context\n    where backend_pid=pg_catalog.pg_backend_pid() and transaction_id=pg_catalog.pg_current_xact_id()) then\n    v_k2_context:=k2_private.current_category_lot_context_v1();\n    v_k2_instant:=v_k2_context.evaluation_instant;\n  else\n    select maximum_depth into v_k2_depth from k2_private.category_policy_command_config where singleton;\n    if v_k2_depth is null or v_k2_depth<1 then\n      raise exception using errcode=''55000'',message=''K2_CATEGORY_POLICY_NOT_CONFIGURED'';\n    end if;\n    v_k2_instant:=k2_private.start_category_lot_context_v1(v_k2_depth);\n    v_k2_owned:=true;\n  end if;\n  if p_to_status in (''evidence_submitted'',''verified'') then",
        "mode": "once"
      },
      {
        "from": "  return v_order;\n",
        "to": "  if v_k2_owned then perform k2_private.clear_category_lot_context_v1();end if;\n  return v_order;\n",
        "mode": "once"
      },
      {
        "from": "clock_timestamp()",
        "to": "v_k2_instant",
        "mode": "all"
      }
    ]
  },
  {
    "signature": "public.record_packing_scan_exact_v1(uuid, text, uuid, boolean)",
    "md5": "f340e8715f6f187d63f29c83c9a68b43",
    "metadata": {
      "proacl": [
        "postgres=X/postgres"
      ],
      "proconfig": [
        "search_path=\"\""
      ],
      "prosecdef": true,
      "provolatile": "v",
      "proparallel": "u",
      "proisstrict": false,
      "proretset": false,
      "proleakproof": false,
      "prokind": "f",
      "pronargdefaults": 0,
      "proargnames": [
        "p_order_request_id",
        "p_scanned_code",
        "p_reservation_id",
        "p_lot_confirmed"
      ],
      "proargmodes": null
    },
    "rules": [
      {
        "from": "declare",
        "to": "declare\n  v_k2_context k2_private.category_lot_command_context;\n  v_k2_owned boolean:=false;\n  v_k2_depth integer;\n  v_k2_instant timestamptz;\n",
        "mode": "once"
      },
      {
        "from": "begin\n",
        "to": "begin\n  perform k2_private.lock_category_policy_v1(false);\n",
        "mode": "first"
      },
      {
        "from": " select * into v_res from public.inventory_reservations where id=p_reservation_id and order_request_id=v_order.id for update;",
        "to": "  perform 1 from public.order_request_items where order_request_id=v_order.id order by sku,id for update;\n  perform 1 from public.products p where p.sku in(select sku from public.order_request_items where order_request_id=v_order.id) order by p.sku,p.id for update;\n  perform 1 from public.inventory_balances b where b.location_code=''MANILA_MAIN'' and b.sku in(select sku from public.order_request_items where order_request_id=v_order.id) order by b.sku for update;\n  perform 1 from public.inventory_reservations r where r.order_request_id=v_order.id order by r.sku,r.batch_id,r.id for update;\n  perform 1 from public.product_batches b where b.sku in(select sku from public.order_request_items where order_request_id=v_order.id) order by b.sku,b.id for update;\n  if exists(select 1 from k2_private.category_lot_command_context\n    where backend_pid=pg_catalog.pg_backend_pid() and transaction_id=pg_catalog.pg_current_xact_id()) then\n    v_k2_context:=k2_private.current_category_lot_context_v1();\n    v_k2_instant:=v_k2_context.evaluation_instant;\n  else\n    select maximum_depth into v_k2_depth from k2_private.category_policy_command_config where singleton;\n    if v_k2_depth is null or v_k2_depth<1 then\n      raise exception using errcode=''55000'',message=''K2_CATEGORY_POLICY_NOT_CONFIGURED'';\n    end if;\n    v_k2_instant:=k2_private.start_category_lot_context_v1(v_k2_depth);\n    v_k2_owned:=true;\n  end if;\n select * into v_res from public.inventory_reservations where id=p_reservation_id and order_request_id=v_order.id for update;",
        "mode": "once"
      },
      {
        "from": "or not coalesce((coalesce(v_batch.expiry_date,v_batch.best_before_date)>=current_date+90\n     or (coalesce(v_batch.expiry_date,v_batch.best_before_date) between current_date+31 and current_date+89 and v_batch.clearance_approved_at is not null)),false)",
        "to": "or not k2_private.lot_is_eligible_v1(v_batch)",
        "mode": "once"
      },
      {
        "from": " return jsonb_build_object(''order_reference''",
        "to": "  if v_k2_owned then perform k2_private.clear_category_lot_context_v1();end if;\n return jsonb_build_object(''order_reference''",
        "mode": "once"
      },
      {
        "from": "clock_timestamp()",
        "to": "v_k2_instant",
        "mode": "all"
      },
      {
        "from": "insert into public.packing_scan_events(order_request_id,order_request_item_id,reservation_id,batch_id,sku,scanned_code,scan_number,actor_id)\n  values(v_order.id,v_line.id,v_res.id,v_batch.id,v_line.sku,trim(p_scanned_code),v_scan,auth.uid())",
        "to": "insert into public.packing_scan_events(order_request_id,order_request_item_id,reservation_id,batch_id,sku,scanned_code,scan_number,actor_id, created_at)\n  values(v_order.id,v_line.id,v_res.id,v_batch.id,v_line.sku,trim(p_scanned_code),v_scan,auth.uid(), v_k2_instant)",
        "mode": "once"
      },
      {
        "from": "insert into public.order_request_events(order_request_id,from_status,to_status,actor_id,metadata)\n  values(v_order.id,''confirmed'',''confirmed'',auth.uid(),jsonb_build_object(''event'',''unit_packed'',''sku'',v_line.sku,\n   ''batch_id'',v_batch.id,''reservation_id'',v_res.id,''physical_lot_confirmed'',true,''scan_number'',v_scan))",
        "to": "insert into public.order_request_events(order_request_id,from_status,to_status,actor_id,metadata, created_at)\n  values(v_order.id,''confirmed'',''confirmed'',auth.uid(),jsonb_build_object(''event'',''unit_packed'',''sku'',v_line.sku,\n   ''batch_id'',v_batch.id,''reservation_id'',v_res.id,''physical_lot_confirmed'',true,''scan_number'',v_scan), v_k2_instant)",
        "mode": "once"
      }
    ]
  },
  {
    "signature": "public.fulfill_order_request(uuid, text)",
    "md5": "5a19b704a9ca5d95c0691c0e5d44e2ac",
    "metadata": {
      "proacl": [
        "postgres=X/postgres",
        "authenticated=X/postgres"
      ],
      "proconfig": [
        "search_path=public"
      ],
      "prosecdef": true,
      "provolatile": "v",
      "proparallel": "u",
      "proisstrict": false,
      "proretset": false,
      "proleakproof": false,
      "prokind": "f",
      "pronargdefaults": 0,
      "proargnames": [
        "p_order_request_id",
        "p_handover_note"
      ],
      "proargmodes": null
    },
    "rules": [
      {
        "from": "declare",
        "to": "declare\n  v_k2_context k2_private.category_lot_command_context;\n  v_k2_owned boolean:=false;\n  v_k2_depth integer;\n  v_k2_instant timestamptz;\n",
        "mode": "once"
      },
      {
        "from": "begin\n",
        "to": "begin\n  perform k2_private.lock_category_policy_v1(false);\n",
        "mode": "first"
      },
      {
        "from": "  -- Lock all affected rows before validating, in the prepared release order.",
        "to": "  perform 1 from public.order_request_items where order_request_id=v_order.id order by sku,id for update;\n  perform 1 from public.products p where p.sku in(select sku from public.order_request_items where order_request_id=v_order.id) order by p.sku,p.id for update;\n  perform 1 from public.inventory_balances b where b.location_code=''MANILA_MAIN'' and b.sku in(select sku from public.order_request_items where order_request_id=v_order.id) order by b.sku for update;\n  perform 1 from public.inventory_reservations r where r.order_request_id=v_order.id order by r.sku,r.batch_id,r.id for update;\n  perform 1 from public.product_batches b where b.sku in(select sku from public.order_request_items where order_request_id=v_order.id) order by b.sku,b.id for update;\n  if exists(select 1 from k2_private.category_lot_command_context\n    where backend_pid=pg_catalog.pg_backend_pid() and transaction_id=pg_catalog.pg_current_xact_id()) then\n    v_k2_context:=k2_private.current_category_lot_context_v1();\n    v_k2_instant:=v_k2_context.evaluation_instant;\n  else\n    select maximum_depth into v_k2_depth from k2_private.category_policy_command_config where singleton;\n    if v_k2_depth is null or v_k2_depth<1 then\n      raise exception using errcode=''55000'',message=''K2_CATEGORY_POLICY_NOT_CONFIGURED'';\n    end if;\n    v_k2_instant:=k2_private.start_category_lot_context_v1(v_k2_depth);\n    v_k2_owned:=true;\n  end if;\n  -- Lock all affected rows before validating, in the prepared release order.",
        "mode": "once"
      },
      {
        "from": "  return v_order;\n",
        "to": "  if v_k2_owned then perform k2_private.clear_category_lot_context_v1();end if;\n  return v_order;\n",
        "mode": "once"
      },
      {
        "from": "now()",
        "to": "v_k2_instant",
        "mode": "all"
      },
      {
        "from": "insert into public.inventory_events (sku, location_code, event_type, quantity, reference_type, reference_id, reason, actor_id)\n    values (v_summary.sku, ''MANILA_MAIN'', ''fulfilled'', v_summary.quantity, ''order_request'', v_order.id, p_handover_note, auth.uid())",
        "to": "insert into public.inventory_events (sku, location_code, event_type, quantity, reference_type, reference_id, reason, actor_id, created_at)\n    values (v_summary.sku, ''MANILA_MAIN'', ''fulfilled'', v_summary.quantity, ''order_request'', v_order.id, p_handover_note, auth.uid(), v_k2_instant)",
        "mode": "once"
      },
      {
        "from": "insert into public.order_request_events (order_request_id, from_status, to_status, reason, actor_id)\n  values (v_order.id, ''confirmed'', ''fulfilled'', p_handover_note, auth.uid())",
        "to": "insert into public.order_request_events (order_request_id, from_status, to_status, reason, actor_id, created_at)\n  values (v_order.id, ''confirmed'', ''fulfilled'', p_handover_note, auth.uid(), v_k2_instant)",
        "mode": "once"
      }
    ]
  },
  {
    "signature": "public.transfer_inventory_custody_exact(uuid, integer, text, text, text)",
    "md5": "dbe5f3b9dc9565f1b5e327cab7b74ac5",
    "metadata": {
      "proacl": null,
      "proconfig": [
        "search_path=public"
      ],
      "prosecdef": true,
      "provolatile": "v",
      "proparallel": "u",
      "proisstrict": false,
      "proretset": false,
      "proleakproof": false,
      "prokind": "f",
      "pronargdefaults": 0,
      "proargnames": [
        "p_batch_id",
        "p_quantity",
        "p_to_custodian",
        "p_to_location",
        "p_reason"
      ],
      "proargmodes": null
    },
    "rules": [
      {
        "from": "declare",
        "to": "declare\n  v_k2_context k2_private.category_lot_command_context;\n  v_k2_owned boolean:=false;\n  v_k2_depth integer;\n  v_k2_instant timestamptz;\n",
        "mode": "once"
      },
      {
        "from": "begin\n",
        "to": "begin\n  perform k2_private.lock_category_policy_v1(false);\n",
        "mode": "first"
      },
      {
        "from": "  select * into v_batch from public.product_batches where id = p_batch_id for update;",
        "to": "  perform 1 from public.products p where p.sku=(select sku from public.product_batches where id=p_batch_id) order by p.sku,p.id for update;\n  perform 1 from public.product_batches b where b.sku=(select sku from public.product_batches where id=p_batch_id) order by b.sku,b.id for update;\n  if exists(select 1 from k2_private.category_lot_command_context\n    where backend_pid=pg_catalog.pg_backend_pid() and transaction_id=pg_catalog.pg_current_xact_id()) then\n    v_k2_context:=k2_private.current_category_lot_context_v1();\n    v_k2_instant:=v_k2_context.evaluation_instant;\n  else\n    select maximum_depth into v_k2_depth from k2_private.category_policy_command_config where singleton;\n    if v_k2_depth is null or v_k2_depth<1 then\n      raise exception using errcode=''55000'',message=''K2_CATEGORY_POLICY_NOT_CONFIGURED'';\n    end if;\n    v_k2_instant:=k2_private.start_category_lot_context_v1(v_k2_depth);\n    v_k2_owned:=true;\n  end if;\n  select * into v_batch from public.product_batches where id = p_batch_id for update;",
        "mode": "once"
      },
      {
        "from": "  return v_new.id;",
        "to": "  if v_k2_owned then perform k2_private.clear_category_lot_context_v1();end if;\n  return v_new.id;",
        "mode": "once"
      },
      {
        "from": "now()",
        "to": "v_k2_instant",
        "mode": "all"
      },
      {
        "from": "insert into public.inventory_events (sku, location_code, event_type, quantity, reference_type, reference_id, reason, actor_id, metadata)\n  values (v_batch.sku, coalesce(nullif(trim(p_to_location), ''''), ''MANILA_MAIN''), ''transferred'', p_quantity,\n    ''product_batch'', v_new.id, trim(p_reason), auth.uid(), jsonb_build_object(\n      ''source_batch_id'', v_batch.id, ''destination_batch_id'', v_new.id,\n      ''from_custodian'', v_batch.custodian, ''to_custodian'', trim(p_to_custodian)\n    ))",
        "to": "insert into public.inventory_events (sku, location_code, event_type, quantity, reference_type, reference_id, reason, actor_id, metadata, created_at)\n  values (v_batch.sku, coalesce(nullif(trim(p_to_location), ''''), ''MANILA_MAIN''), ''transferred'', p_quantity,\n    ''product_batch'', v_new.id, trim(p_reason), auth.uid(), jsonb_build_object(\n      ''source_batch_id'', v_batch.id, ''destination_batch_id'', v_new.id,\n      ''from_custodian'', v_batch.custodian, ''to_custodian'', trim(p_to_custodian)\n    ), v_k2_instant)",
        "mode": "once"
      }
    ]
  },
  {
    "signature": "public.transfer_inventory_custody(text, text, text, text)",
    "md5": "a818cfc236c5fcde588b6347b929588a",
    "metadata": {
      "proacl": null,
      "proconfig": [
        "search_path=public"
      ],
      "prosecdef": true,
      "provolatile": "v",
      "proparallel": "u",
      "proisstrict": false,
      "proretset": false,
      "proleakproof": false,
      "prokind": "f",
      "pronargdefaults": 3,
      "proargnames": [
        "p_to_custodian",
        "p_box_code",
        "p_sku",
        "p_reason"
      ],
      "proargmodes": null
    },
    "rules": [
      {
        "from": "declare",
        "to": "declare\n  v_k2_context k2_private.category_lot_command_context;\n  v_k2_owned boolean:=false;\n  v_k2_depth integer;\n  v_k2_instant timestamptz;\n",
        "mode": "once"
      },
      {
        "from": "begin\n",
        "to": "begin\n  perform k2_private.lock_category_policy_v1(false);\n",
        "mode": "first"
      },
      {
        "from": "declare\n  v_k2_context k2_private.category_lot_command_context;\n  v_k2_owned boolean:=false;\n  v_k2_depth integer;\n  v_k2_instant timestamptz;\n",
        "to": "declare\n  v_k2_context k2_private.category_lot_command_context;\n  v_k2_owned boolean:=false;\n  v_k2_depth integer;\n  v_k2_instant timestamptz;\n  v_k2_batch_ids uuid[];\n",
        "mode": "once"
      },
      {
        "from": "  update public.product_batches set custodian",
        "to": "  select coalesce(array_agg(id),''{}''::uuid[]) into v_k2_batch_ids from public.product_batches where box_code=trim(p_box_code) and quantity>0;\n  perform 1 from public.products p where p.sku in(select sku from public.product_batches where id=any(v_k2_batch_ids)) order by p.sku,p.id for update;\n  perform 1 from public.product_batches b where b.sku in(select sku from public.product_batches where id=any(v_k2_batch_ids)) order by b.sku,b.id for update;\n  if exists(select 1 from k2_private.category_lot_command_context\n    where backend_pid=pg_catalog.pg_backend_pid() and transaction_id=pg_catalog.pg_current_xact_id()) then\n    v_k2_context:=k2_private.current_category_lot_context_v1();\n    v_k2_instant:=v_k2_context.evaluation_instant;\n  else\n    select maximum_depth into v_k2_depth from k2_private.category_policy_command_config where singleton;\n    if v_k2_depth is null or v_k2_depth<1 then\n      raise exception using errcode=''55000'',message=''K2_CATEGORY_POLICY_NOT_CONFIGURED'';\n    end if;\n    v_k2_instant:=k2_private.start_category_lot_context_v1(v_k2_depth);\n    v_k2_owned:=true;\n  end if;\n  update public.product_batches set custodian",
        "mode": "once"
      },
      {
        "from": "  where box_code = trim(p_box_code) and quantity > 0;",
        "to": "  where id=any(v_k2_batch_ids) and box_code = trim(p_box_code) and quantity > 0;",
        "mode": "once"
      },
      {
        "from": "  return v_updated;",
        "to": "  if v_k2_owned then perform k2_private.clear_category_lot_context_v1();end if;\n  return v_updated;",
        "mode": "once"
      },
      {
        "from": "now()",
        "to": "v_k2_instant",
        "mode": "all"
      }
    ]
  },
  {
    "signature": "public.extend_reservation_v1(uuid, integer, text)",
    "md5": "3f4a7212f26d1b2e69f6bca909140833",
    "metadata": {
      "proacl": [
        "postgres=X/postgres",
        "authenticated=X/postgres"
      ],
      "proconfig": [
        "search_path=\"\""
      ],
      "prosecdef": true,
      "provolatile": "v",
      "proparallel": "u",
      "proisstrict": false,
      "proretset": true,
      "proleakproof": false,
      "prokind": "f",
      "pronargdefaults": 0,
      "proargnames": [
        "p_reservation_id",
        "p_minutes",
        "p_reason",
        "reservation_id",
        "expires_at",
        "extension_count"
      ],
      "proargmodes": [
        "i",
        "i",
        "i",
        "t",
        "t",
        "t"
      ]
    },
    "rules": [
      {
        "from": "declare",
        "to": "declare\n  v_k2_context k2_private.category_lot_command_context;\n  v_k2_owned boolean:=false;\n  v_k2_depth integer;\n  v_k2_instant timestamptz;\n",
        "mode": "once"
      },
      {
        "from": "begin\n",
        "to": "begin\n  perform k2_private.lock_category_policy_v1(false);\n",
        "mode": "first"
      },
      {
        "from": "  select * into v_row from public.inventory_reservations\n  where id = p_reservation_id for update;",
        "to": "  perform 1 from public.order_requests where id=(select order_request_id from public.inventory_reservations where id=p_reservation_id) for update;\n  perform 1 from public.products p where p.sku=(select sku from public.inventory_reservations where id=p_reservation_id) order by p.sku,p.id for update;\n  perform 1 from public.inventory_balances b where b.location_code=''MANILA_MAIN'' and b.sku=(select sku from public.inventory_reservations where id=p_reservation_id) order by b.sku for update;\n  perform 1 from public.inventory_reservations where id=p_reservation_id for update;\n  perform 1 from public.product_batches b where b.sku=(select sku from public.inventory_reservations where id=p_reservation_id) order by b.sku,b.id for update;\n  if exists(select 1 from k2_private.category_lot_command_context\n    where backend_pid=pg_catalog.pg_backend_pid() and transaction_id=pg_catalog.pg_current_xact_id()) then\n    v_k2_context:=k2_private.current_category_lot_context_v1();\n    v_k2_instant:=v_k2_context.evaluation_instant;\n  else\n    select maximum_depth into v_k2_depth from k2_private.category_policy_command_config where singleton;\n    if v_k2_depth is null or v_k2_depth<1 then\n      raise exception using errcode=''55000'',message=''K2_CATEGORY_POLICY_NOT_CONFIGURED'';\n    end if;\n    v_k2_instant:=k2_private.start_category_lot_context_v1(v_k2_depth);\n    v_k2_owned:=true;\n  end if;\n  select * into v_row from public.inventory_reservations\n  where id = p_reservation_id for update;",
        "mode": "once"
      },
      {
        "from": "  update public.inventory_reservations\n  set expires_at",
        "to": "  if not exists(select 1 from public.product_batches b where b.id=v_row.batch_id and b.sku=v_row.sku and k2_private.lot_is_eligible_v1(b)) then\n    raise exception using errcode=''23514'',message=''K2_RESERVATION_RECONCILIATION_REQUIRED'';\n  end if;\n  update public.inventory_reservations\n  set expires_at",
        "mode": "once"
      },
      {
        "from": "  return next;",
        "to": "  if v_k2_owned then perform k2_private.clear_category_lot_context_v1();end if;\n  return next;",
        "mode": "once"
      },
      {
        "from": "now()",
        "to": "v_k2_instant",
        "mode": "all"
      }
    ]
  },
  {
    "signature": "public.release_expired_reservations_v1(integer)",
    "md5": "b246092612ab4c2aa17f802613c2541e",
    "metadata": {
      "proacl": [
        "postgres=X/postgres",
        "authenticated=X/postgres"
      ],
      "proconfig": [
        "search_path=\"\""
      ],
      "prosecdef": true,
      "provolatile": "v",
      "proparallel": "u",
      "proisstrict": false,
      "proretset": true,
      "proleakproof": false,
      "prokind": "f",
      "pronargdefaults": 1,
      "proargnames": [
        "p_limit",
        "released_count",
        "released_ids"
      ],
      "proargmodes": [
        "i",
        "t",
        "t"
      ]
    },
    "rules": [
      {
        "from": "declare",
        "to": "declare\n  v_k2_context k2_private.category_lot_command_context;\n  v_k2_owned boolean:=false;\n  v_k2_depth integer;\n  v_k2_instant timestamptz;\n",
        "mode": "once"
      },
      {
        "from": "begin\n",
        "to": "begin\n  perform k2_private.lock_category_policy_v1(false);\n",
        "mode": "first"
      },
      {
        "from": "  perform 1 from public.inventory_balances b",
        "to": "  perform 1 from public.products p where p.sku in(select r.sku from public.inventory_reservations r where r.order_request_id=any(v_orders) and r.status=''active'') order by p.sku,p.id for update;\n  perform 1 from public.inventory_balances b",
        "mode": "once"
      },
      {
        "from": "  -- An extension may have committed while the sweep waited for these rows.",
        "to": "  perform 1 from public.product_batches b where b.sku in(select r.sku from public.inventory_reservations r where r.order_request_id=any(v_orders) and r.status=''active'') order by b.sku,b.id for update;\n  if exists(select 1 from k2_private.category_lot_command_context\n    where backend_pid=pg_catalog.pg_backend_pid() and transaction_id=pg_catalog.pg_current_xact_id()) then\n    v_k2_context:=k2_private.current_category_lot_context_v1();\n    v_k2_instant:=v_k2_context.evaluation_instant;\n  else\n    select maximum_depth into v_k2_depth from k2_private.category_policy_command_config where singleton;\n    if v_k2_depth is null or v_k2_depth<1 then\n      raise exception using errcode=''55000'',message=''K2_CATEGORY_POLICY_NOT_CONFIGURED'';\n    end if;\n    v_k2_instant:=k2_private.start_category_lot_context_v1(v_k2_depth);\n    v_k2_owned:=true;\n  end if;\n  -- An extension may have committed while the sweep waited for these rows.",
        "mode": "once"
      },
      {
        "from": "  return query select v_count,v_ids;",
        "to": "  if v_k2_owned then perform k2_private.clear_category_lot_context_v1();end if;\n  return query select v_count,v_ids;",
        "mode": "once"
      },
      {
        "from": "  -- An extension may have committed while the sweep waited for these rows.\n  -- Decide again from the now-locked facts; the earlier selection is not proof.\n  select coalesce(array_agg(o.id),''{}''::uuid[]) into v_orders from public.order_requests o\n    where o.id=any(v_orders) and o.status=''submitted''\n      and o.payment_status in (''unpaid'',''not_requested'',''awaiting_instructions'',''failed'')\n      and exists(select 1 from public.inventory_reservations r where r.order_request_id=o.id\n        and r.status=''active'' and r.expires_at<=clock_timestamp())\n      and not exists(select 1 from public.inventory_reservations r where r.order_request_id=o.id\n        and r.status=''active'' and (r.packed_quantity>0 or r.expires_at is null or r.committed_at is not null));\n  perform 1 from public.product_batches b where b.id in (\n    select batch_id from public.inventory_reservations where order_request_id=any(v_orders) and status=''active''\n  ) order by b.sku,b.id for update;\n\n  for v_summary in select r.order_request_id,r.sku,sum(r.quantity)::integer quantity\n    from public.inventory_reservations r where r.order_request_id=any(v_orders) and r.status=''active''\n    group by r.order_request_id,r.sku order by r.sku,r.order_request_id\n  loop\n    update public.inventory_balances set reserved=reserved-v_summary.quantity,updated_at=clock_timestamp()\n      where sku=v_summary.sku and location_code=''MANILA_MAIN'' and reserved>=v_summary.quantity;\n    if not found then raise exception ''K2_RESERVATION_BALANCE_MISMATCH'' using errcode=''23514''; end if;\n    for v_res in select * from public.inventory_reservations\n      where order_request_id=v_summary.order_request_id and sku=v_summary.sku and status=''active''\n      order by batch_id,id\n    loop\n      update public.product_batches set reserved_quantity=reserved_quantity-v_res.quantity,updated_at=clock_timestamp()\n        where id=v_res.batch_id and sku=v_res.sku and reserved_quantity>=v_res.quantity;\n      if not found then raise exception ''K2_RESERVATION_LOT_MISMATCH'' using errcode=''23514''; end if;\n      update public.inventory_reservations set status=''released'',released_at=clock_timestamp(),\n        release_cause=''expired'',updated_at=clock_timestamp() where id=v_res.id;\n      v_ids:=array_append(v_ids,v_res.id); v_count:=v_count+1;\n    end loop;\n    perform set_config(''k2.allow_stock_write'',''on'',true);\n    update public.products set stock_available=(\n      select coalesce(sum(b.quantity-b.reserved_quantity),0)::integer from public.product_batches b\n      where b.sku=v_summary.sku and b.inventory_status=''available''\n        and k2_private.lot_is_eligible_v1(b)\n    ) where sku=v_summary.sku;\n    insert into public.inventory_events(sku,location_code,event_type,quantity,reference_type,reference_id,reason,actor_id)\n      values(v_summary.sku,''MANILA_MAIN'',''reservation_released'',v_summary.quantity,''order_request'',\n        v_summary.order_request_id,''Expired unpaid purchase hold; released the complete order allocation.'',auth.uid());\n  end loop;\n  if v_k2_owned then perform k2_private.clear_category_lot_context_v1();end if;\n  return query select v_count,v_ids;\nend;\n",
        "to": "  -- An extension may have committed while the sweep waited for these rows.\n  -- Decide again from the now-locked facts; the earlier selection is not proof.\n  select coalesce(array_agg(o.id),''{}''::uuid[]) into v_orders from public.order_requests o\n    where o.id=any(v_orders) and o.status=''submitted''\n      and o.payment_status in (''unpaid'',''not_requested'',''awaiting_instructions'',''failed'')\n      and exists(select 1 from public.inventory_reservations r where r.order_request_id=o.id\n        and r.status=''active'' and r.expires_at<=v_k2_instant)\n      and not exists(select 1 from public.inventory_reservations r where r.order_request_id=o.id\n        and r.status=''active'' and (r.packed_quantity>0 or r.expires_at is null or r.committed_at is not null));\n  perform 1 from public.product_batches b where b.id in (\n    select batch_id from public.inventory_reservations where order_request_id=any(v_orders) and status=''active''\n  ) order by b.sku,b.id for update;\n\n  for v_summary in select r.order_request_id,r.sku,sum(r.quantity)::integer quantity\n    from public.inventory_reservations r where r.order_request_id=any(v_orders) and r.status=''active''\n    group by r.order_request_id,r.sku order by r.sku,r.order_request_id\n  loop\n    update public.inventory_balances set reserved=reserved-v_summary.quantity,updated_at=v_k2_instant\n      where sku=v_summary.sku and location_code=''MANILA_MAIN'' and reserved>=v_summary.quantity;\n    if not found then raise exception ''K2_RESERVATION_BALANCE_MISMATCH'' using errcode=''23514''; end if;\n    for v_res in select * from public.inventory_reservations\n      where order_request_id=v_summary.order_request_id and sku=v_summary.sku and status=''active''\n      order by batch_id,id\n    loop\n      update public.product_batches set reserved_quantity=reserved_quantity-v_res.quantity,updated_at=v_k2_instant\n        where id=v_res.batch_id and sku=v_res.sku and reserved_quantity>=v_res.quantity;\n      if not found then raise exception ''K2_RESERVATION_LOT_MISMATCH'' using errcode=''23514''; end if;\n      update public.inventory_reservations set status=''released'',released_at=v_k2_instant,\n        release_cause=''expired'',updated_at=v_k2_instant where id=v_res.id;\n      v_ids:=array_append(v_ids,v_res.id); v_count:=v_count+1;\n    end loop;\n    perform set_config(''k2.allow_stock_write'',''on'',true);\n    update public.products set stock_available=(\n      select coalesce(sum(b.quantity-b.reserved_quantity),0)::integer from public.product_batches b\n      where b.sku=v_summary.sku and b.inventory_status=''available''\n        and k2_private.lot_is_eligible_v1(b)\n    ) where sku=v_summary.sku;\n    insert into public.inventory_events(sku,location_code,event_type,quantity,reference_type,reference_id,reason,actor_id)\n      values(v_summary.sku,''MANILA_MAIN'',''reservation_released'',v_summary.quantity,''order_request'',\n        v_summary.order_request_id,''Expired unpaid purchase hold; released the complete order allocation.'',auth.uid());\n  end loop;\n  if v_k2_owned then perform k2_private.clear_category_lot_context_v1();end if;\n  return query select v_count,v_ids;\nend;\n",
        "mode": "once"
      },
      {
        "from": "insert into public.inventory_events(sku,location_code,event_type,quantity,reference_type,reference_id,reason,actor_id)\n      values(v_summary.sku,''MANILA_MAIN'',''reservation_released'',v_summary.quantity,''order_request'',\n        v_summary.order_request_id,''Expired unpaid purchase hold; released the complete order allocation.'',auth.uid())",
        "to": "insert into public.inventory_events(sku,location_code,event_type,quantity,reference_type,reference_id,reason,actor_id, created_at)\n      values(v_summary.sku,''MANILA_MAIN'',''reservation_released'',v_summary.quantity,''order_request'',\n        v_summary.order_request_id,''Expired unpaid purchase hold; released the complete order allocation.'',auth.uid(), v_k2_instant)",
        "mode": "once"
      }
    ]
  },
  {
    "signature": "public.cancel_order_request(uuid, text)",
    "md5": "ebbae217f6d339957729295f46f5c51f",
    "metadata": {
      "proacl": null,
      "proconfig": [
        "search_path=public"
      ],
      "prosecdef": true,
      "provolatile": "v",
      "proparallel": "u",
      "proisstrict": false,
      "proretset": false,
      "proleakproof": false,
      "prokind": "f",
      "pronargdefaults": 0,
      "proargnames": [
        "p_order_request_id",
        "p_reason"
      ],
      "proargmodes": null
    },
    "rules": [
      {
        "from": "declare",
        "to": "declare\n  v_k2_context k2_private.category_lot_command_context;\n  v_k2_owned boolean:=false;\n  v_k2_depth integer;\n  v_k2_instant timestamptz;\n",
        "mode": "once"
      },
      {
        "from": "begin\n",
        "to": "begin\n  perform k2_private.lock_category_policy_v1(false);\n",
        "mode": "first"
      },
      {
        "from": "  -- Submitted purchases hold stock too.",
        "to": "  perform 1 from public.coupons where id=v_order.coupon_id for update;\n  perform 1 from public.order_request_items where order_request_id=v_order.id order by sku,id for update;\n  perform 1 from public.products p where p.sku in(select sku from public.order_request_items where order_request_id=v_order.id) order by p.sku,p.id for update;\n  perform 1 from public.inventory_balances b where b.location_code=''MANILA_MAIN'' and b.sku in(select sku from public.order_request_items where order_request_id=v_order.id) order by b.sku for update;\n  perform 1 from public.inventory_reservations r where r.order_request_id=v_order.id order by r.sku,r.batch_id,r.id for update;\n  perform 1 from public.product_batches b where b.sku in(select sku from public.order_request_items where order_request_id=v_order.id) order by b.sku,b.id for update;\n  if exists(select 1 from k2_private.category_lot_command_context\n    where backend_pid=pg_catalog.pg_backend_pid() and transaction_id=pg_catalog.pg_current_xact_id()) then\n    v_k2_context:=k2_private.current_category_lot_context_v1();\n    v_k2_instant:=v_k2_context.evaluation_instant;\n  else\n    select maximum_depth into v_k2_depth from k2_private.category_policy_command_config where singleton;\n    if v_k2_depth is null or v_k2_depth<1 then\n      raise exception using errcode=''55000'',message=''K2_CATEGORY_POLICY_NOT_CONFIGURED'';\n    end if;\n    v_k2_instant:=k2_private.start_category_lot_context_v1(v_k2_depth);\n    v_k2_owned:=true;\n  end if;\n  -- Submitted purchases hold stock too.",
        "mode": "once"
      },
      {
        "from": "  return v_order;\n",
        "to": "  if v_k2_owned then perform k2_private.clear_category_lot_context_v1();end if;\n  return v_order;\n",
        "mode": "once"
      },
      {
        "from": "now()",
        "to": "v_k2_instant",
        "mode": "all"
      },
      {
        "from": "insert into public.inventory_events (sku, location_code, event_type, quantity, reference_type, reference_id, reason, actor_id)\n    values (v_summary.sku, ''MANILA_MAIN'', ''reservation_released'', v_summary.quantity, ''order_request'', v_order.id, p_reason, auth.uid())",
        "to": "insert into public.inventory_events (sku, location_code, event_type, quantity, reference_type, reference_id, reason, actor_id, created_at)\n    values (v_summary.sku, ''MANILA_MAIN'', ''reservation_released'', v_summary.quantity, ''order_request'', v_order.id, p_reason, auth.uid(), v_k2_instant)",
        "mode": "once"
      },
      {
        "from": "insert into public.order_request_events (order_request_id, from_status, to_status, reason, actor_id)\n  values (v_order.id, case when v_order.confirmed_at is null then ''submitted'' else ''confirmed'' end, ''cancelled'', p_reason, auth.uid())",
        "to": "insert into public.order_request_events (order_request_id, from_status, to_status, reason, actor_id, created_at)\n  values (v_order.id, case when v_order.confirmed_at is null then ''submitted'' else ''confirmed'' end, ''cancelled'', p_reason, auth.uid(), v_k2_instant)",
        "mode": "once"
      }
    ]
  }
]'::jsonb)
  as x(signature text,md5 text,metadata jsonb,rules jsonb)
 loop
  select * into b from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure(t.signature);
  if not found or pg_catalog.pg_get_userbyid(b.proowner)<>'postgres'
   or md5(replace(b.prosrc,chr(13),''))<>t.md5 then
   raise exception 'K2_CATEGORY_STAFF_FUNCTION_DRIFT:%',t.signature;
  end if;
  select jsonb_object_agg(key,value) into metadata from jsonb_each(to_jsonb(b)) where t.metadata ? key;
  if metadata is distinct from t.metadata then raise exception 'K2_CATEGORY_STAFF_SECURITY_DRIFT:%',t.signature;end if;
  body:=replace(b.prosrc,chr(13),'');
  for r in select value from jsonb_array_elements(t.rules) loop
   old_text:=r->>'from';new_text:=r->>'to';
   if strpos(body,old_text)=0 or (r->>'mode'='once' and length(body)-length(replace(body,old_text,''))<>length(old_text)) then
    raise exception 'K2_CATEGORY_STAFF_ANCHOR_INVALID:%',t.signature;
   end if;
   if r->>'mode'='first' then body:=overlay(body placing new_text from strpos(body,old_text) for length(old_text));
   else body:=replace(body,old_text,new_text);end if;
  end loop;
  definition:=pg_catalog.pg_get_functiondef(b.oid);
  if strpos(definition,b.prosrc)=0 then raise exception 'K2_CATEGORY_STAFF_DEFINITION_INVALID';end if;
  execute replace(definition,b.prosrc,body);
  select * into a from pg_catalog.pg_proc where oid=b.oid;
  if (to_jsonb(a)-'prosrc') is distinct from (to_jsonb(b)-'prosrc') then
   raise exception 'K2_CATEGORY_STAFF_METADATA_CHANGED:%',t.signature;
  end if;
 end loop;
end $staff_policy$;
