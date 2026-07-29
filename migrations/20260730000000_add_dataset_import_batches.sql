create table if not exists public.dataset_import_batches (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.datasets(id) on delete cascade,
  created_by uuid references public.users(id) on delete set null,
  created_by_name text not null,
  row_ids text[] not null default '{}',
  row_count integer not null check (row_count >= 0),
  created_at timestamptz not null default now()
);

create index if not exists dataset_import_batches_dataset_created_idx
  on public.dataset_import_batches(dataset_id, created_at desc);

alter table public.dataset_import_batches enable row level security;

create policy "owners read dataset import batches"
on public.dataset_import_batches
for select to authenticated
using (
  exists (
    select 1
    from public.datasets d
    where d.id = dataset_id
      and (d.user_id = auth.uid() or public.is_admin())
  )
);

create policy "owners create dataset import batches"
on public.dataset_import_batches
for insert to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.datasets d
    where d.id = dataset_id
      and (d.user_id = auth.uid() or public.is_admin())
  )
);

create or replace function public.append_dataset_rows_with_batch(
  p_dataset_id uuid,
  p_rows jsonb
)
returns public.dataset_import_batches
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_batch public.dataset_import_batches;
  v_row_ids text[];
  v_created_by_name text;
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'p_rows must be a non-empty JSON array';
  end if;

  select array_agg(item->>'id')
  into v_row_ids
  from jsonb_array_elements(p_rows) item;

  if v_row_ids is null or array_position(v_row_ids, null) is not null then
    raise exception 'Every imported row must have an id';
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
    raise exception 'Dataset not found or not editable';
  end if;

  insert into public.dataset_import_batches (
    dataset_id,
    created_by,
    created_by_name,
    row_ids,
    row_count
  )
  values (
    p_dataset_id,
    auth.uid(),
    coalesce(v_created_by_name, 'Pengguna'),
    v_row_ids,
    cardinality(v_row_ids)
  )
  returning * into v_batch;

  return v_batch;
end;
$$;

grant execute on function public.append_dataset_rows_with_batch(uuid, jsonb)
  to authenticated;
