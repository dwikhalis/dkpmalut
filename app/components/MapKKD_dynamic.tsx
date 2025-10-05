import dynamic from "next/dynamic";

const MapKKD_dynamic = dynamic(() => import("./MapKKD"), {
  ssr: false,
});
export default MapKKD_dynamic;
