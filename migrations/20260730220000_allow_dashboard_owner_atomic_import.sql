-- The importer already enforces dashboard ownership (or admin) immediately
-- after authentication. Do not additionally tie data ownership to a profile
-- role: an authenticated owner may import their own dashboard regardless of
-- stakeholder classification.
do $$
declare
 v_definition text;
begin
 select pg_get_functiondef(
  'public.import_normalized_fisheries_dataset_core_v1(uuid,jsonb,jsonb,jsonb,jsonb)'::regprocedure
 ) into v_definition;
 v_definition := replace(
  v_definition,
  'if v_user is null or not public.is_admin_or_partner() then',
  'if v_user is null then'
 );
 if position('not public.is_admin_or_partner()' in v_definition)>0 then
  raise exception 'atomic importer authorization patch was not applied';
 end if;
 execute v_definition;
end $$;
