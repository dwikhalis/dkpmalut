"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import {
  EMPTY_PUBLICATION_APPROVALS,
  EMPTY_PUBLICATION_APPROVAL_MESSAGES,
  type ApprovalRole,
  type ApprovalStatus,
  type PublicationApprovals,
  type PublicationApprovalMessages,
} from "@/app/components/PublicationApprovalChips";

export function usePublicationApprovals(
  resourceKind: "dataset" | "map",
  resourceId: string | null,
) {
  const [approvals, setApprovals] = useState<PublicationApprovals>(
    EMPTY_PUBLICATION_APPROVALS,
  );
  const [approvalMessages, setApprovalMessages] =
    useState<PublicationApprovalMessages>(EMPTY_PUBLICATION_APPROVAL_MESSAGES);

  const refreshApprovals = useCallback(async () => {
    if (!resourceId) return;
    const { data, error } = await supabase
      .from("publication_approvals")
      .select("approver_role,status,message")
      .eq("resource_kind", resourceKind)
      .eq("resource_id", resourceId);
    if (error) {
      console.warn("Publication approvals are unavailable:", error);
      return;
    }
    const next = { ...EMPTY_PUBLICATION_APPROVALS };
    const nextMessages = { ...EMPTY_PUBLICATION_APPROVAL_MESSAGES };
    (data ?? []).forEach((row) => {
      const role = row.approver_role as ApprovalRole;
      const status = row.status as ApprovalStatus;
      if (role in next) next[role] = status;
      if (role in nextMessages) nextMessages[role] = row.message ?? null;
    });
    setApprovals(next);
    setApprovalMessages(nextMessages);
  }, [resourceId, resourceKind]);

  useEffect(() => {
    void refreshApprovals();
    if (!resourceId) return;
    const channel = supabase
      .channel(`publication-approvals:${resourceKind}:${resourceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "publication_approvals",
          filter: `resource_id=eq.${resourceId}`,
        },
        () => void refreshApprovals(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshApprovals, resourceId, resourceKind]);

  return { approvals, approvalMessages, refreshApprovals };
}
