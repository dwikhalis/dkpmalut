create table if not exists public.dataset_public_metrics (
  resource_kind text not null check (resource_kind in ('dataset', 'map')),
  resource_id uuid not null,
  view_count bigint not null default 0 check (view_count >= 0),
  download_count bigint not null default 0 check (download_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (resource_kind, resource_id)
);

alter table public.dataset_public_metrics enable row level security;

create policy "public reads dataset metrics"
on public.dataset_public_metrics for select to anon, authenticated
using (true);

create or replace function public.record_public_dataset_metric(
  p_resource_kind text,
  p_resource_id uuid,
  p_metric text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_published boolean := false;
begin
  if auth.uid() is not null and public.is_admin() then
    return;
  end if;

  if p_resource_kind = 'dataset' then
    select published = 'approved'
    into v_is_published
    from public.datasets
    where id = p_resource_id;
  elsif p_resource_kind = 'map' then
    select published = 'approved'
    into v_is_published
    from public.map_datasets
    where id = p_resource_id;
  else
    raise exception 'Invalid resource kind';
  end if;

  if not coalesce(v_is_published, false) then
    raise exception 'Resource is not published';
  end if;

  if p_metric not in ('view', 'download') then
    raise exception 'Invalid metric';
  end if;

  insert into public.dataset_public_metrics (
    resource_kind, resource_id, view_count, download_count
  )
  values (
    p_resource_kind,
    p_resource_id,
    case when p_metric = 'view' then 1 else 0 end,
    case when p_metric = 'download' then 1 else 0 end
  )
  on conflict (resource_kind, resource_id)
  do update set
    view_count = public.dataset_public_metrics.view_count
      + case when p_metric = 'view' then 1 else 0 end,
    download_count = public.dataset_public_metrics.download_count
      + case when p_metric = 'download' then 1 else 0 end,
    updated_at = now();
end;
$$;

revoke all on function public.record_public_dataset_metric(text, uuid, text)
  from public;
grant execute on function public.record_public_dataset_metric(text, uuid, text)
  to anon, authenticated;

create or replace function public.delete_public_dataset_metrics()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.dataset_public_metrics
  where resource_kind =
    case when tg_table_name = 'map_datasets' then 'map' else 'dataset' end
    and resource_id = old.id;
  return old;
end;
$$;

drop trigger if exists delete_public_dataset_metrics on public.datasets;
create trigger delete_public_dataset_metrics
after delete on public.datasets
for each row execute function public.delete_public_dataset_metrics();

drop trigger if exists delete_public_dataset_metrics on public.map_datasets;
create trigger delete_public_dataset_metrics
after delete on public.map_datasets
for each row execute function public.delete_public_dataset_metrics();
