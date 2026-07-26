import { Suspense } from "react";
import TicketForm from "../components/TicketForm";

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          Memuat formulir tiket...
        </div>
      }
    >
      <TicketForm />
    </Suspense>
  );
}
