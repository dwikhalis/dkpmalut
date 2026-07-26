// app/admin/tickets/scanner/page.tsx

import DashTicketScanner from "@/app/components/Dashboard/DashTicketScanner";

export default function DashTicketScannerPage() {
  return (
    <>
      <style>{`[data-app-shell] { display: none !important; }`}</style>
      <main className="min-h-screen bg-stone-950">
        <DashTicketScanner />
      </main>
    </>
  );
}
