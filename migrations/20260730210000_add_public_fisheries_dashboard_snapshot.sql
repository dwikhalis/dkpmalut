create or replace function public.get_public_fisheries_dashboard_snapshot(
 p_dashboard_id uuid
) returns jsonb language sql stable security definer set search_path=public as $$
with target as (
 select d.id,d.label,d.dashboard_config,d.updated_at,d.fisheries_dataset_id
 from public.datasets d where d.id=p_dashboard_id and d.kind='dashboard'
  and d.published='approved'
), trips as (
 select t.id,t.vessel_id from public.fishing_trips t join target d
  on d.fisheries_dataset_id=t.fisheries_dataset_id
), catches as (
 select c.*,s.scientific_name,s.local_name from public.fishing_trip_catches c
 join trips t on t.id=c.fishing_trip_id join public.species s on s.id=c.species_id
), species_summary as (
 select species_id,scientific_name,local_name,
  sum(coalesce(catch_weight_kg,0)) weight_kg,
  sum(coalesce(individual_count,0)) individuals,
  count(distinct fishing_trip_id) landing_trips
 from catches group by species_id,scientific_name,local_name
 having count(distinct fishing_trip_id)>=3
)
select case when exists(select 1 from target) then jsonb_build_object(
 'id',(select id from target),'label',(select label from target),
 'analyses',(select dashboard_config->'selectedAnalyses' from target),
 'updatedAt',(select updated_at from target),
 'tripCount',(select count(*) from trips),
 'vesselCount',(select count(distinct vessel_id) from trips where vessel_id is not null),
 'totalWeightKg',(select coalesce(sum(catch_weight_kg),0) from catches),
 'totalIndividuals',(select coalesce(sum(individual_count),0) from catches),
 'species',coalesce((select jsonb_agg(to_jsonb(s) order by weight_kg desc)
  from species_summary s),'[]'::jsonb),
 'privacyNote','Rincian spesies hanya ditampilkan jika terdapat pada minimal 3 trip.'
) else null end;
$$;
revoke all on function public.get_public_fisheries_dashboard_snapshot(uuid) from public;
grant execute on function public.get_public_fisheries_dashboard_snapshot(uuid) to anon,authenticated;
