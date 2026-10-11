-- MAP-018 / IDEA-20261010-06. Owned local PostgreSQL probe, never provider SQL.
set search_path='';
set statement_timeout='10s';
set lock_timeout='2s';
do $owned$
begin
 if current_database()<>'postgres' or current_user<>'postgres'
   or current_setting('data_directory')<>'/tmp/k2-managed-data'
   or inet_server_addr() is not null or current_setting('server_version_num')<>'170006' then
  raise exception 'OWNED_REFERENCE_PROBE_REQUIRED';
 end if;
end $owned$;

do $checks$
declare c integer;v text;
begin
 if to_regprocedure('k2_private.clean_reference_name_v1(text)') is null
    or to_regprocedure('k2_private.reference_name_key_v1(text)') is null then
  raise exception 'K2_REFERENCE_NORMALIZATION_MISSING';
 end if;
 if k2_private.clean_reference_name_v1(U&' \00A0Caff\00E8\2002\2003Italia\3000')<>'Caffè Italia' then
  raise exception 'PRINTABLE_WHITESPACE_CLEANUP_FAILED';
 end if;
 if k2_private.reference_name_key_v1(U&'CAFF\00C8\00A0ITALIA')<>'caffè italia' then
  raise exception 'ITALIAN_CASE_IDENTITY_FAILED';
 end if;
 if k2_private.reference_name_key_v1(U&'caf\00E9') collate "C"
    =k2_private.reference_name_key_v1(U&'cafe\0301') collate "C" then
  raise exception 'UNREQUESTED_UNICODE_COMPOSITION';
 end if;
 if k2_private.clean_reference_name_v1(U&'\FEFF')<>U&'\FEFF' then
  raise exception 'UNLISTED_WHITESPACE_REMOVED';
 end if;
 if length(k2_private.clean_reference_name_v1(repeat(U&'\+01FABA',120)))<>120 then
  raise exception 'SUPPLEMENTARY_CHARACTER_BOUND_FAILED';
 end if;
 begin
  perform k2_private.clean_reference_name_v1(repeat(U&'\+01FABA',121));
  raise exception 'OVERLONG_REFERENCE_ACCEPTED';
 exception when invalid_parameter_value then
  if sqlerrm<>'K2_REFERENCE_INPUT_INVALID' then raise;end if;
 end;
 foreach c in array array[32,160,5760,8192,8193,8194,8195,8196,8197,8198,8199,8200,8201,8202,8232,8233,8239,8287,12288] loop
  if k2_private.clean_reference_name_v1(chr(c)||'A'||chr(c)||chr(c)||'B'||chr(c))<>'A B' then
   raise exception 'PRINTABLE_WHITESPACE_MEMBER_FAILED %',c;
  end if;
 end loop;
 for c in 1..159 loop
  if c<32 or c>=127 then
   begin
    perform k2_private.clean_reference_name_v1('A'||chr(c)||'B');
    raise exception 'CONTROL_ACCEPTED %',c;
   exception when invalid_parameter_value then
    if sqlerrm<>'K2_REFERENCE_INPUT_INVALID' then raise;end if;
   end;
  end if;
 end loop;
 foreach v in array array[null::text,'',U&'\00A0\3000'] loop
  begin
   perform k2_private.clean_reference_name_v1(v);
   raise exception 'EMPTY_REFERENCE_ACCEPTED';
  exception when invalid_parameter_value then
   if sqlerrm<>'K2_REFERENCE_INPUT_INVALID' then raise;end if;
  end;
 end loop;
end $checks$;
select 'K2_REFERENCE_NORMALIZATION_CHECKS_OK';
