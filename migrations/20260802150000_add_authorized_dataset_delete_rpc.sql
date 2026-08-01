begin;

create index if not exists dataset_import_batches_dataset_delete_idx
  on public.dataset_import_batches(dataset_id);
create index if not exists fisheries_trip_import_batch_delete_idx
  on public.dataset_fish_trip(import_batch_id);
create index if not exists fisheries_length_import_batch_delete_idx
  on public.dataset_fish_length(import_batch_id);
create index if not exists fisheries_staging_batch_delete_idx
  on public.fisheries_dashboard_import_staging(batch_id);

create or replace function public.delete_authorized_datasets(
  p_dataset_ids uuid[],
  p_owner_id uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = public
set statement_timeout = 0
as $$
declare
  v_requested bigint;
  v_authorized bigint;
  v_deleted bigint;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select count(distinct id) into v_requested
  from unnest(coalesce(p_dataset_ids, '{}'::uuid[])) as requested(id);

  if v_requested = 0 then return 0; end if;

  select count(*) into v_authorized
  from public.datasets d
  where d.id = any(p_dataset_ids)
    and (p_owner_id is null or d.user_id = p_owner_id)
    and (d.user_id = auth.uid() or public.is_admin());

  if v_authorized <> v_requested then
    raise exception 'dataset_delete_not_authorized' using errcode = '42501';
  end if;

  delete from public.datasets d
  where d.id = any(p_dataset_ids)
    and (p_owner_id is null or d.user_id = p_owner_id)
    and (d.user_id = auth.uid() or public.is_admin());

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.delete_authorized_datasets(uuid[],uuid) from public;
grant execute on function public.delete_authorized_datasets(uuid[],uuid) to authenticated;

commit;
