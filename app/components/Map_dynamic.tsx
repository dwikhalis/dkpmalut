// app/components/Map_dynamic.tsx
import dynamic from "next/dynamic";

const Map_dynamic = dynamic(() => import("./Map"), { ssr: false });
export default Map_dynamic;
