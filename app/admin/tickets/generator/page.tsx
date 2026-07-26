import TicketFormAdmin from "@/app/components/TicketFormAdmin";
import { Suspense } from "react";

export default function page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          Memuat formulir tiket...
        </div>
      }
    >
      <TicketFormAdmin />
    </Suspense>
  );
}
