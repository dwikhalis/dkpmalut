begin;

with organization_content(locale, target, value, type) as (
  values
    ('id', 'page_organization_eyebrow', 'Tentang Kami', 'text'),
    ('id', 'page_organization_title', 'UPTD BLUD Kawasan Konservasi Perairan Daerah', 'text'),
    ('id', 'page_organization_subtitle', 'Unit Pelaksana Teknis Daerah (UPTD) Badan Layanan Umum Daerah (BLUD) Kawasan Konservasi Perairan Daerah (KKPD) Provinsi Maluku Utara.', 'textarea'),
    ('id', 'page_organization_updated', '', 'text'),
    ('id', 'page_organization_section_title_1', 'Siapa Kami', 'text'),
    ('id', 'page_organization_section_content_1', E'UPTD BLUD Kawasan Konservasi Perairan Daerah merupakan unit layanan yang mendukung pengelolaan kawasan konservasi perairan di Provinsi Maluku Utara.\n\nMelalui portal ini, masyarakat dapat mengenal kawasan konservasi, mempelajari dokumen dan data pendukung, memperoleh informasi kunjungan, serta menggunakan layanan tiket yang tersedia.\n\nKami mendorong akses informasi yang lebih mudah dan kunjungan yang bertanggung jawab agar pemanfaatan kawasan berjalan selaras dengan upaya menjaga lingkungan perairan Maluku Utara.', 'textarea'),
    ('id', 'page_organization_section_title_2', 'Nama Singkat', 'text'),
    ('id', 'page_organization_section_content_2', 'UPTD BLUD Kawasan Konservasi Perairan Daerah', 'textarea'),
    ('id', 'page_organization_section_title_3', 'Wilayah Layanan', 'text'),
    ('id', 'page_organization_section_content_3', 'Kawasan konservasi perairan daerah di Provinsi Maluku Utara.', 'textarea'),
    ('id', 'page_organization_focus_eyebrow', 'Fokus Layanan', 'text'),
    ('id', 'page_organization_focus_title', 'Informasi dan layanan dalam satu portal', 'text'),
    ('id', 'page_organization_focus_item_title_1', 'Informasi Kawasan', 'text'),
    ('id', 'page_organization_focus_item_description_1', 'Menyediakan informasi mengenai kawasan konservasi, zonasi, dan dokumen rujukan yang dapat diakses masyarakat.', 'textarea'),
    ('id', 'page_organization_focus_item_title_2', 'Layanan Kunjungan', 'text'),
    ('id', 'page_organization_focus_item_description_2', 'Mendukung perencanaan kunjungan melalui informasi tarif, pemesanan tiket, dan verifikasi tiket digital.', 'textarea'),
    ('id', 'page_organization_focus_item_title_3', 'Data dan Edukasi', 'text'),
    ('id', 'page_organization_focus_item_description_3', 'Menghadirkan data serta materi informasi untuk meningkatkan pemahaman tentang pengelolaan kawasan konservasi.', 'textarea'),
    ('id', 'page_organization_cta_eyebrow', 'Tim Kami', 'text'),
    ('id', 'page_organization_cta_title', 'Kenali staf UPTD BLUD KKPD', 'text'),
    ('id', 'page_organization_cta_content', 'Lihat daftar staf berdasarkan bidang dan peran dalam organisasi.', 'textarea'),
    ('id', 'page_organization_cta_button_1_label', 'Lihat Daftar Staf', 'text'),
    ('id', 'page_organization_cta_button_1_path', '/organisasi/staff', 'text'),

    ('en', 'page_organization_eyebrow', 'About Us', 'text'),
    ('en', 'page_organization_title', 'UPTD BLUD Regional Marine Conservation Areas', 'text'),
    ('en', 'page_organization_subtitle', 'The Regional Technical Implementation Unit (UPTD), Regional Public Service Agency (BLUD), for Regional Marine Conservation Areas (KKPD) of North Maluku Province.', 'textarea'),
    ('en', 'page_organization_updated', '', 'text'),
    ('en', 'page_organization_section_title_1', 'Who We Are', 'text'),
    ('en', 'page_organization_section_content_1', E'UPTD BLUD Regional Marine Conservation Areas is a service unit that supports the management of marine conservation areas in North Maluku Province.\n\nThrough this portal, the public can discover conservation areas, review supporting documents and data, find visitor information, and use the available ticketing services.\n\nWe promote accessible information and responsible visits so that the use of conservation areas remains aligned with protecting North Maluku''s marine environment.', 'textarea'),
    ('en', 'page_organization_section_title_2', 'Short Name', 'text'),
    ('en', 'page_organization_section_content_2', 'UPTD BLUD Regional Marine Conservation Areas', 'textarea'),
    ('en', 'page_organization_section_title_3', 'Service Area', 'text'),
    ('en', 'page_organization_section_content_3', 'Regional marine conservation areas in North Maluku Province.', 'textarea'),
    ('en', 'page_organization_focus_eyebrow', 'Service Focus', 'text'),
    ('en', 'page_organization_focus_title', 'Information and services in one portal', 'text'),
    ('en', 'page_organization_focus_item_title_1', 'Area Information', 'text'),
    ('en', 'page_organization_focus_item_description_1', 'Provides public information about conservation areas, zoning, and reference documents.', 'textarea'),
    ('en', 'page_organization_focus_item_title_2', 'Visitor Services', 'text'),
    ('en', 'page_organization_focus_item_description_2', 'Supports visit planning through rate information, ticket booking, and digital ticket verification.', 'textarea'),
    ('en', 'page_organization_focus_item_title_3', 'Data and Education', 'text'),
    ('en', 'page_organization_focus_item_description_3', 'Presents data and information that improve understanding of conservation-area management.', 'textarea'),
    ('en', 'page_organization_cta_eyebrow', 'Our Team', 'text'),
    ('en', 'page_organization_cta_title', 'Meet the UPTD BLUD KKPD staff', 'text'),
    ('en', 'page_organization_cta_content', 'View staff members by their organizational area and role.', 'textarea'),
    ('en', 'page_organization_cta_button_1_label', 'View Staff List', 'text'),
    ('en', 'page_organization_cta_button_1_path', '/organisasi/staff', 'text')
)
insert into public.app_cms (component, type, target, value, locale, is_active)
select 'page_organization', type, target, value, locale, true
from organization_content
where not exists (
  select 1
  from public.app_cms as existing
  where existing.component = 'page_organization'
    and existing.target = organization_content.target
    and existing.locale = organization_content.locale
);

commit;
