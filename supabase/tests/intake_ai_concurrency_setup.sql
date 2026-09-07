update k2_private.ai_spend_control_config set per_product_usd_micros=1200000,per_session_usd_micros=1200000,monthly_usd_micros=1200000;
insert into public.product_intake_sessions(id,created_by,scanned_identity,packaging_images)
select id,'6a88b5f9-8be6-4f4d-a504-173c96f40df1',id::text,jsonb_build_array(jsonb_build_object('slot','PRIMARY','path','6a88b5f9-8be6-4f4d-a504-173c96f40df1/'||id::text||'/front.png','sha256',repeat('a',64)))
from unnest(array['a74a4161-72ca-4d72-8f59-37aa690e1869'::uuid,'b74a4161-72ca-4d72-8f59-37aa690e1869'::uuid]) id;
