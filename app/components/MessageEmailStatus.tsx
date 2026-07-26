export type MessageEmailDeliveryStatus =
  | "not_attempted"
  | "pending"
  | "sent"
  | "failed";

const statusStyle: Record<MessageEmailDeliveryStatus, { label: string; className: string }> = {
  sent: {
    label: "Email terkirim",
    className: "bg-emerald-100 text-emerald-700 ring-emerald-600/20",
  },
  failed: {
    label: "Email gagal",
    className: "bg-red-100 text-red-700 ring-red-600/20",
  },
  pending: {
    label: "Email diproses",
    className: "bg-amber-100 text-amber-700 ring-amber-600/20",
  },
  not_attempted: {
    label: "Email tidak diproses",
    className: "bg-stone-100 text-stone-600 ring-stone-500/20",
  },
};

export default function MessageEmailStatus({ status }: { status?: string | null }) {
  const normalized = status && status in statusStyle
    ? status as MessageEmailDeliveryStatus
    : "not_attempted";
  const config = statusStyle[normalized];

  return (
    <span className={`inline-flex w-fit shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${config.className}`}>
      {config.label}
    </span>
  );
}
