create or replace function public.attach_fisheries_source_to_dashboard(
 p_dashboard_id uuid,p_fisheries_dataset_id uuid
) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not exists(select 1 from public.datasets where id=p_dashboard_id
   and kind='dashboard' and(user_id=auth.uid() or public.is_admin())) then
  raise exception 'dashboard_not_editable' using errcode='42501';
 end if;
 if not public.can_reuse_fisheries_dataset(p_fisheries_dataset_id) then
  raise exception 'source_not_reusable' using errcode='42501';
 end if;
 update public.dashboard_fisheries_sources set is_primary=false
  where dashboard_id=p_dashboard_id;
 insert into public.dashboard_fisheries_sources(
  dashboard_id,fisheries_dataset_id,attached_by,is_primary)
 values(p_dashboard_id,p_fisheries_dataset_id,auth.uid(),true)
 on conflict(dashboard_id,fisheries_dataset_id) do update
  set is_primary=true,attached_by=auth.uid();
 update public.datasets set fisheries_dataset_id=p_fisheries_dataset_id,
  dashboard_config=jsonb_set(coalesce(dashboard_config,'{}'),'{sharedDatasetStatus}','"imported"',true),
  updated_at=now() where id=p_dashboard_id;
end $$;
revoke all on function public.attach_fisheries_source_to_dashboard(uuid,uuid) from public;
grant execute on function public.attach_fisheries_source_to_dashboard(uuid,uuid) to authenticated;

create or replace function public.detach_fisheries_source_from_dashboard(
 p_dashboard_id uuid
) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not exists(select 1 from public.datasets where id=p_dashboard_id
   and kind='dashboard' and(user_id=auth.uid() or public.is_admin())) then
  raise exception 'dashboard_not_editable' using errcode='42501';
 end if;
 update public.dashboard_fisheries_sources set is_primary=false
  where dashboard_id=p_dashboard_id;
 update public.datasets set fisheries_dataset_id=null,
  dashboard_config=jsonb_set(coalesce(dashboard_config,'{}'),'{sharedDatasetStatus}','"requirements_configured"',true),
  import_status='draft',updated_at=now() where id=p_dashboard_id;
end $$;
revoke all on function public.detach_fisheries_source_from_dashboard(uuid) from public;
grant execute on function public.detach_fisheries_source_from_dashboard(uuid) to authenticated;
