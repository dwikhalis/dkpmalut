create table if not exists public.table_view_preferences (
  user_id uuid not null references public.users(id) on delete cascade
    default auth.uid(),
  resource_kind text not null check (resource_kind in ('dataset', 'map_layer')),
  resource_id uuid not null,
  column_order text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, resource_kind, resource_id)
);

alter table public.table_view_preferences enable row level security;

create policy "users read own table preferences"
on public.table_view_preferences for select to authenticated
using (user_id = auth.uid());

create policy "users create own table preferences"
on public.table_view_preferences for insert to authenticated
with check (user_id = auth.uid());

create policy "users update own table preferences"
on public.table_view_preferences for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "users delete own table preferences"
on public.table_view_preferences for delete to authenticated
using (user_id = auth.uid());
