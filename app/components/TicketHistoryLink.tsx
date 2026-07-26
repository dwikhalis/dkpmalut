"use client";

import {
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/supabaseClient";
import AlertNotif from "./AlertNotif";

export default function TicketHistoryLink({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const router = useRouter();
  const [showLoginAlert, setShowLoginAlert] = useState(false);
  const [checkingSession, setCheckingSession] = useState(false);

  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    onClick?.(event);

    if (checkingSession) return;

    setCheckingSession(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    setCheckingSession(false);

    if (session) {
      router.push("/profile/tickets");
      return;
    }

    setShowLoginAlert(true);
  }

  return (
    <>
      <Link
        href="/profile/tickets"
        className={className}
        aria-busy={checkingSession}
        onClick={(event) => {
          void handleClick(event);
        }}
      >
        {children}
      </Link>

      {showLoginAlert && (
        <AlertNotif
          type="double"
          msg="Anda harus masuk terlebih dahulu untuk melihat tiket. Masuk sekarang?"
          yesText="Ya"
          noText="Tidak"
          icon="warning"
          confirm={(confirmed) => {
            setShowLoginAlert(false);
            if (confirmed) router.push("/masuk");
          }}
        />
      )}
    </>
  );
}
