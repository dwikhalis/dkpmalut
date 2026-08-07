"use client";

import { useState } from "react";
import AlertNotif from "./AlertNotif";
import Button from "./Button";
import type { ApprovalRole, ApprovalStatus } from "./PublicationApprovalChips";

export default function PublicationReviewControls({
  role,
  currentStatus,
  disabled = false,
  onDecision,
}: {
  role: ApprovalRole;
  currentStatus: ApprovalStatus;
  disabled?: boolean;
  onDecision: (status: ApprovalStatus, message: string) => Promise<void>;
}) {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [showRequiredAlert, setShowRequiredAlert] = useState(false);

  const decide = async (status: ApprovalStatus) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setShowRequiredAlert(true);
      return;
    }
    setSaving(true);
    try {
      await onDecision(status, trimmedMessage);
      setMessage("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-md border border-gray-300 bg-white p-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Pesan <span className="text-red-600">*</span></span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={4}
          required
          placeholder="Tuliskan pesan atau alasan keputusan publikasi."
          className="resize-y rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </label>
      <div className={`grid gap-3 ${role === "admin" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <Button type="button" variant="danger" disabled={disabled || saving} loading={saving} onClick={() => void decide("rejected")}>Tolak</Button>
        {role === "admin" && (
          <Button type="button" variant="warning" disabled={disabled || saving} loading={saving} onClick={() => void decide("pending")}>Tangguhkan</Button>
        )}
        <Button type="button" variant="success" disabled={disabled || saving} loading={saving} onClick={() => void decide("approved")}>Setujui</Button>
      </div>
      <p className="text-xs text-gray-500">Status Anda saat ini: {currentStatus === "approved" ? "Disetujui" : currentStatus === "rejected" ? "Ditolak" : "Ditangguhkan"}.</p>
      {showRequiredAlert && (
        <AlertNotif type="single" msg="Pesan wajib diisi sebelum memberikan keputusan publikasi." yesText="OK" icon="warning" confirm={() => setShowRequiredAlert(false)} />
      )}
    </div>
  );
}
