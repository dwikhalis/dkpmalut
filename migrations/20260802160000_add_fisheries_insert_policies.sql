begin;

alter table public.dataset_fish_trip enable row level security;
alter table public.dataset_fish_length enable row level security;

drop policy if exists "owners insert fisheries trip rows"
  on public.dataset_fish_trip;
create policy "owners insert fisheries trip rows"
on public.dataset_fish_trip
for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "owners insert fisheries length rows"
  on public.dataset_fish_length;
create policy "owners insert fisheries length rows"
on public.dataset_fish_length
for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.is_admin()
);

commit;
