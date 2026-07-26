"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { supabase } from "@/lib/supabase/supabaseClient";
import SpinnerLoading from "../components/SpinnerLoading";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);

  const [loading, setLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  useEffect(() => {
    let mounted = true;

    /*
     * Listen for PASSWORD_RECOVERY because Supabase may finish
     * processing the recovery URL shortly after the page loads.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "PASSWORD_RECOVERY" || session) {
        setHasValidSession(true);
        setErrorMsg(null);
      }

      if (event === "INITIAL_SESSION" || event === "PASSWORD_RECOVERY") {
        setCheckingSession(false);
      }
    });

    const checkExistingSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error("Recovery session check failed:", error);

        setHasValidSession(false);
        setErrorMsg("Link reset password tidak valid atau sudah kedaluwarsa.");
      } else if (session) {
        setHasValidSession(true);
        setErrorMsg(null);
      } else {
        setHasValidSession(false);
        setErrorMsg("Link reset password tidak valid atau sudah kedaluwarsa.");
      }

      setCheckingSession(false);
    };

    void checkExistingSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleResetPassword = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    clearMessages();

    try {
      if (!hasValidSession) {
        setErrorMsg("Link reset password tidak valid atau sudah kedaluwarsa.");
        return;
      }

      if (!password || !confirmPassword) {
        setErrorMsg("Password baru dan konfirmasi password wajib diisi.");
        return;
      }

      if (password !== confirmPassword) {
        setErrorMsg("Password tidak sama.");
        return;
      }

      if (password.length < 6) {
        setErrorMsg("Password minimal 6 karakter.");
        return;
      }

      /*
       * Confirm the recovery session again immediately before
       * updating the password.
       */
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setHasValidSession(false);

        setErrorMsg("Sesi reset password tidak valid atau sudah kedaluwarsa.");

        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        console.error("Password update failed:", updateError);

        setErrorMsg(
          "Password belum dapat diperbarui. Silakan minta tautan reset password baru.",
        );

        return;
      }

      /*
       * End the temporary recovery session so the user must
       * log in again using the new password.
       */
      await supabase.auth.signOut();

      setPassword("");
      setConfirmPassword("");
      setHasValidSession(false);

      setSuccessMsg(
        "Password berhasil diubah. Anda akan diarahkan ke halaman masuk.",
      );

      window.setTimeout(() => {
        router.replace("/masuk");
      }, 1500);
    } catch (error) {
      console.error("Unexpected password update error:", error);

      setErrorMsg("Password belum dapat diperbarui. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row">
      <div className="mx-12 my-8 flex flex-col items-center justify-center gap-3 md:my-12 lg:ml-24 lg:h-[80vh] lg:w-[50%] lg:items-start">
        <Image
          src="/assets/hero_1.png"
          alt="Ilustrasi reset password"
          priority
          width={800}
          height={600}
          className="absolute z-[-1] w-[50%] object-contain"
        />
      </div>

      <div className="mx-8 mb-12 flex min-h-[70vh] flex-col gap-3 rounded-lg bg-white p-6 shadow-2xl md:rounded-2xl md:p-10 lg:my-12 lg:mb-20 lg:mr-24 lg:w-[50%]">
        <h1 className="mb-4 text-2xl font-semibold">Reset Password</h1>

        {checkingSession ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <SpinnerLoading size="sm" color="stone" />

            <p className="text-sm text-stone-600">
              Memeriksa link reset password...
            </p>
          </div>
        ) : hasValidSession ? (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="new-password" className="text-sm text-stone-700">
                Password Baru
              </label>

              <input
                id="new-password"
                type="password"
                placeholder="Password baru"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={loading}
                minLength={6}
                autoComplete="new-password"
                className="rounded-xl bg-stone-100 p-2 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="confirm-password"
                className="text-sm text-stone-700"
              >
                Konfirmasi Password
              </label>

              <input
                id="confirm-password"
                type="password"
                placeholder="Konfirmasi password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                disabled={loading}
                minLength={6}
                autoComplete="new-password"
                className="rounded-xl bg-stone-100 p-2 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <p className="text-xs text-stone-500">
              Password minimal 6 karakter.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center rounded-xl bg-sky-800 p-2 text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <SpinnerLoading size="sm" color="white" />
              ) : (
                "Perbarui Password"
              )}
            </button>
          </form>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl font-semibold text-red-700">
              !
            </div>

            <p className="max-w-md text-sm leading-6 text-stone-600">
              Link reset password tidak valid, sudah kedaluwarsa, atau sudah
              pernah digunakan.
            </p>

            <button
              type="button"
              onClick={() => router.push("/masuk")}
              className="rounded-xl bg-sky-800 px-5 py-2 text-white hover:bg-stone-700"
            >
              Minta Link Reset Baru
            </button>
          </div>
        )}

        {errorMsg && (
          <p role="alert" className="mt-4 text-center text-red-600">
            {errorMsg}
          </p>
        )}

        {successMsg && (
          <p role="status" className="mt-4 text-center text-green-600">
            {successMsg}
          </p>
        )}
      </div>
    </div>
  );
}
