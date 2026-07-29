create or replace function public.delete_dataset_import_batch(
  p_dataset_id uuid,
  p_batch_id uuid default null,
  p_delete_initial boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch public.dataset_import_batches;
  v_dataset_owner uuid;
  v_row_ids text[];
  v_deleted_count integer := 0;
begin
  select user_id into v_dataset_owner
  from public.datasets
  where id = p_dataset_id
  for update;

  if not found then raise exception 'Dataset not found'; end if;

  if p_delete_initial then
    if not (public.is_admin() or v_dataset_owner = auth.uid()) then
      raise exception 'You do not have permission to delete the initial import';
    end if;

    select coalesce(array_agg(row_id), '{}'::text[])
    into v_row_ids
    from (
      select unnest(row_ids) as row_id
      from public.dataset_import_batches
      where dataset_id = p_dataset_id
    ) imported;

    select count(*)::integer
    into v_deleted_count
    from public.datasets d,
    lateral jsonb_array_elements(coalesce(d.data, '[]'::jsonb)) item
    where d.id = p_dataset_id
      and not (item->>'id' = any(v_row_ids));

    update public.datasets
    set data = coalesce((
      select jsonb_agg(item order by position)
      from jsonb_array_elements(coalesce(data, '[]'::jsonb))
        with ordinality rows(item, position)
      where not (item->>'id' = any(v_row_ids))
    ), '[]'::jsonb),
    updated_at = now()
    where id = p_dataset_id;

    return v_deleted_count;
  end if;

  if p_batch_id is null then raise exception 'Batch ID is required'; end if;

  select *
  into v_batch
  from public.dataset_import_batches
  where id = p_batch_id and dataset_id = p_dataset_id
  for update;

  if not found then raise exception 'Import batch not found'; end if;

  if not (
    public.is_admin()
    or (
      v_batch.created_by = auth.uid()
      and public.has_dataset_permission(p_dataset_id, 'add')
    )
  ) then
    raise exception 'You do not have permission to delete this import batch';
  end if;

  select count(*)::integer
  into v_deleted_count
  from public.datasets d,
  lateral jsonb_array_elements(coalesce(d.data, '[]'::jsonb)) item
  where d.id = p_dataset_id
    and item->>'id' = any(v_batch.row_ids);

  update public.datasets
  set data = coalesce((
    select jsonb_agg(item order by position)
    from jsonb_array_elements(coalesce(data, '[]'::jsonb))
      with ordinality rows(item, position)
    where not (item->>'id' = any(v_batch.row_ids))
  ), '[]'::jsonb),
  updated_at = now()
  where id = p_dataset_id;

  delete from public.dataset_import_batches where id = v_batch.id;
  return v_deleted_count;
end;
$$;

revoke all on function public.delete_dataset_import_batch(uuid, uuid, boolean)
  from public;
grant execute on function public.delete_dataset_import_batch(uuid, uuid, boolean)
  to authenticated;
