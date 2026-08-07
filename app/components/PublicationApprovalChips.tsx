"use client";

import { useEffect, useRef } from "react";
import { FaCheck, FaMinus, FaXmark } from "react-icons/fa6";

export type ApprovalRole = "admin" | "kadis" | "sekdis";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type PublicationApprovals = Record<ApprovalRole, ApprovalStatus>;
export type PublicationApprovalMessages = Record<ApprovalRole, string | null>;

export const EMPTY_PUBLICATION_APPROVALS: PublicationApprovals = {
  admin: "pending",
  kadis: "pending",
  sekdis: "pending",
};

export const EMPTY_PUBLICATION_APPROVAL_MESSAGES: PublicationApprovalMessages = {
  admin: null,
  kadis: null,
  sekdis: null,
};

const labels: Record<ApprovalRole, string> = {
  admin: "Admin",
  kadis: "Kadis",
  sekdis: "Sekdis",
};

export const isApprovalRole = (role: string | null): role is ApprovalRole =>
  role === "admin" || role === "kadis" || role === "sekdis";

export default function PublicationApprovalChips({
  approvals,
  messages = EMPTY_PUBLICATION_APPROVAL_MESSAGES,
}: {
  approvals: PublicationApprovals;
  messages?: PublicationApprovalMessages;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const closeDetailsOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      containerRef.current
        ?.querySelectorAll<HTMLDetailsElement>("details[open]")
        .forEach((details) => {
          if (!details.contains(target)) details.removeAttribute("open");
        });
    };

    document.addEventListener("mousedown", closeDetailsOutsideClick);
    return () => document.removeEventListener("mousedown", closeDetailsOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className="flex flex-wrap gap-2" aria-label="Status persetujuan publikasi">
      {(Object.keys(labels) as ApprovalRole[]).map((role) => {
        const status = approvals[role];
        const Icon = status === "approved" ? FaCheck : status === "rejected" ? FaXmark : FaMinus;
        return (
          <details key={role} className="group relative">
            <summary className={`inline-flex cursor-pointer list-none items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-semibold ${status === "approved" ? "border-green-300 text-green-700" : status === "rejected" ? "border-red-300 text-red-700" : "border-amber-300 text-amber-700"}`}>
              {labels[role]}
              <Icon className="size-3" aria-label={status === "approved" ? "Diizinkan" : status === "rejected" ? "Ditolak" : "Ditangguhkan"} />
            </summary>
            <div className="absolute left-0 z-30 mt-2 w-72 max-w-[80vw] rounded-lg border border-gray-200 bg-white p-3 text-left text-xs font-normal text-gray-700 shadow-lg">
              <p className="mb-1 font-semibold text-gray-900">Pesan {labels[role]}</p>
              <p className="whitespace-pre-wrap break-words">{messages[role] || "Belum ada pesan."}</p>
            </div>
          </details>
        );
      })}
    </div>
  );
}
