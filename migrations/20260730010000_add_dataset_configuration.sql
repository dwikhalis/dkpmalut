create table if not exists public.dataset_validation_configs (
  dataset_id uuid primary key references public.datasets(id) on delete cascade,
  duplicate_keys text[] not null default '{}',
  updated_by uuid references public.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dataset_access_grants (
  dataset_id uuid not null references public.datasets(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  can_add boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (dataset_id, user_id)
);

create index if not exists dataset_access_grants_user_idx
  on public.dataset_access_grants(user_id, dataset_id);

alter table public.dataset_validation_configs enable row level security;
alter table public.dataset_access_grants enable row level security;

create or replace function public.has_dataset_permission(
  p_dataset_id uuid,
  p_action text default 'read'
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.datasets d
      where d.id = p_dataset_id and d.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.dataset_access_grants g
      where g.dataset_id = p_dataset_id
        and g.user_id = auth.uid()
        and case p_action
          when 'add' then g.can_add
          when 'edit' then g.can_edit
          when 'delete' then g.can_delete
          else true
        end
    );
$$;

revoke all on function public.has_dataset_permission(uuid, text) from public;
grant execute on function public.has_dataset_permission(uuid, text)
  to authenticated;

create policy "grantees read datasets"
on public.datasets for select to authenticated
using (public.has_dataset_permission(id, 'read'));

create policy "grantees read dataset import batches"
on public.dataset_import_batches for select to authenticated
using (public.has_dataset_permission(dataset_id, 'read'));

create or replace function public.get_dataset_uploader_name(p_dataset_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if not public.has_dataset_permission(p_dataset_id, 'read') then
    raise exception 'You do not have permission to read this dataset';
  end if;

  select coalesce(
    nullif(trim(u.username), ''),
    nullif(trim(u.organization), ''),
    nullif(trim(u.email), ''),
    'Pengguna'
  )
  into v_name
  from public.datasets d
  left join public.users u on u.id = d.user_id
  where d.id = p_dataset_id;

  return coalesce(v_name, 'Pengguna');
end;
$$;

revoke all on function public.get_dataset_uploader_name(uuid) from public;
grant execute on function public.get_dataset_uploader_name(uuid)
  to authenticated;

create policy "dataset configuration visible to owners admins and grantees"
on public.dataset_validation_configs for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.datasets d
    where d.id = dataset_id and d.user_id = auth.uid()
  )
  or exists (
    select 1 from public.dataset_access_grants g
    where g.dataset_id = dataset_id and g.user_id = auth.uid()
  )
);

create policy "admins manage dataset validation"
on public.dataset_validation_configs for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.append_dataset_rows_with_batch(
  p_dataset_id uuid,
  p_rows jsonb
)
returns public.dataset_import_batches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch public.dataset_import_batches;
  v_row_ids text[];
  v_created_by_name text;
  v_duplicate_keys text[];
  v_duplicate jsonb;
begin
  if not public.has_dataset_permission(p_dataset_id, 'add') then
    raise exception 'You do not have permission to add data to this dataset';
  end if;

  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'p_rows must be a non-empty JSON array';
  end if;

  select array_agg(item->>'id')
  into v_row_ids
  from jsonb_array_elements(p_rows) item;

  if v_row_ids is null or array_position(v_row_ids, null) is not null then
    raise exception 'Every imported row must have an id';
  end if;

  select duplicate_keys
  into v_duplicate_keys
  from public.dataset_validation_configs
  where dataset_id = p_dataset_id;

  if cardinality(v_duplicate_keys) > 0 then
    select incoming
    into v_duplicate
    from jsonb_array_elements(p_rows) incoming
    where exists (
      select 1
      from public.datasets d,
      lateral jsonb_array_elements(coalesce(d.data, '[]'::jsonb)) existing
      where d.id = p_dataset_id
        and not exists (
          select 1
          from unnest(v_duplicate_keys) key_name
          where lower(trim(coalesce(existing->>key_name, '')))
            is distinct from
            lower(trim(coalesce(incoming->>key_name, '')))
        )
    )
    limit 1;

    if v_duplicate is null then
      select first_row
      into v_duplicate
      from jsonb_array_elements(p_rows) with ordinality a(first_row, first_pos)
      join jsonb_array_elements(p_rows) with ordinality b(second_row, second_pos)
        on a.first_pos < b.second_pos
      where not exists (
        select 1
        from unnest(v_duplicate_keys) key_name
        where lower(trim(coalesce(a.first_row->>key_name, '')))
          is distinct from
          lower(trim(coalesce(b.second_row->>key_name, '')))
      )
      limit 1;
    end if;

    if v_duplicate is not null then
      raise exception 'Duplicate data detected for configured key: %',
        array_to_string(v_duplicate_keys, ', ');
    end if;
  end if;

  select coalesce(
    nullif(trim(username), ''),
    nullif(trim(organization), ''),
    nullif(trim(email), ''),
    'Pengguna'
  )
  into v_created_by_name
  from public.users
  where id = auth.uid();

  update public.datasets
  set data = coalesce(data, '[]'::jsonb) || p_rows,
      updated_at = now()
  where id = p_dataset_id;

  if not found then
    raise exception 'Dataset not found';
  end if;

  insert into public.dataset_import_batches (
    dataset_id, created_by, created_by_name, row_ids, row_count
  )
  values (
    p_dataset_id, auth.uid(), coalesce(v_created_by_name, 'Pengguna'),
    v_row_ids, cardinality(v_row_ids)
  )
  returning * into v_batch;

  return v_batch;
end;
$$;

revoke all on function public.append_dataset_rows_with_batch(uuid, jsonb)
  from public;
grant execute on function public.append_dataset_rows_with_batch(uuid, jsonb)
  to authenticated;

create or replace function public.update_dataset_data_rows(
  p_dataset_id uuid,
  p_changes jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_dataset_permission(p_dataset_id, 'edit') then
    raise exception 'You do not have permission to edit this dataset';
  end if;
  if jsonb_typeof(p_changes) <> 'array' then
    raise exception 'p_changes must be a JSON array';
  end if;

  update public.datasets d
  set data = coalesce((
    select jsonb_agg(
      case
        when matched.change is null then source.row
        else source.row || (matched.change - 'id')
      end
      order by source.position
    )
    from jsonb_array_elements(coalesce(d.data, '[]'::jsonb))
      with ordinality source(row, position)
    left join lateral (
      select change
      from jsonb_array_elements(p_changes) change
      where change->>'id' = source.row->>'id'
      limit 1
    ) matched on true
  ), '[]'::jsonb),
  updated_at = now()
  where d.id = p_dataset_id;

  if not found then raise exception 'Dataset not found'; end if;
end;
$$;

create or replace function public.delete_dataset_data_rows(
  p_dataset_id uuid,
  p_row_ids text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_dataset_permission(p_dataset_id, 'delete') then
    raise exception 'You do not have permission to delete data from this dataset';
  end if;

  update public.datasets d
  set data = coalesce((
    select jsonb_agg(source.row order by source.position)
    from jsonb_array_elements(coalesce(d.data, '[]'::jsonb))
      with ordinality source(row, position)
    where not (source.row->>'id' = any(p_row_ids))
  ), '[]'::jsonb),
  updated_at = now()
  where d.id = p_dataset_id;

  if not found then raise exception 'Dataset not found'; end if;
end;
$$;

revoke all on function public.update_dataset_data_rows(uuid, jsonb) from public;
revoke all on function public.delete_dataset_data_rows(uuid, text[]) from public;
grant execute on function public.update_dataset_data_rows(uuid, jsonb)
  to authenticated;
grant execute on function public.delete_dataset_data_rows(uuid, text[])
  to authenticated;

create policy "admins read dataset grants"
on public.dataset_access_grants for select to authenticated
using (public.is_admin());

create policy "partners read their dataset grants"
on public.dataset_access_grants for select to authenticated
using (user_id = auth.uid());

create policy "admins manage dataset grants"
on public.dataset_access_grants for all to authenticated
using (public.is_admin())
with check (public.is_admin());
