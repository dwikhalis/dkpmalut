export type ConservationDocument = {
  label: string;
  title: string;
  href: string;
  kind: "kepmen" | "rpz";
};

export type ConservationZone = {
  slug: string;
  shortName: string;
  officialName: string;
  category: string;
  location: string;
  summary: string;
  area: string;
  ecosystems: string[];
  keyFeatures: string[];
  zoning: string;
  zoningDetails: {
    name: string;
    area: string;
    percentage: string;
    purpose: string;
  }[];
  mapImage: string;
  documents: ConservationDocument[];
};

export const conservationZones: ConservationZone[] = [
  {
    slug: "widi",
    shortName: "Kepulauan Widi",
    officialName: "Kawasan Konservasi di Perairan Kepulauan Widi",
    category: "Taman Pulau Kecil (TPK)",
    location: "Kabupaten Halmahera Selatan",
    summary:
      "Kawasan kepulauan dengan ekosistem terumbu karang, mangrove, padang lamun, serta habitat penting bagi lumba-lumba, hiu martil, dan pari manta.",
    area: "315.117,92 hektare",
    ecosystems: ["Terumbu karang", "Mangrove", "Padang lamun"],
    keyFeatures: ["Lumba-lumba", "Hiu martil", "Pari manta", "Ikan karang"],
    zoning: "Terdiri atas zona inti dan zona pemanfaatan terbatas, termasuk subzona pariwisata dan perikanan tangkap.",
    zoningDetails: [
      { name: "Zona Inti", area: "8.751,78 ha", percentage: "2,78%", purpose: "Perlindungan mutlak habitat dan populasi ikan; kegiatan dibatasi untuk perlindungan, penelitian, dan pendidikan." },
      { name: "Subzona Pariwisata", area: "8.021,49 ha", percentage: "2,55%", purpose: "Wisata bahari berbasis ekosistem, termasuk snorkeling dan penyelaman, dengan tetap menjaga daya dukung kawasan." },
      { name: "Subzona Perikanan Tangkap", area: "298.344,64 ha", percentage: "94,68%", purpose: "Penangkapan ikan secara berkelanjutan dengan praktik dan alat tangkap yang sesuai ketentuan." },
    ],
    mapImage: "/maps/map_widi.jpg",
    documents: [
      {
        label: "Kepmen KP No. 102/KEPMEN-KP/2020",
        title:
          "Kawasan Konservasi di Perairan Kepulauan Widi di Provinsi Maluku Utara",
        href: "/documents/kepmenkp_widi.pdf",
        kind: "kepmen",
      },
      {
        label: "RPZ 2020–2040",
        title:
          "Rencana Pengelolaan dan Zonasi Taman Pulau Kecil Kepulauan Widi dan Perairan Sekitarnya",
        href: "/documents/rpz_widi.pdf",
        kind: "rpz",
      },
    ],
  },
  {
    slug: "makian-moti",
    shortName: "Pulau Makian dan Pulau Moti",
    officialName: "Kawasan Konservasi di Perairan Pulau Makian dan Pulau Moti",
    category: "Taman Wisata Perairan (TWP)",
    location: "Kabupaten Halmahera Selatan dan Kota Ternate",
    summary:
      "Kawasan wisata perairan berkelanjutan yang melindungi terumbu karang, padang lamun, penyu, napoleon, hiu, serta sumber daya perikanan penting.",
    area: "67.349,00 hektare",
    ecosystems: ["Terumbu karang", "Mangrove", "Padang lamun"],
    keyFeatures: ["Penyu lekang", "Ikan napoleon", "Hiu", "Ikan karang"],
    zoning: "Terdiri atas zona inti, zona pemanfaatan terbatas, dan zona lainnya. Pemanfaatan terbatas mencakup pariwisata dan perikanan.",
    zoningDetails: [
      { name: "Zona Inti", area: "1.552,54 ha", percentage: "2,31%", purpose: "Melindungi habitat penting dan proses ekologis utama kawasan." },
      { name: "Subzona Pariwisata", area: "59,10 ha", percentage: "0,09%", purpose: "Pemanfaatan untuk wisata alam perairan secara terkendali dan bertanggung jawab." },
      { name: "Subzona Perikanan Tangkap", area: "65.633,24 ha", percentage: "97,45%", purpose: "Ruang penangkapan ikan berkelanjutan bagi masyarakat dengan memperhatikan ketentuan zonasi." },
      { name: "Subzona Rehabilitasi", area: "29,45 ha", percentage: "0,04%", purpose: "Pemulihan ekosistem perairan yang mengalami kerusakan atau penurunan kondisi." },
      { name: "Jalur Lalu Lintas Kapal", area: "74,67 ha", percentage: "0,11%", purpose: "Mengakomodasi lintasan kapal agar tidak mengganggu zona perlindungan dan pemanfaatan lainnya." },
    ],
    mapImage: "/maps/map_makian_moti.jpg",
    documents: [
      {
        label: "Kepmen KP No. 104/KEPMEN-KP/2020",
        title:
          "Kawasan Konservasi di Perairan Pulau Makian dan Pulau Moti di Provinsi Maluku Utara",
        href: "/documents/kepmenkp_makian_moti.pdf",
        kind: "kepmen",
      },
      {
        label: "RPZ 2020–2040",
        title:
          "Rencana Pengelolaan dan Zonasi Taman Wisata Perairan Pulau Makian dan Pulau Moti",
        href: "/documents/rpz_makian_moti.pdf",
        kind: "rpz",
      },
    ],
  },
  {
    slug: "guraici",
    shortName: "Kepulauan Guraici",
    officialName: "Kawasan Konservasi di Perairan Kepulauan Guraici",
    category: "Taman Pulau Kecil (TPK)",
    location: "Kabupaten Halmahera Selatan",
    summary:
      "Kawasan kepulauan yang mendukung perlindungan terumbu karang, padang lamun, penyu, pari manta, lumba-lumba, serta wisata pesisir berkelanjutan.",
    area: "91.538,99 hektare",
    ecosystems: ["Terumbu karang", "Mangrove", "Padang lamun"],
    keyFeatures: ["Pari manta", "Lumba-lumba", "Penyu", "Tradisi Togal"],
    zoning: "Terdiri atas zona inti dan zona pemanfaatan terbatas, dengan subzona pariwisata serta perikanan tangkap.",
    zoningDetails: [
      { name: "Zona Inti", area: "1.981,02 ha", percentage: "2,16%", purpose: "Perlindungan habitat, keanekaragaman hayati, serta proses ekologis penting kawasan." },
      { name: "Subzona Pariwisata", area: "431,05 ha", percentage: "0,47%", purpose: "Wisata bahari, penelitian, dan pendidikan; ditetapkan sebagai wilayah tanpa kegiatan ekstraktif." },
      { name: "Subzona Perikanan Budidaya", area: "116,91 ha", percentage: "0,13%", purpose: "Kegiatan budidaya perairan yang dijalankan sesuai daya dukung dan ketentuan pengelolaan." },
      { name: "Subzona Perikanan Tangkap", area: "89.010,00 ha", percentage: "97,24%", purpose: "Perikanan tangkap tradisional dan berkelanjutan sesuai aturan kawasan." },
    ],
    mapImage: "/maps/map_guraici.jpg",
    documents: [
      {
        label: "Kepmen KP No. 103/KEPMEN-KP/2020",
        title:
          "Kawasan Konservasi di Perairan Kepulauan Guraici di Provinsi Maluku Utara",
        href: "/documents/kepmenkp_guraici.pdf",
        kind: "kepmen",
      },
      {
        label: "RPZ 2020–2040",
        title:
          "Rencana Pengelolaan dan Zonasi Taman Pulau Kecil Kepulauan Guraici dan Perairan Sekitarnya",
        href: "/documents/rpz_guraici.pdf",
        kind: "rpz",
      },
    ],
  },
  {
    slug: "mare",
    shortName: "Pulau Mare",
    officialName:
      "Kawasan Konservasi Perairan Pulau Mare dan Perairan Sekitarnya",
    category: "Taman Wisata Perairan (TWP)",
    location: "Kota Tidore Kepulauan",
    summary:
      "Kawasan dengan terumbu karang, mangrove, padang lamun, ikan karang, lumba-lumba, dan hiu sirip hitam yang dikelola untuk pemanfaatan berkelanjutan.",
    area: "7.060,87 hektare",
    ecosystems: ["Terumbu karang", "Mangrove", "Padang lamun"],
    keyFeatures: ["Lumba-lumba", "Hiu sirip hitam", "Ikan karang"],
    zoning: "Terdiri atas zona inti, zona pemanfaatan, zona perikanan berkelanjutan, dan zona lainnya untuk rehabilitasi.",
    zoningDetails: [
      { name: "Zona Inti", area: "155,14 ha", percentage: "2,20%", purpose: "Melindungi habitat dan sumber daya yang menjadi target konservasi kawasan." },
      { name: "Subzona Pariwisata Alam Perairan", area: "61,05 ha", percentage: "0,86%", purpose: "Kegiatan wisata alam perairan yang tidak merusak ekosistem." },
      { name: "Zona Perikanan Berkelanjutan", area: "6.811,01 ha", percentage: "96,46%", purpose: "Ruang penangkapan ikan berkelanjutan di luar zona inti dan zona wisata." },
      { name: "Subzona Rehabilitasi", area: "33,67 ha", percentage: "0,48%", purpose: "Rehabilitasi terumbu karang serta kegiatan penelitian yang mendukung pemulihan." },
    ],
    mapImage: "/maps/map_mare.jpg",
    documents: [
      {
        label: "Kepmen KP No. 66/KEPMEN-KP/2020",
        title:
          "Kawasan Konservasi Perairan Pulau Mare dan Perairan Sekitarnya di Provinsi Maluku Utara",
        href: "/documents/kepmenkp_mare.pdf",
        kind: "kepmen",
      },
      {
        label: "RPZ 2020–2040",
        title:
          "Rencana Pengelolaan dan Zonasi Taman Wisata Perairan Pulau Mare",
        href: "/documents/rpz_mare.pdf",
        kind: "rpz",
      },
    ],
  },
  {
    slug: "rao-dehegila",
    shortName: "Pulau Rao–Tanjung Dehegila",
    officialName:
      "Kawasan Konservasi Perairan Pulau Rao–Tanjung Dehegila dan Perairan Sekitarnya",
    category: "Taman Wisata Perairan (TWP)",
    location: "Kabupaten Pulau Morotai",
    summary:
      "Kawasan yang melindungi terumbu karang, lamun, mangrove, pari manta, lumba-lumba, penyu, serta mendukung pariwisata dan perikanan berkelanjutan.",
    area: "65.892,42 hektare",
    ecosystems: ["Terumbu karang", "Mangrove", "Padang lamun"],
    keyFeatures: ["Pari manta", "Lumba-lumba", "Penyu", "Tradisi Timba Laor"],
    zoning: "Pengelolaan kawasan membagi ruang untuk perlindungan inti, pemanfaatan wisata, dan perikanan berkelanjutan.",
    zoningDetails: [
      { name: "Zona Inti", area: "1.527,01 ha", percentage: "2,32%", purpose: "Melindungi terumbu karang, lamun, mangrove, dan sebagian pantai peneluran penyu." },
      { name: "Subzona Pariwisata Alam Perairan", area: "2.154,22 ha", percentage: "3,27%", purpose: "Wisata pantai dan bahari tanpa kegiatan ekstraktif, termasuk snorkeling, menyelam, dan selancar." },
      { name: "Subzona Penangkapan Ikan", area: "60.398,95 ha", percentage: "91,66%", purpose: "Penangkapan ikan oleh masyarakat menggunakan alat tangkap yang ramah lingkungan." },
      { name: "Subzona Perikanan Budidaya", area: "833,70 ha", percentage: "1,27%", purpose: "Budidaya perikanan, termasuk kerang mutiara, ikan, dan rumput laut, sesuai izin serta daya dukung." },
      { name: "Subzona Tambat Labuh", area: "32,97 ha", percentage: "0,05%", purpose: "Lokasi tambat labuh kapal yang ditata untuk mengurangi tekanan pada habitat sensitif." },
      { name: "Subzona Pelestarian Budaya", area: "102,85 ha", percentage: "0,16%", purpose: "Melindungi ruang pelaksanaan tradisi Laor masyarakat setempat." },
      { name: "Subzona Perlindungan Mamalia Laut", area: "795,81 ha", percentage: "1,21%", purpose: "Perlindungan duyung dan mamalia laut beserta padang lamun sebagai habitatnya." },
      { name: "Subzona Rehabilitasi", area: "46,91 ha", percentage: "0,07%", purpose: "Pemulihan ekosistem terumbu karang pada lokasi yang telah ditetapkan." },
    ],
    mapImage: "/maps/map_rao_dehegila.jpg",
    documents: [
      {
        label: "Kepmen KP No. 67/KEPMEN-KP/2020",
        title:
          "Kawasan Konservasi Perairan Pulau Rao–Tanjung Dehegila dan Perairan Sekitarnya di Provinsi Maluku Utara",
        href: "/documents/kepmenkp_rao_dehegila.pdf",
        kind: "kepmen",
      },
      {
        label: "RPZ 2020–2040",
        title:
          "Rencana Pengelolaan dan Zonasi Taman Wisata Perairan Pulau Rao–Tanjung Dehegila",
        href: "/documents/rpz_morotai.pdf",
        kind: "rpz",
      },
    ],
  },
  {
    slug: "sula",
    shortName: "Kepulauan Sula",
    officialName:
      "Kawasan Konservasi Pesisir dan Pulau-Pulau Kecil Kepulauan Sula dan Perairan Sekitarnya",
    category: "Taman Pesisir",
    location: "Kabupaten Kepulauan Sula",
    summary:
      "Kawasan pesisir dan pulau-pulau kecil dengan terumbu karang, padang lamun, mangrove, sumber daya ikan ekonomis penting, dan habitat penyu.",
    area: "120.723,88 hektare",
    ecosystems: ["Terumbu karang", "Mangrove", "Padang lamun", "Lokasi pemijahan ikan"],
    keyFeatures: ["Penyu", "Ikan ekonomis penting", "Pulau-pulau kecil"],
    zoning: "Penataan ruang kawasan mengutamakan perlindungan habitat penting serta pemanfaatan terbatas yang berkelanjutan.",
    zoningDetails: [
      { name: "Zona Inti", area: "4.552,98 ha", percentage: "3,77%", purpose: "Perlindungan habitat dan biota penting serta proses ekologis kawasan." },
      { name: "Subzona Pariwisata", area: "1.221,55 ha", percentage: "1,01%", purpose: "Pemanfaatan wisata alam secara terbatas; bersama zona inti berfungsi sebagai wilayah tanpa pengambilan." },
      { name: "Subzona Perikanan Berkelanjutan", area: "113.342,45 ha", percentage: "93,89%", purpose: "Penangkapan ikan berkelanjutan dengan memperhatikan habitat penting dan aturan kawasan." },
      { name: "Subzona Budidaya", area: "80,62 ha", percentage: "0,07%", purpose: "Pengembangan budidaya perairan yang sesuai dengan daya dukung lingkungan." },
      { name: "Subzona Perikanan Tradisional", area: "16,18 ha", percentage: "0,01%", purpose: "Mengakomodasi pemanfaatan tradisional masyarakat setempat secara terkendali." },
      { name: "Subzona Rehabilitasi", area: "1.350,34 ha", percentage: "1,12%", purpose: "Pemulihan ekosistem pesisir dan laut yang memerlukan intervensi rehabilitasi." },
      { name: "Subzona Pelabuhan", area: "159,76 ha", percentage: "0,13%", purpose: "Mengakomodasi fungsi pelabuhan dalam ruang yang telah ditentukan." },
    ],
    mapImage: "/maps/map_sula.jpg",
    documents: [
      {
        label: "Kepmen KP No. 68/KEPMEN-KP/2020",
        title:
          "Kawasan Konservasi Pesisir dan Pulau-Pulau Kecil Kepulauan Sula dan Perairan Sekitarnya di Provinsi Maluku Utara",
        href: "/documents/kepmenkp_sula.pdf",
        kind: "kepmen",
      },
      {
        label: "RPZ 2020–2040",
        title:
          "Rencana Pengelolaan dan Zonasi Taman Pesisir Kepulauan Sula",
        href: "/documents/rpz_sula.pdf",
        kind: "rpz",
      },
    ],
  },
];

export const conservationDocuments = conservationZones.flatMap((zone) =>
  zone.documents.map((document) => ({ ...document, zone: zone.shortName })),
);
