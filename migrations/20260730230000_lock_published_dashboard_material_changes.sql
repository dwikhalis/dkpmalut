create or replace function public.prevent_published_dashboard_material_changes()
returns trigger language plpgsql set search_path=public as $$
begin
 if old.kind='dashboard' and not public.is_admin()
  and new.published is distinct from old.published
  and (
   new.published in('approved','rejected')
   or old.published in('requested','approved')
  ) then
  raise exception 'dashboard_publication_transition_requires_admin'
   using errcode='42501';
 end if;
 if old.kind='dashboard'
  and old.published in('requested','approved')
  and not public.is_admin()
  and (
   new.label is distinct from old.label
   or new.dashboard_config is distinct from old.dashboard_config
   or new.fisheries_dataset_id is distinct from old.fisheries_dataset_id
  ) then
  raise exception 'published_dashboard_is_locked' using errcode='42501';
 end if;
 return new;
end $$;

drop trigger if exists prevent_published_dashboard_material_changes
 on public.datasets;
create trigger prevent_published_dashboard_material_changes
before update on public.datasets for each row
execute function public.prevent_published_dashboard_material_changes();

comment on function public.prevent_published_dashboard_material_changes() is
 'Locks owner-controlled analysis configuration and source data while a dashboard is awaiting review or approved.';

create or replace function public.prevent_dashboard_self_approval_on_insert()
returns trigger language plpgsql set search_path=public as $$
begin
 if new.kind='dashboard' and new.published is not null and not public.is_admin()
 then
  raise exception 'new_dashboard_must_start_unpublished' using errcode='42501';
 end if;
 return new;
end $$;
drop trigger if exists prevent_dashboard_self_approval_on_insert
 on public.datasets;
create trigger prevent_dashboard_self_approval_on_insert
before insert on public.datasets for each row
execute function public.prevent_dashboard_self_approval_on_insert();
