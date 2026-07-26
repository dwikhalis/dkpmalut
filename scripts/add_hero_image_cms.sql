begin;

with hero_images(locale, target, value) as (
  values
    ('id', 'hero_image_desktop', 'icon_images/icon_conservation_tourism.png'),
    ('id', 'hero_image_mobile', 'icon_images/icon_conservation_island.png'),
    ('en', 'hero_image_desktop', 'icon_images/icon_conservation_tourism.png'),
    ('en', 'hero_image_mobile', 'icon_images/icon_conservation_island.png')
)
insert into public.app_cms (component, type, target, value, locale, is_active)
select 'hero', 'image', target, value, locale, true
from hero_images
where not exists (
  select 1
  from public.app_cms as existing
  where existing.component = 'hero'
    and existing.target = hero_images.target
    and existing.locale = hero_images.locale
);

commit;
