create or replace function public.write_activity_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_record jsonb;
  v_old jsonb := '{}'::jsonb;
  v_new jsonb := '{}'::jsonb;
  v_metadata jsonb;
  v_changed_fields jsonb := '[]'::jsonb;
  v_added_ids jsonb := '[]'::jsonb;
  v_removed_ids jsonb := '[]'::jsonb;
  v_updated_ids jsonb := '[]'::jsonb;
  v_added_count integer := 0;
  v_removed_count integer := 0;
  v_updated_count integer := 0;
begin
  if tg_op <> 'INSERT' then v_old := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then v_new := to_jsonb(new); end if;

  v_record := case when tg_op = 'DELETE' then v_old else v_new end;
  v_id := (v_record->>'id')::uuid;

  if tg_op = 'UPDATE' then
    select coalesce(jsonb_agg(key order by key), '[]'::jsonb)
    into v_changed_fields
    from (
      select key from jsonb_object_keys(v_old || v_new) key
      where key <> 'updated_at'
        and v_old->key is distinct from v_new->key
    ) changes;
  end if;

  if tg_table_name = 'datasets' and tg_op = 'UPDATE' then
    select count(*)::integer into v_added_count
    from jsonb_array_elements(coalesce(v_new->'data', '[]'::jsonb)) item
    where not exists (
      select 1
      from jsonb_array_elements(coalesce(v_old->'data', '[]'::jsonb)) old_item
      where old_item->>'id' = item->>'id'
    );

    select coalesce(jsonb_agg(id order by id), '[]'::jsonb)
    into v_added_ids
    from (
      select item->>'id' id
      from jsonb_array_elements(coalesce(v_new->'data', '[]'::jsonb)) item
      where not exists (
        select 1
        from jsonb_array_elements(coalesce(v_old->'data', '[]'::jsonb)) old_item
        where old_item->>'id' = item->>'id'
      )
      limit 100
    ) added;

    select count(*)::integer into v_removed_count
    from jsonb_array_elements(coalesce(v_old->'data', '[]'::jsonb)) item
    where not exists (
      select 1
      from jsonb_array_elements(coalesce(v_new->'data', '[]'::jsonb)) new_item
      where new_item->>'id' = item->>'id'
    );

    select coalesce(jsonb_agg(id order by id), '[]'::jsonb)
    into v_removed_ids
    from (
      select item->>'id' id
      from jsonb_array_elements(coalesce(v_old->'data', '[]'::jsonb)) item
      where not exists (
        select 1
        from jsonb_array_elements(coalesce(v_new->'data', '[]'::jsonb)) new_item
        where new_item->>'id' = item->>'id'
      )
      limit 100
    ) removed;

    select count(*)::integer into v_updated_count
    from jsonb_array_elements(coalesce(v_new->'data', '[]'::jsonb)) new_item
    join jsonb_array_elements(coalesce(v_old->'data', '[]'::jsonb)) old_item
      on old_item->>'id' = new_item->>'id'
    where old_item is distinct from new_item;

    select coalesce(jsonb_agg(id order by id), '[]'::jsonb)
    into v_updated_ids
    from (
      select new_item->>'id' id
      from jsonb_array_elements(coalesce(v_new->'data', '[]'::jsonb)) new_item
      join jsonb_array_elements(coalesce(v_old->'data', '[]'::jsonb)) old_item
        on old_item->>'id' = new_item->>'id'
      where old_item is distinct from new_item
      limit 100
    ) updated;
  end if;

  v_metadata := jsonb_build_object(
    'changed_at', now(),
    'label', coalesce(
      v_record->>'label',
      v_record->>'title',
      v_record->>'name',
      v_record->>'username'
    ),
    'changed_fields', v_changed_fields,
    'owner_id', v_record->'user_id',
    'publication_status', v_record->>'published',
    'data_row_count',
      case
        when jsonb_typeof(v_record->'data') = 'array'
          then jsonb_array_length(v_record->'data')
        else 0
      end,
    'row_changes', jsonb_build_object(
      'added_ids', v_added_ids,
      'removed_ids', v_removed_ids,
      'updated_ids', v_updated_ids,
      'added_count', v_added_count,
      'removed_count', v_removed_count,
      'updated_count', v_updated_count,
      'id_list_limit', 100
    )
  );

  insert into public.activity_logs(
    actor_id, action, entity_type, entity_id, metadata
  )
  values (auth.uid(), tg_op, tg_table_name, v_id, v_metadata);

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.write_dataset_support_activity_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record jsonb;
  v_dataset_id uuid;
  v_entity_id uuid;
  v_label text;
  v_metadata jsonb;
begin
  v_record := case
    when tg_op = 'DELETE' then to_jsonb(old)
    else to_jsonb(new)
  end;
  v_dataset_id := (v_record->>'dataset_id')::uuid;
  v_entity_id := coalesce((v_record->>'id')::uuid, v_dataset_id);

  select label into v_label
  from public.datasets
  where id = v_dataset_id;

  v_metadata := jsonb_build_object(
    'label', v_label,
    'dataset_id', v_dataset_id,
    'operation',
    case
      when tg_table_name = 'dataset_import_batches' and tg_op = 'INSERT'
        then 'UPLOAD_BATCH'
      when tg_table_name = 'dataset_import_batches' and tg_op = 'DELETE'
        then 'DELETE_BATCH'
      when tg_table_name = 'dataset_access_grants'
        then 'UPDATE_ACCESS'
      when tg_table_name = 'dataset_validation_configs'
        then 'UPDATE_DUPLICATE_VALIDATION'
      else tg_op
    end,
    'row_count', coalesce((v_record->>'row_count')::integer, 0),
    'row_ids_sample', coalesce((
      select jsonb_agg(value)
      from (
        select value
        from jsonb_array_elements(coalesce(v_record->'row_ids', '[]'::jsonb))
        limit 100
      ) sampled
    ), '[]'::jsonb),
    'batch_uploader_id', v_record->'created_by',
    'batch_uploader_name', v_record->>'created_by_name',
    'granted_user_id', v_record->'user_id',
    'can_add', v_record->'can_add',
    'can_edit', v_record->'can_edit',
    'can_delete', v_record->'can_delete',
    'duplicate_keys', coalesce(v_record->'duplicate_keys', '[]'::jsonb)
  );

  insert into public.activity_logs(
    actor_id, action, entity_type, entity_id, metadata
  )
  values (auth.uid(), tg_op, tg_table_name, v_entity_id, v_metadata);

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists write_activity_log
  on public.dataset_import_batches;
create trigger write_activity_log
after insert or update or delete on public.dataset_import_batches
for each row execute function public.write_dataset_support_activity_log();

drop trigger if exists write_activity_log
  on public.dataset_access_grants;
create trigger write_activity_log
after insert or update or delete on public.dataset_access_grants
for each row execute function public.write_dataset_support_activity_log();

drop trigger if exists write_activity_log
  on public.dataset_validation_configs;
create trigger write_activity_log
after insert or update or delete on public.dataset_validation_configs
for each row execute function public.write_dataset_support_activity_log();
