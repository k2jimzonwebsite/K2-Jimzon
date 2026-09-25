-- Assertions for the 20260925 stock PUBLIC-grant revocation rehearsal.
do $$
begin
  if has_function_privilege('public', 'public.get_public_product_stock()', 'execute') then
    raise exception 'REHEARSAL_FAILED: PUBLIC execute grant remains after revocation';
  end if;
  if not has_function_privilege('anon', 'public.get_public_product_stock()', 'execute') then
    raise exception 'REHEARSAL_FAILED: anon execute grant lost by revocation';
  end if;
  if not has_function_privilege('authenticated', 'public.get_public_product_stock()', 'execute') then
    raise exception 'REHEARSAL_FAILED: authenticated execute grant lost by revocation';
  end if;
end $$;

-- The function itself still runs; only the grant envelope changed.
select * from public.get_public_product_stock();
