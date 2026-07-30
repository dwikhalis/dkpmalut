alter table public.datasets drop constraint if exists datasets_kind_check;
alter table public.datasets add constraint datasets_kind_check
  check (kind in ('dataset','map','link','dashboard'));
alter table public.datasets add column if not exists dashboard_config jsonb;
alter table public.datasets add column if not exists fisheries_dataset_id uuid
  references public.fisheries_datasets(id) on delete set null;
create index if not exists datasets_dashboard_kind_idx on public.datasets(kind)
  where kind='dashboard';
comment on column public.datasets.dashboard_config is
  'Persistent selected analyses, independent progress, shared-data state, filters, and calculation version.';
