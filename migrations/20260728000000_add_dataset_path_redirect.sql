alter table public.datasets
  add column if not exists path_redirect text;

alter table public.datasets
  drop constraint if exists datasets_kind_check;

alter table public.datasets
  add constraint datasets_kind_check
  check (kind in ('dataset', 'map', 'link'));

comment on column public.datasets.path_redirect is
  'External destination URL for link datasets; NULL for regular datasets.';

