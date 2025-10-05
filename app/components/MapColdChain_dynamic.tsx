import dynamic from "next/dynamic";

const MapColdChain_dynamic = dynamic(() => import("./MapColdChain"), {
  ssr: false,
});
export default MapColdChain_dynamic;
