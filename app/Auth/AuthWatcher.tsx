"use client";

import { useIdleAutoLogout } from "@/lib/hooks/useIdleAutoLogout";
import AlertNotif from "../components/AlertNotif";
import { useState } from "react";

export default function AuthWatcher({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showAlert, setShowAlert] = useState(false);

  //! Input number in milisecond
  //! We can also use like this (2 * 60 * 1000) which is = 2 minutes
  useIdleAutoLogout({
    timeout: 30 * 60 * 1000,
    onAutoLogout: () => {
      setShowAlert(true);
    },
  });

  const handleConfirm = (status: boolean) => {
    setShowAlert(false);
  };

  return (
    <>
      {children}
      {showAlert && (
        <AlertNotif
          type="single"
          msg="Anda keluar secara otomatis untuk memproteksi fungsi Admin"
          yesText="OK"
          confirm={handleConfirm}
        />
      )}
    </>
  );
}
