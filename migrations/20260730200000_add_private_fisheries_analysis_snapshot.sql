create or replace function public.get_private_fisheries_analysis_snapshot(
 p_fisheries_dataset_id uuid,
 p_date_from date default null,
 p_date_to date default null,
 p_gear text default null,
 p_landing_location text default null,
 p_wpp text default null
) returns jsonb language sql stable security definer set search_path=public as $$
with authorized as (
 select id from public.fisheries_datasets
 where id=p_fisheries_dataset_id and public.can_read_fisheries_dataset(id)
), filtered_trips as (
 select t.id,t.vessel_id,t.return_at,t.primary_fishing_gear,t.landing_location,t.wpp,
  e.fishing_duration_hours,e.number_of_settings,e.number_of_hooks,e.net_length
 from public.fishing_trips t join authorized a on a.id=t.fisheries_dataset_id
 left join public.fishing_trip_effort e on e.fishing_trip_id=t.id
 where (p_date_from is null or t.return_at::date>=p_date_from)
  and (p_date_to is null or t.return_at::date<=p_date_to)
  and (p_gear is null or t.primary_fishing_gear=p_gear)
  and (p_landing_location is null or t.landing_location=p_landing_location)
  and (p_wpp is null or t.wpp=p_wpp)
), catches as (
 select c.*,s.scientific_name,s.local_name,s.species_group
 from public.fishing_trip_catches c join filtered_trips t on t.id=c.fishing_trip_id
 join public.species s on s.id=c.species_id
), species_summary as (
 select species_id,scientific_name,local_name,species_group,
  coalesce(sum(catch_weight_kg),0) weight_kg,
  coalesce(sum(individual_count),0) individuals,
  count(distinct fishing_trip_id) landing_trips,count(*) records
 from catches group by species_id,scientific_name,local_name,species_group
), length_summary as (
 select l.species_id,l.measurement_type,l.length_cm,count(*) frequency
 from public.fish_length_measurements l join catches c on c.id=l.fishing_trip_catch_id
 group by l.species_id,l.measurement_type,l.length_cm
)
select jsonb_build_object(
 'tripCount',(select count(*) from filtered_trips),
 'catchTripCount',(select count(distinct fishing_trip_id) from catches),
 'vesselCount',(select count(distinct vessel_id) from filtered_trips where vessel_id is not null),
 'totalWeightKg',(select coalesce(sum(catch_weight_kg),0) from catches),
 'totalIndividuals',(select coalesce(sum(individual_count),0) from catches),
 'effort',jsonb_build_object(
  'hours',(select coalesce(sum(fishing_duration_hours),0) from filtered_trips where fishing_duration_hours>0),
  'hourTrips',(select count(*) from filtered_trips where fishing_duration_hours>0),
  'hourWeight',(select coalesce(sum(c.catch_weight_kg),0) from catches c join filtered_trips t on t.id=c.fishing_trip_id where t.fishing_duration_hours>0),
  'settings',(select coalesce(sum(number_of_settings),0) from filtered_trips where number_of_settings>0),
  'settingTrips',(select count(*) from filtered_trips where number_of_settings>0),
  'settingWeight',(select coalesce(sum(c.catch_weight_kg),0) from catches c join filtered_trips t on t.id=c.fishing_trip_id where t.number_of_settings>0),
  'hooks',(select coalesce(sum(number_of_hooks),0) from filtered_trips where number_of_hooks>0),
  'hookTrips',(select count(*) from filtered_trips where number_of_hooks>0),
  'hookWeight',(select coalesce(sum(c.catch_weight_kg),0) from catches c join filtered_trips t on t.id=c.fishing_trip_id where t.number_of_hooks>0),
  'netMetres',(select coalesce(sum(net_length),0) from filtered_trips where net_length>0),
  'netTrips',(select count(*) from filtered_trips where net_length>0),
  'netWeight',(select coalesce(sum(c.catch_weight_kg),0) from catches c join filtered_trips t on t.id=c.fishing_trip_id where t.net_length>0)
 ),
 'species',coalesce((select jsonb_agg(to_jsonb(s) order by weight_kg desc,individuals desc)
  from species_summary s),'[]'::jsonb),
 'lengths',coalesce((select jsonb_agg(to_jsonb(l) order by species_id,measurement_type,length_cm)
  from length_summary l),'[]'::jsonb),
 'filters',jsonb_build_object(
  'gears',coalesce((select jsonb_agg(distinct primary_fishing_gear) from filtered_trips),'[]'::jsonb),
  'landingLocations',coalesce((select jsonb_agg(distinct landing_location) from filtered_trips),'[]'::jsonb),
  'wpps',coalesce((select jsonb_agg(distinct wpp) filter(where wpp is not null) from filtered_trips),'[]'::jsonb)
 )
);
$$;
revoke all on function public.get_private_fisheries_analysis_snapshot(uuid,date,date,text,text,text) from public;
grant execute on function public.get_private_fisheries_analysis_snapshot(uuid,date,date,text,text,text) to authenticated;
