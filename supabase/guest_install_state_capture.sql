-- Metadata only; save exact-target before/after captures privately.
select jsonb_build_object(
 'database',current_database(),
 'systemIdentifier',(select system_identifier::text from pg_control_system()),
 'functions',coalesce((select jsonb_agg(jsonb_build_object(
   'name',n.nspname||'.'||p.proname,
   'signature',format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)),
   'definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text
 ) order by n.nspname,p.proname,p.oid)
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname||'.'||p.proname=any(array['k2_private.consume_guest_rate','k2_private.contact_hash','k2_private.enqueue_customer_account_notification','k2_private.notify_customer_order_change','k2_private.notify_customer_pasabuy_change','k2_private.notify_customer_staff_reply','k2_private.resolve_guest_identity','k2_private.verify_guest_bff_request','public.append_customer_account_message_v1','public.append_guest_message_v1','public.claim_guest_customer_account_v1','public.consume_storefront_customer_auth_rate_v1','public.customer_record_owned_by_current_user','public.execute_admin_wholesale_inquiry_command_v1','public.list_admin_wholesale_inquiries_v1','public.list_customer_account_history_v1','public.list_guest_conversations_v1','public.preview_guest_coupon_v1','public.quote_guest_delivery_v1','public.read_customer_account_notification_v1','public.read_customer_account_settings_v1','public.read_delivery_control_v1','public.read_delivery_pilot_localities_v1','public.read_guest_order_status_v1','public.save_customer_account_settings_v1','public.start_guest_conversation_v1','public.submit_guest_order_v1','public.submit_guest_pasabuy_v1','public.submit_wholesale_inquiry_v1','public.validate_customer_account_link','public.validate_customer_claim_request','public.validate_guest_access_grant','public.validate_guest_access_scope'])),'[]'::jsonb),
 'tables',coalesce((select jsonb_agg(jsonb_build_object(
   'name',n.nspname||'.'||c.relname,'owner',pg_get_userbyid(c.relowner),
   'acl',c.relacl::text,'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,
   'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
     'notNull',a.attnotnull,'acl',a.attacl::text,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum)
     from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
     where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
   'constraints',(select coalesce(jsonb_agg(jsonb_build_object('name',k.conname,'definition',pg_get_constraintdef(k.oid)) order by k.conname),'[]'::jsonb) from pg_constraint k where k.conrelid=c.oid),
   'policies',(select coalesce(jsonb_agg(jsonb_build_object('name',pol.polname,'command',pol.polcmd,'roles',pol.polroles,'using',pg_get_expr(pol.polqual,pol.polrelid),'check',pg_get_expr(pol.polwithcheck,pol.polrelid)) order by pol.polname),'[]'::jsonb) from pg_policy pol where pol.polrelid=c.oid)
 ) order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname||'.'||c.relname=any(array['k2_private.customer_account_notifications','k2_private.customer_account_settings','k2_private.guest_account_claim_events','k2_private.guest_bff_secrets','k2_private.guest_conversation_receipts','k2_private.guest_rate_buckets','k2_private.guest_request_nonces','k2_private.storefront_auth_rate_buckets','k2_private.storefront_auth_rate_nonces','k2_private.wholesale_inquiry_events','k2_private.wholesale_inquiry_receipts','public.channel_identities','public.customer_accounts','public.customer_claim_requests','public.customer_contact_points','public.customers','public.delivery_cost_rows','public.delivery_courier_options','public.delivery_locality_rules','public.delivery_quote_snapshots','public.delivery_rate_sources','public.guest_access_grant_scopes','public.guest_access_grants','public.wholesale_inquiries']) and c.relkind='r'),'[]'::jsonb),
 'triggers',coalesce((select jsonb_agg(jsonb_build_object('table',n.nspname||'.'||c.relname,'name',t.tgname,
   'definition',pg_get_triggerdef(t.oid),'enabled',t.tgenabled) order by n.nspname,c.relname,t.tgname)
   from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
   join (values ('public.order_requests','trg_customer_order_notification'),('public.pasabuy_requests','trg_customer_pasabuy_notification'),('public.messages','trg_customer_staff_reply_notification')) targets(relation_name,trigger_name) on targets.relation_name=n.nspname||'.'||c.relname and targets.trigger_name=t.tgname
   where not t.tgisinternal),'[]'::jsonb)
) as guest_install_capture;
