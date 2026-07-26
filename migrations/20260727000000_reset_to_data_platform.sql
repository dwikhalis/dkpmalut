-- DKP Maluku Utara: destructive reset to a data-only platform
--
-- WARNING: THIS MIGRATION PERMANENTLY DELETES ALL APPLICATION-TABLE DATA.
-- Supabase Auth users in auth.users are preserved and profiles are rebuilt.
-- Back up the database before running this migration.

begin;

create extension if not exists pgcrypto with schema extensions;

-- Preserve access roles so existing administrators are not locked out after
-- profiles are rebuilt. Other application-table data is intentionally reset.
create temporary table preserved_user_roles (
  id uuid primary key,
  role text not null
) on commit drop;

do $$
begin
  if to_regclass('public.users') is not null then
    insert into preserved_user_roles(id, role)
    select id, role
    from public.users
    where role in ('admin', 'partner', 'user')
    on conflict(id) do update set role = excluded.role;
  end if;
end
$$;

-- Remove application triggers attached to auth.users before replacing helpers.
drop trigger if exists on_auth_user_created_or_updated on auth.users;

-- Drop every old and current application table. CASCADE removes their RLS
-- policies, triggers, foreign keys, publications, and dependent views.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'payment_conservation_areas', 'ticket_visitors', 'payments',
    'ticket_charge_items', 'conservation_areas',
    'map_legend_items', 'map_layers', 'map_datasets', 'datasets',
    'api_rate_limits', 'activity_logs', 'messages', 'message',
    'table_config', 'app_labels', 'app_cms',
    'gallery', 'news', 'staff',
    'budidaya', 'cold_chain', 'data_mitra', 'mitra', 'tangkap',
    'users'
  ]
  loop
    execute format('drop table if exists public.%I cascade', v_table);
  end loop;
end
$$;

drop function if exists public.handle_auth_user_change() cascade;
drop function if exists public.current_profile_role() cascade;
drop function if exists public.is_admin_or_partner() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.write_activity_log() cascade;
drop function if exists public.consume_api_rate_limit(text, integer, integer) cascade;
drop function if exists public.save_table_config(text, jsonb, jsonb) cascade;
drop function if exists public.replace_table_config_item(text, text, text, text) cascade;
drop function if exists public.get_data_table_page(text, jsonb, text, boolean, integer, integer) cascade;
drop function if exists public.get_distinct_filter_values(text, text) cascade;

-- Remove old application storage policies. Stored objects are not deleted.
do $$
declare
  v_policy record;
begin
  for v_policy in
    select policyname
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
  loop
    execute format(
      'drop policy if exists %I on storage.objects',
      v_policy.policyname
    );
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- User profiles
-- ---------------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  username text,
  email text,
  organization text,
  email_confirmed boolean not null default false,
  role text not null default 'user'
    check (role in ('admin', 'partner', 'user')),
  gender text,
  phone text,
  occupation text,
  image_path text
);

create unique index users_email_lower_uidx
  on public.users(lower(email)) where email is not null;
create index users_role_idx on public.users(role);

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  )
$$;

create function public.is_admin_or_partner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role in ('admin', 'partner')
  )
$$;

create function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid()
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_admin_or_partner() from public;
revoke all on function public.current_profile_role() from public;
grant execute on function public.is_admin(), public.is_admin_or_partner()
  to anon, authenticated, service_role;
grant execute on function public.current_profile_role() to authenticated;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create function public.handle_auth_user_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.users(
    id, email, username, organization, email_confirmed
  )
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'username', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'organization', '')), ''),
    new.email_confirmed_at is not null
  )
  on conflict(id) do update set
    email = excluded.email,
    username = coalesce(public.users.username, excluded.username),
    organization = coalesce(public.users.organization, excluded.organization),
    email_confirmed = excluded.email_confirmed,
    updated_at = now();
  return new;
end
$$;

create trigger on_auth_user_created_or_updated
after insert or update of email, email_confirmed_at, raw_user_meta_data
on auth.users
for each row execute function public.handle_auth_user_change();

insert into public.users(
  id, email, username, organization, email_confirmed, role
)
select
  auth_user.id,
  auth_user.email,
  nullif(trim(coalesce(auth_user.raw_user_meta_data ->> 'username', '')), ''),
  nullif(trim(coalesce(auth_user.raw_user_meta_data ->> 'organization', '')), ''),
  auth_user.email_confirmed_at is not null,
  coalesce(preserved.role, 'user')
from auth.users auth_user
left join preserved_user_roles preserved on preserved.id = auth_user.id;

-- ---------------------------------------------------------------------------
-- Retained App CMS
-- ---------------------------------------------------------------------------

create table public.app_cms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  component text not null check (
    component in (
      'navbar', 'footer', 'page_data', 'page_contact',
      'page_regulations', 'page_privacy', 'page_terms',
      'page_accessibility'
    )
  ),
  type text not null default 'text'
    check (type in ('text', 'textarea', 'number', 'image', 'icon')),
  target text not null,
  value text not null default '',
  locale text not null default 'id' check (locale in ('id', 'en')),
  is_active boolean not null default true,
  unique(component, target, locale)
);

create index app_cms_lookup_idx
  on public.app_cms(component, locale, is_active);

-- ---------------------------------------------------------------------------
-- Contact messages
-- ---------------------------------------------------------------------------

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 160),
  email text not null check (char_length(email) <= 320),
  phone text check (phone is null or char_length(phone) <= 40),
  message text not null check (char_length(message) between 1 and 5000),
  status text not null default 'new' check (status in ('new', 'read')),
  email_delivery_status text not null default 'not_attempted'
    check (
      email_delivery_status in ('not_attempted', 'pending', 'sent', 'failed')
    ),
  email_sent_at timestamptz,
  email_delivery_error text
);

create index messages_status_created_idx
  on public.messages(status, created_at desc);

-- ---------------------------------------------------------------------------
-- Tabular datasets
-- ---------------------------------------------------------------------------

create table public.datasets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  label text not null default 'Draft',
  slug text,
  kind text not null default 'dataset' check (kind = 'dataset'),
  data jsonb not null default '[]'::jsonb
    check (jsonb_typeof(data) = 'array'),
  column_config jsonb not null default '[]'::jsonb
    check (jsonb_typeof(column_config) = 'array'),
  chart_config jsonb,
  published_config jsonb,
  published text
    check (
      published is null
      or published in ('requested', 'approved', 'rejected')
    ),
  tag text[],
  description text,
  image_path text,
  source_name text,
  source_url text,
  license text,
  temporal_coverage text,
  geographic_coverage text,
  refresh_frequency text,
  last_data_update date,
  import_status text not null default 'ready'
    check (import_status in ('draft', 'ready', 'failed')),
  draft_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index datasets_slug_uidx
  on public.datasets(slug) where slug is not null;
create index datasets_owner_idx on public.datasets(user_id);
create index datasets_published_idx on public.datasets(published);
create index datasets_tag_gin_idx on public.datasets using gin(tag);
create index datasets_draft_cleanup_idx
  on public.datasets(draft_expires_at) where import_status = 'draft';

-- ---------------------------------------------------------------------------
-- Geospatial datasets
-- ---------------------------------------------------------------------------

create table public.map_datasets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  label text not null default 'Draft',
  slug text,
  original_filename text,
  geojson_size_bytes bigint not null default 0 check (geojson_size_bytes >= 0),
  geojson_feature_count integer not null default 0
    check (geojson_feature_count >= 0),
  bounds jsonb,
  map_config jsonb not null default '{}'::jsonb
    check (jsonb_typeof(map_config) = 'object'),
  documents_path jsonb not null default '[]'::jsonb
    check (jsonb_typeof(documents_path) = 'array'),
  pictures_path jsonb not null default '[]'::jsonb
    check (jsonb_typeof(pictures_path) = 'array'),
  published text
    check (
      published is null
      or published in ('requested', 'approved', 'rejected')
    ),
  tag text[],
  description text,
  image_path text,
  source_name text,
  source_url text,
  license text,
  temporal_coverage text,
  geographic_coverage text,
  refresh_frequency text,
  last_data_update date,
  import_status text not null default 'ready'
    check (import_status in ('draft', 'ready', 'failed')),
  draft_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index map_datasets_slug_uidx
  on public.map_datasets(slug) where slug is not null;
create index map_datasets_owner_idx on public.map_datasets(user_id);
create index map_datasets_published_idx on public.map_datasets(published);
create index map_datasets_tag_gin_idx on public.map_datasets using gin(tag);
create index map_datasets_draft_cleanup_idx
  on public.map_datasets(draft_expires_at) where import_status = 'draft';

create table public.map_layers (
  id uuid primary key default gen_random_uuid(),
  map_dataset_id uuid not null
    references public.map_datasets(id) on delete cascade,
  name text not null,
  geometry_type text not null
    check (geometry_type in ('polygon', 'polyline', 'point', 'mixed')),
  source_path text,
  feature_count integer not null default 0 check (feature_count >= 0),
  property_keys text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index map_layers_dataset_order_idx
  on public.map_layers(map_dataset_id, sort_order);

create table public.map_legend_items (
  id uuid primary key default gen_random_uuid(),
  map_layer_id uuid not null references public.map_layers(id) on delete cascade,
  value text not null,
  label text not null,
  geometry_type text not null
    check (geometry_type in ('polygon', 'polyline', 'point')),
  color text,
  fill_color text,
  stroke_color text,
  stroke_width numeric,
  fill_opacity numeric,
  fill_pattern text check (
    fill_pattern is null
    or fill_pattern in (
      'none', 'diagonal', 'reverse-diagonal', 'crosshatch',
      'horizontal', 'vertical', 'dots'
    )
  ),
  pattern_color text,
  pattern_thickness numeric,
  pattern_opacity numeric,
  pattern_gap numeric,
  icon_path text,
  icon_width numeric,
  icon_height numeric,
  visible_by_default boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index map_legend_layer_order_idx
  on public.map_legend_items(map_layer_id, sort_order);

-- ---------------------------------------------------------------------------
-- Audit and API rate limiting
-- ---------------------------------------------------------------------------

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object')
);

create index activity_logs_created_idx
  on public.activity_logs(created_at desc);
create index activity_logs_actor_idx
  on public.activity_logs(actor_id);
create index activity_logs_entity_idx
  on public.activity_logs(entity_type, entity_id);

create table public.api_rate_limits (
  scope text not null,
  identifier_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  expires_at timestamptz not null,
  primary key(scope, identifier_hash, window_started_at)
);

create index api_rate_limits_expiry_idx
  on public.api_rate_limits(expires_at);

create function public.consume_api_rate_limit(
  p_limit_key text,
  p_request_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window timestamptz;
  v_count integer;
begin
  if p_request_limit < 1 or p_window_seconds < 1 or p_limit_key is null then
    raise exception 'Invalid rate-limit arguments';
  end if;
  v_window := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );
  insert into public.api_rate_limits(
    scope, identifier_hash, window_started_at, request_count, expires_at
  )
  values (
    'api', p_limit_key, v_window, 1,
    v_window + make_interval(secs => p_window_seconds)
  )
  on conflict(scope, identifier_hash, window_started_at)
  do update set request_count = public.api_rate_limits.request_count + 1
  returning request_count into v_count;
  return v_count <= p_request_limit;
end
$$;

revoke all on function public.consume_api_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer)
  to service_role;

create function public.write_activity_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record jsonb;
  v_id uuid;
begin
  v_record := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_id := nullif(v_record ->> 'id', '')::uuid;
  insert into public.activity_logs(
    actor_id, action, entity_type, entity_id, metadata
  )
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    v_id,
    jsonb_build_object(
      'changed_at', now(),
      'record_label',
      coalesce(
        v_record ->> 'label',
        v_record ->> 'name',
        v_record ->> 'username',
        v_record ->> 'target'
      )
    )
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'users', 'app_cms', 'messages', 'datasets',
    'map_datasets', 'map_layers', 'map_legend_items'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()',
      v_table
    );
    execute format(
      'create trigger write_activity_log
       after insert or update or delete on public.%I
       for each row execute function public.write_activity_log()',
      v_table
    );
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.app_cms enable row level security;
alter table public.messages enable row level security;
alter table public.datasets enable row level security;
alter table public.map_datasets enable row level security;
alter table public.map_layers enable row level security;
alter table public.map_legend_items enable row level security;
alter table public.activity_logs enable row level security;
alter table public.api_rate_limits enable row level security;

create policy "users read own profile or admins read all"
on public.users for select to authenticated
using (id = auth.uid() or public.is_admin());

create policy "users update own profile or admins update all"
on public.users for update to authenticated
using (id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or (id = auth.uid() and role = public.current_profile_role())
);

revoke update on public.users from authenticated;
grant select on public.users to authenticated;
grant update(
  username, organization, gender, phone, occupation, image_path, role
)
  on public.users to authenticated;

create policy "public read app cms"
on public.app_cms for select to anon, authenticated using (true);
create policy "admins manage app cms"
on public.app_cms for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "admins manage messages"
on public.messages for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "read approved or owned datasets"
on public.datasets for select to anon, authenticated
using (
  published = 'approved'
  or user_id = auth.uid()
  or public.is_admin()
);
create policy "partners create datasets"
on public.datasets for insert to authenticated
with check (
  user_id = auth.uid()
  and public.is_admin_or_partner()
  and (public.is_admin() or published is null or published = 'requested')
);
create policy "owners update datasets"
on public.datasets for update to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or (
    user_id = auth.uid()
    and public.is_admin_or_partner()
    and (published is null or published = 'requested')
  )
);
create policy "owners delete datasets"
on public.datasets for delete to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "read approved or owned map datasets"
on public.map_datasets for select to anon, authenticated
using (
  published = 'approved'
  or user_id = auth.uid()
  or public.is_admin()
);
create policy "partners create map datasets"
on public.map_datasets for insert to authenticated
with check (
  user_id = auth.uid()
  and public.is_admin_or_partner()
  and (public.is_admin() or published is null or published = 'requested')
);
create policy "owners update map datasets"
on public.map_datasets for update to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or (
    user_id = auth.uid()
    and public.is_admin_or_partner()
    and (published is null or published = 'requested')
  )
);
create policy "owners delete map datasets"
on public.map_datasets for delete to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "read accessible map layers"
on public.map_layers for select to anon, authenticated
using (
  exists (
    select 1 from public.map_datasets d
    where d.id = map_dataset_id
      and (
        d.published = 'approved'
        or d.user_id = auth.uid()
        or public.is_admin()
      )
  )
);
create policy "owners manage map layers"
on public.map_layers for all to authenticated
using (
  exists (
    select 1 from public.map_datasets d
    where d.id = map_dataset_id
      and (d.user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.map_datasets d
    where d.id = map_dataset_id
      and (d.user_id = auth.uid() or public.is_admin())
  )
);

create policy "read accessible map legends"
on public.map_legend_items for select to anon, authenticated
using (
  exists (
    select 1
    from public.map_layers l
    join public.map_datasets d on d.id = l.map_dataset_id
    where l.id = map_layer_id
      and (
        d.published = 'approved'
        or d.user_id = auth.uid()
        or public.is_admin()
      )
  )
);
create policy "owners manage map legends"
on public.map_legend_items for all to authenticated
using (
  exists (
    select 1
    from public.map_layers l
    join public.map_datasets d on d.id = l.map_dataset_id
    where l.id = map_layer_id
      and (d.user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.map_layers l
    join public.map_datasets d on d.id = l.map_dataset_id
    where l.id = map_layer_id
      and (d.user_id = auth.uid() or public.is_admin())
  )
);

create policy "admins read activity logs"
on public.activity_logs for select to authenticated
using (public.is_admin());

-- Explicit API privileges; RLS remains the authorization boundary.
grant select on public.app_cms to anon, authenticated;
grant insert, update, delete on public.app_cms to authenticated;
grant select, insert, update, delete on public.messages to authenticated;
grant select on public.datasets, public.map_datasets,
  public.map_layers, public.map_legend_items to anon, authenticated;
grant insert, update, delete on public.datasets, public.map_datasets,
  public.map_layers, public.map_legend_items to authenticated;
grant select on public.activity_logs to authenticated;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets(
  id, name, public, file_size_limit, allowed_mime_types
)
values
  (
    'images', 'images', true, 10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'geojsons', 'geojsons', false, 52428800,
    array['application/json', 'application/geo+json', 'text/plain', 'text/csv']
  ),
  (
    'documents', 'documents', true, 20971520,
    array['application/pdf', 'image/jpeg', 'image/png']
  )
on conflict(id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "public view public data assets"
on storage.objects for select to anon, authenticated
using (bucket_id in ('images', 'documents'));

create policy "read accessible geojsons"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'geojsons'
  and exists (
    select 1
    from public.map_layers l
    join public.map_datasets d on d.id = l.map_dataset_id
    where l.source_path = storage.objects.name
      and (
        d.published = 'approved'
        or d.user_id = auth.uid()
        or public.is_admin()
      )
  )
);

create policy "data managers upload owned assets"
on storage.objects for insert to authenticated
with check (
  bucket_id in ('images', 'geojsons', 'documents')
  and public.is_admin_or_partner()
  and (public.is_admin() or owner_id = auth.uid()::text)
);
create policy "data managers update owned assets"
on storage.objects for update to authenticated
using (
  bucket_id in ('images', 'geojsons', 'documents')
  and public.is_admin_or_partner()
  and (public.is_admin() or owner_id = auth.uid()::text)
)
with check (
  bucket_id in ('images', 'geojsons', 'documents')
  and public.is_admin_or_partner()
  and (public.is_admin() or owner_id = auth.uid()::text)
);
create policy "data managers delete owned assets"
on storage.objects for delete to authenticated
using (
  bucket_id in ('images', 'geojsons', 'documents')
  and public.is_admin_or_partner()
  and (public.is_admin() or owner_id = auth.uid()::text)
);

-- ---------------------------------------------------------------------------
-- Retained CMS seed
-- ---------------------------------------------------------------------------

insert into public.app_cms(component, type, target, value, locale)
values
  ('navbar', 'image', 'nav_org_logo', '/assets/logo_malut.png', 'id'),
  ('navbar', 'text', 'nav_org_name_main', 'Platform Data DKP', 'id'),
  ('navbar', 'text', 'nav_org_name_sub', 'Provinsi Maluku Utara', 'id'),
  ('navbar', 'text', 'nav_menu_data', 'Data', 'id'),
  ('navbar', 'text', 'nav_menu_contact', 'Kontak', 'id'),
  ('navbar', 'text', 'nav_menu_regulations', 'Peraturan', 'id'),
  ('navbar', 'text', 'nav_menu_login', 'Masuk', 'id'),
  ('navbar', 'text', 'nav_menu_profile', 'Dashboard', 'id'),
  ('navbar', 'text', 'nav_menu_logout', 'Keluar', 'id'),
  ('footer', 'text', 'footer_title', 'Platform Data DKP Maluku Utara', 'id'),
  ('footer', 'textarea', 'footer_description', 'Akses data kelautan dan perikanan yang transparan dan terkelola.', 'id'),
  ('footer', 'text', 'footer_copyright', 'Pemerintah Provinsi Maluku Utara', 'id'),
  ('page_data', 'text', 'page_data_title', 'Data', 'id'),
  ('page_data', 'textarea', 'page_data_subtitle', 'Jelajahi dataset kelautan dan perikanan Maluku Utara.', 'id'),
  ('page_contact', 'text', 'page_contact_title', 'Kontak', 'id'),
  ('page_contact', 'textarea', 'page_contact_subtitle', 'Hubungi pengelola platform data.', 'id'),
  ('page_regulations', 'text', 'page_regulations_title', 'Peraturan', 'id'),
  ('page_regulations', 'textarea', 'page_regulations_subtitle', 'Kebijakan dan tata kelola platform data.', 'id'),
  ('page_regulations', 'text', 'page_regulations_section_1_title', 'Kebijakan pengelolaan data', 'id'),
  ('page_regulations', 'textarea', 'page_regulations_section_1_content', 'Dokumen dan ketentuan pengelolaan data diterbitkan oleh pengelola.', 'id'),
  ('page_privacy', 'text', 'page_privacy_title', 'Kebijakan Privasi', 'id'),
  ('page_terms', 'text', 'page_terms_title', 'Syarat dan Ketentuan', 'id'),
  ('page_accessibility', 'text', 'page_accessibility_title', 'Aksesibilitas', 'id'),
  ('navbar', 'image', 'nav_org_logo', '/assets/logo_malut.png', 'en'),
  ('navbar', 'text', 'nav_org_name_main', 'DKP Data Platform', 'en'),
  ('navbar', 'text', 'nav_org_name_sub', 'North Maluku Province', 'en'),
  ('navbar', 'text', 'nav_menu_data', 'Data', 'en'),
  ('navbar', 'text', 'nav_menu_contact', 'Contact', 'en'),
  ('navbar', 'text', 'nav_menu_regulations', 'Regulations', 'en'),
  ('navbar', 'text', 'nav_menu_login', 'Sign in', 'en'),
  ('navbar', 'text', 'nav_menu_profile', 'Dashboard', 'en'),
  ('navbar', 'text', 'nav_menu_logout', 'Sign out', 'en'),
  ('footer', 'text', 'footer_title', 'North Maluku DKP Data Platform', 'en'),
  ('footer', 'textarea', 'footer_description', 'Transparent and managed access to marine and fisheries data.', 'en'),
  ('footer', 'text', 'footer_copyright', 'North Maluku Provincial Government', 'en'),
  ('page_data', 'text', 'page_data_title', 'Data', 'en'),
  ('page_data', 'textarea', 'page_data_subtitle', 'Explore North Maluku marine and fisheries datasets.', 'en'),
  ('page_contact', 'text', 'page_contact_title', 'Contact', 'en'),
  ('page_contact', 'textarea', 'page_contact_subtitle', 'Contact the data platform administrator.', 'en'),
  ('page_regulations', 'text', 'page_regulations_title', 'Regulations', 'en'),
  ('page_privacy', 'text', 'page_privacy_title', 'Privacy Policy', 'en'),
  ('page_terms', 'text', 'page_terms_title', 'Terms and Conditions', 'en'),
  ('page_accessibility', 'text', 'page_accessibility_title', 'Accessibility', 'en');

-- Contact admin dashboard uses realtime updates.
alter publication supabase_realtime add table public.messages;

commit;
