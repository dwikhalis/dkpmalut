import ChartAquaculture from "@/app/components/ChartAquaculture";
import ChartColdChain from "@/app/components/ChartColdChain";
import ChartProductionClassFish from "@/app/components/ChartProductionClassFish";
import ChartProductionCommonFish from "@/app/components/ChartProductionCommonFish";
import ChartProductionKabFilter from "@/app/components/ChartProductionKabFilter";
import ChartProductionYearFilter from "@/app/components/ChartProductionYearFilter";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function Page({ params }: Props) {
  const { slug } = await params;

  const pages = [
    {
      title: "Produksi Perikanan Tangkap dan Budidaya per Kabupaten",
      slug: "produksi-perikanan-kabupaten",
    },
    {
      title: "Produksi Perikanan Tangkap dan Budidaya per Tahun",
      slug: "produksi-perikanan-tahun",
    },
    {
      title: "Produksi Perikanan Tangkap per Kelas Komoditas",
      slug: "produksi-kelas-komoditas",
    },
    {
      title: "Produksi Perikanan Tangkap per Jenis Komoditas",
      slug: "produksi-jenis-komoditas",
    },
    {
      title: "Gambaran Umum Perikanan Budidaya Provinsi Maluku Utara",
      slug: "perikanan-budidaya-maluku-utara",
    },
    {
      title: "Infrastruktur Rantai Dingin",
      slug: "infrastruktur-rantai-dingin",
    },
  ];

  if (slug === pages[0].slug) {
    return <ChartProductionKabFilter pages={pages} />;
  } else if (slug === pages[1].slug) {
    return <ChartProductionYearFilter pages={pages} />;
  } else if (slug === pages[2].slug) {
    return <ChartProductionClassFish pages={pages} />;
  } else if (slug === pages[3].slug) {
    return <ChartProductionCommonFish pages={pages} />;
  } else if (slug === pages[4].slug) {
    return <ChartAquaculture pages={pages} />;
  } else if (slug === pages[5].slug) {
    return <ChartColdChain pages={pages} />;
  }
}
