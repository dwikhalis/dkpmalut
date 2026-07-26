begin;

with localized_content(locale, content) as (
  values
    (
      'id',
      $json$
      {
        "hero_eyebrow": "Kawasan Konservasi Maluku Utara",
        "hero_title": "Jelajahi Laut, Jaga Kehidupan",
        "hero_subtitle": "Temukan kawasan konservasi dan wisata bahari Maluku Utara. Berkunjung dengan bijak, menikmati alam, dan ikut menjaga laut untuk generasi mendatang.",
        "hero_button_label": "Jelajahi Kawasan",
        "hero_button_path": "/explore",
        "hero_secondary_button_label": "Beli Tiket",
        "hero_secondary_button_path": "/payment",
        "hero_image_desktop": "icon_images/icon_conservation_tourism.png",
        "hero_image_mobile": "icon_images/icon_conservation_island.png"
      }
      $json$::jsonb
    ),
    (
      'en',
      $json$
      {
        "hero_eyebrow": "North Maluku Conservation Areas",
        "hero_title": "Explore the Ocean, Protect Its Life",
        "hero_subtitle": "Discover North Maluku's marine conservation areas and coastal destinations. Visit responsibly, experience nature, and help protect the ocean for future generations.",
        "hero_button_label": "Explore Conservation Areas",
        "hero_button_path": "/explore",
        "hero_secondary_button_label": "Buy a Ticket",
        "hero_secondary_button_path": "/payment",
        "hero_image_desktop": "icon_images/icon_conservation_tourism.png",
        "hero_image_mobile": "icon_images/icon_conservation_island.png"
      }
      $json$::jsonb
    )
),
hero_seed as (
  select
    'hero'::text as component,
    entry.key::text as target,
    entry.value::text as value,
    localized_content.locale::text as locale,
    case
      when entry.key = 'hero_subtitle' then 'textarea'
      when entry.key in ('hero_image_desktop', 'hero_image_mobile') then 'image'
      else 'text'
    end::text as type
  from localized_content
  cross join lateral jsonb_each_text(localized_content.content) as entry
),
conservation_content(locale, content) as (
  values
    (
      'id',
      $json$
      {
        "sectionconservation_eyebrow": "Konservasi & Pariwisata Bahari",
        "sectionconservation_title": "Jelajahi keindahan laut, ikut menjaganya",
        "sectionconservation_subtitle": "Setiap kunjungan adalah kesempatan untuk mengenal, menghargai, dan mendukung kelestarian kawasan konservasi Maluku Utara.",
        "sectionconservation_pillar_title_1": "Kawasan Konservasi",
        "sectionconservation_pillar_description_1": "Jelajahi enam kawasan konservasi Maluku Utara beserta lokasi, peta zonasi, dan dokumen rujukannya.",
        "sectionconservation_pillar_title_2": "Peraturan & Dokumen",
        "sectionconservation_pillar_description_2": "Baca keputusan penetapan kawasan serta dokumen Rencana Pengelolaan dan Zonasi sebagai rujukan resmi.",
        "sectionconservation_pillar_title_3": "Data Kelautan & Perikanan",
        "sectionconservation_pillar_description_3": "Telusuri data kawasan konservasi serta dataset kelautan dan perikanan Maluku Utara yang telah dipublikasikan.",
        "sectionconservation_pillar_title_4": "FAQ Layanan",
        "sectionconservation_pillar_description_4": "Temukan jawaban atas pertanyaan umum tentang layanan, tiket, dan kunjungan ke kawasan konservasi.",
        "sectionconservation_journey_eyebrow": "Rencanakan Kunjungan",
        "sectionconservation_journey_title": "Dari kawasan hingga tiket",
        "sectionconservation_step_title_1": "Pilih Kawasan",
        "sectionconservation_step_description_1": "Temukan pulau dan kawasan konservasi yang ingin Anda kunjungi.",
        "sectionconservation_step_title_2": "Lihat Tarif",
        "sectionconservation_step_description_2": "Periksa tarif setiap kawasan dan cara total biaya kunjungan dihitung.",
        "sectionconservation_step_title_3": "Beli Tiket",
        "sectionconservation_step_description_3": "Pesan tiket kawasan secara aman melalui layanan digital.",
        "sectionconservation_step_title_4": "Masuk ke Akun",
        "sectionconservation_step_description_4": "Masuk dengan email dan kata sandi untuk mengakses akun Anda."
      }
      $json$::jsonb
    ),
    (
      'en',
      $json$
      {
        "sectionconservation_eyebrow": "Marine Conservation & Tourism",
        "sectionconservation_title": "Explore the ocean, help protect it",
        "sectionconservation_subtitle": "Every visit is an opportunity to understand, respect, and support North Maluku's marine conservation areas.",
        "sectionconservation_pillar_title_1": "Conservation Areas",
        "sectionconservation_pillar_description_1": "Explore North Maluku's six conservation areas, including their locations, zoning maps, and reference documents.",
        "sectionconservation_pillar_title_2": "Regulations & Documents",
        "sectionconservation_pillar_description_2": "Read area-designation decisions and Management and Zoning Plan documents provided as official references.",
        "sectionconservation_pillar_title_3": "Marine & Fisheries Data",
        "sectionconservation_pillar_description_3": "Browse published conservation-area, marine, and fisheries datasets for North Maluku.",
        "sectionconservation_pillar_title_4": "Service FAQ",
        "sectionconservation_pillar_description_4": "Find answers to common questions about services, tickets, and conservation-area visits.",
        "sectionconservation_journey_eyebrow": "Plan Your Visit",
        "sectionconservation_journey_title": "From destination to ticket",
        "sectionconservation_step_title_1": "Choose an Area",
        "sectionconservation_step_description_1": "Find the island and conservation area you want to visit.",
        "sectionconservation_step_title_2": "Review Rates",
        "sectionconservation_step_description_2": "Check each area's admission rate and how the total visit cost is calculated.",
        "sectionconservation_step_title_3": "Buy a Ticket",
        "sectionconservation_step_description_3": "Book your conservation-area ticket securely online.",
        "sectionconservation_step_title_4": "Sign In",
        "sectionconservation_step_description_4": "Sign in with your email and password to access your account."
      }
      $json$::jsonb
    )
),
conservation_seed as (
  select
    'sectionconservation'::text as component,
    entry.key::text as target,
    entry.value::text as value,
    conservation_content.locale::text as locale,
    case
      when entry.key like '%description%' or entry.key = 'sectionconservation_subtitle'
      then 'textarea'
      else 'text'
    end::text as type
  from conservation_content
  cross join lateral jsonb_each_text(conservation_content.content) as entry
),
statistics_content(locale, content) as (
  values
    (
      'id',
      $json$
      {
        "sectwo_eyebrow": "Dampak yang Terukur",
        "sectwo_title": "Konservasi untuk laut dan masyarakat",
        "sectwo_subtitle": "Data menjadi dasar pengelolaan kawasan, perlindungan ekosistem, dan penguatan ekonomi biru Maluku Utara."
      }
      $json$::jsonb
    ),
    (
      'en',
      $json$
      {
        "sectwo_eyebrow": "Measurable Impact",
        "sectwo_title": "Conservation for oceans and communities",
        "sectwo_subtitle": "Data supports conservation management, ecosystem protection, and a stronger blue economy across North Maluku."
      }
      $json$::jsonb
    )
),
statistics_seed as (
  select
    'sectwo'::text as component,
    entry.key::text as target,
    entry.value::text as value,
    statistics_content.locale::text as locale,
    case when entry.key = 'sectwo_subtitle' then 'textarea' else 'text' end::text as type
  from statistics_content
  cross join lateral jsonb_each_text(statistics_content.content) as entry
),
seed as (
  select * from hero_seed
  union all
  select * from conservation_seed
  union all
  select * from statistics_seed
),
updated as (
  update public.app_cms as cms
  set value = seed.value, type = seed.type, is_active = true
  from seed
  where cms.component = seed.component
    and cms.target = seed.target
    and cms.locale = seed.locale
  returning cms.component, cms.target, cms.locale
)
insert into public.app_cms (component, type, target, value, locale, is_active)
select seed.component, seed.type, seed.target, seed.value, seed.locale, true
from seed
where not exists (
  select 1
  from public.app_cms as existing
  where existing.component = seed.component
    and existing.target = seed.target
    and existing.locale = seed.locale
);

-- Eyebrows provide a consistent visual cue across supporting sections.
with eyebrow_content(locale, content) as (
  values
    (
      'id',
      $json$
      {
        "secthree|secthree_eyebrow": "Cerita dari Pesisir",
        "secfour|secfour_eyebrow": "Lihat Lebih Dekat",
        "secsix|secsix_eyebrow": "Panduan Pengunjung",
        "secone|secone_eyebrow": "Penggerak Konservasi",
        "secfive|secfive_eyebrow": "Terhubung dengan Kami"
      }
      $json$::jsonb
    ),
    (
      'en',
      $json$
      {
        "secthree|secthree_eyebrow": "Stories from the Coast",
        "secfour|secfour_eyebrow": "Take a Closer Look",
        "secsix|secsix_eyebrow": "Visitor Guide",
        "secone|secone_eyebrow": "Conservation Leadership",
        "secfive|secfive_eyebrow": "Connect with Us"
      }
      $json$::jsonb
    )
),
eyebrow_seed as (
  select
    split_part(entry.key, '|', 1) as component,
    split_part(entry.key, '|', 2) as target,
    entry.value as value,
    eyebrow_content.locale,
    'text'::text as type
  from eyebrow_content
  cross join lateral jsonb_each_text(eyebrow_content.content) as entry
),
updated_eyebrows as (
  update public.app_cms as cms
  set value = eyebrow_seed.value, type = eyebrow_seed.type, is_active = true
  from eyebrow_seed
  where cms.component = eyebrow_seed.component
    and cms.target = eyebrow_seed.target
    and cms.locale = eyebrow_seed.locale
  returning cms.component, cms.target, cms.locale
)
insert into public.app_cms (component, type, target, value, locale, is_active)
select component, type, target, value, locale, true
from eyebrow_seed
where not exists (
  select 1
  from public.app_cms as existing
  where existing.component = eyebrow_seed.component
    and existing.target = eyebrow_seed.target
    and existing.locale = eyebrow_seed.locale
);

-- Keep the homepage focused: use the first three populated statistics only.
update public.app_cms
set is_active = false
where component = 'sectwo'
  and locale in ('id', 'en')
  and target ~ '^sectwo_(icon_path|tab_num|tab_num_suffix|tab_title|tab_subtitle)_[4-6]$';

-- Prefer one concise supporting line in news and gallery headings.
update public.app_cms
set is_active = false
where locale in ('id', 'en')
  and (
    (component = 'secthree' and target = 'secthree_subtitle_1')
    or (component = 'secfour' and target = 'secfour_subtitle_1')
  );

-- The homepage is visitor-focused. Organization and office/map content remain
-- available in App CMS and on their dedicated pages, but are hidden by default
-- from the homepage. Reactivate any row in App CMS to restore the section.
update public.app_cms
set is_active = false
where locale in ('id', 'en')
  and component in ('secone', 'secfive');

-- Ensure primary visitor actions remain available.
update public.app_cms
set is_active = true
where locale in ('id', 'en')
  and (
    (component = 'hero' and target in (
      'hero_eyebrow', 'hero_title', 'hero_subtitle',
      'hero_button_label', 'hero_button_path',
      'hero_secondary_button_label', 'hero_secondary_button_path',
      'hero_image_desktop', 'hero_image_mobile'
    ))
    or component = 'sectionconservation'
    or (component = 'sectwo' and target in (
      'sectwo_eyebrow', 'sectwo_title', 'sectwo_subtitle'
    ))
  );

commit;
