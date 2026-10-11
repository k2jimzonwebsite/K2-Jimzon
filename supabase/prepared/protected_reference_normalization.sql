-- MAP-018 / IDEA-20261010-06. Prepared only; no provider apply authorization.
-- Fragment requires its caller's atomic installation and armed deadlines.
-- Normalization proof is separate from uniqueness/creation/context qualification.
do $admission$
declare d pg_catalog.pg_database%rowtype;
begin
 if current_user<>'postgres' or to_regnamespace('k2_private') is null
    or current_setting('server_version_num')<>'170006'
    or to_regprocedure('k2_private.clean_reference_name_v1(text)') is not null
    or to_regprocedure('k2_private.reference_name_key_v1(text)') is not null then
  raise exception 'K2_REFERENCE_NORMALIZATION_TARGET_INVALID';
 end if;
 select * into d from pg_catalog.pg_database where datname=current_database();
 if pg_catalog.pg_encoding_to_char(d.encoding)<>'UTF8' or d.datlocprovider<>'i'
    or d.datlocale is distinct from 'en-US'
    or d.datcollate is distinct from 'en_US.UTF-8'
    or d.datctype is distinct from 'en_US.UTF-8'
    or d.datcollversion is distinct from '153.121'
    or pg_catalog.pg_database_collation_actual_version(d.oid) is distinct from d.datcollversion then
  raise exception 'K2_REFERENCE_NORMALIZATION_LOCALE_NOT_EXACT';
 end if;
end $admission$;

create function k2_private.clean_reference_name_v1(p_value text)
returns text language plpgsql immutable set search_path='' as $clean$
declare v_clean text;
begin
 -- PostgreSQL text cannot contain U+0000. Reject every remaining C0/C1 control
 -- before printable whitespace cleanup, so CR/LF/TAB cannot disappear.
 if p_value is null or p_value ~ U&'[\0001-\001F\007F-\009F]' then
  raise exception using errcode='22023',message='K2_REFERENCE_INPUT_INVALID';
 end if;
 v_clean:=pg_catalog.btrim(pg_catalog.regexp_replace(p_value,
  U&'[ \00A0\1680\2000-\200A\2028\2029\202F\205F\3000]+',' ','g'),' ');
 if pg_catalog.length(v_clean) not between 1 and 120 then
  raise exception using errcode='22023',message='K2_REFERENCE_INPUT_INVALID';
 end if;
 return v_clean;
end $clean$;
revoke all on function k2_private.clean_reference_name_v1(text)
 from public,anon,authenticated,service_role;

create function k2_private.reference_name_key_v1(p_value text)
returns text language sql immutable security definer set search_path='' as $key$
 select pg_catalog.lower(k2_private.clean_reference_name_v1(p_value) collate "default");
$key$;
revoke all on function k2_private.reference_name_key_v1(text)
 from public,anon,authenticated,service_role;
-- Stored expression-index evaluation needs EXECUTE for existing table writers.
-- This pure input-only helper runs its owner-only cleanup under fixed identity;
-- private schema USAGE and every mutation/context helper remain closed.
grant execute on function k2_private.reference_name_key_v1(text) to authenticated,service_role;
