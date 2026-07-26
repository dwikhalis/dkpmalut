import { Suspense } from "react";

import SpinnerLoading from "@/app/components/SpinnerLoading";
import PaymentFinishStatus from "../PaymentFinishStatus";

export default function PaymentFinishTokenPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-transparent">
          <SpinnerLoading size="sm" color="black" />
        </main>
      }
    >
      <PaymentFinishStatus />
    </Suspense>
  );
}
