begin;

alter table public.app_cms
  drop constraint if exists app_cms_component_check;

alter table public.app_cms
  add constraint app_cms_component_check check (
    component in (
      'navbar', 'footer', 'hero', 'page_data', 'page_contact',
      'page_regulations', 'page_privacy', 'page_terms',
      'page_accessibility'
    )
  );

insert into public.app_cms(component, type, target, value, locale)
values
  ('navbar', 'text', 'nav_menu_home', 'Beranda', 'id'),
  ('navbar', 'text', 'nav_menu_loggedin', 'Akun', 'id'),
  ('navbar', 'text', 'nav_menu_home', 'Home', 'en'),
  ('navbar', 'text', 'nav_menu_loggedin', 'Account', 'en'),
  ('hero', 'text', 'hero_eyebrow', 'Satu Data Kelautan dan Perikanan', 'id'),
  ('hero', 'text', 'hero_title', 'Data Laut Maluku Utara dalam Satu Platform', 'id'),
  ('hero', 'textarea', 'hero_subtitle', 'Akses data perikanan tangkap, budidaya, rantai dingin, dan informasi spasial yang terbuka, terukur, dan mudah dipahami.', 'id'),
  ('hero', 'text', 'hero_button_label', 'Jelajahi Data', 'id'),
  ('hero', 'text', 'hero_button_path', '/data', 'id'),
  ('hero', 'text', 'hero_secondary_button_label', 'Hubungi Kami', 'id'),
  ('hero', 'text', 'hero_secondary_button_path', '/kontak', 'id'),
  ('hero', 'image', 'hero_image_desktop', '/assets/hero_1.png', 'id'),
  ('hero', 'image', 'hero_image_mobile', '/assets/hero_1.png', 'id'),
  ('hero', 'text', 'hero_eyebrow', 'Integrated Marine and Fisheries Data', 'en'),
  ('hero', 'text', 'hero_title', 'North Maluku Marine Data in One Platform', 'en'),
  ('hero', 'textarea', 'hero_subtitle', 'Access capture fisheries, aquaculture, cold-chain, and spatial information through one open and accessible platform.', 'en'),
  ('hero', 'text', 'hero_button_label', 'Explore Data', 'en'),
  ('hero', 'text', 'hero_button_path', '/data', 'en'),
  ('hero', 'text', 'hero_secondary_button_label', 'Contact Us', 'en'),
  ('hero', 'text', 'hero_secondary_button_path', '/kontak', 'en'),
  ('hero', 'image', 'hero_image_desktop', '/assets/hero_1.png', 'en'),
  ('hero', 'image', 'hero_image_mobile', '/assets/hero_1.png', 'en'),
  ('footer', 'image', 'footer_org_logo', '/assets/logo_malut.png', 'id'),
  ('footer', 'text', 'footer_org_name_main', 'Platform Data DKP', 'id'),
  ('footer', 'text', 'footer_org_name_sub', 'Provinsi Maluku Utara', 'id'),
  ('footer', 'text', 'footer_tab_title_1', 'Platform', 'id'),
  ('footer', 'text', 'footer_tab_title_2', 'Informasi', 'id'),
  ('footer', 'text', 'footer_tab_title_3', 'Akun', 'id'),
  ('footer', 'text', 'footer_copyright_title', 'Pemerintah Provinsi Maluku Utara', 'id'),
  ('footer', 'image', 'footer_org_logo', '/assets/logo_malut.png', 'en'),
  ('footer', 'text', 'footer_org_name_main', 'DKP Data Platform', 'en'),
  ('footer', 'text', 'footer_org_name_sub', 'North Maluku Province', 'en'),
  ('footer', 'text', 'footer_tab_title_1', 'Platform', 'en'),
  ('footer', 'text', 'footer_tab_title_2', 'Information', 'en'),
  ('footer', 'text', 'footer_tab_title_3', 'Account', 'en'),
  ('footer', 'text', 'footer_copyright_title', 'Government of North Maluku Province', 'en')
on conflict(component, target, locale) do update set
  type = excluded.type,
  value = excluded.value,
  updated_at = now();

commit;
