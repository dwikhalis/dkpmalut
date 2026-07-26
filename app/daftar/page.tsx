"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

import { supabase } from "@/lib/supabase/supabaseClient";
import SpinnerLoading from "../components/SpinnerLoading";

const GENERIC_SUCCESS_MESSAGE =
  "Jika alamat email dapat digunakan, kami akan mengirimkan email konfirmasi.";

function getSafeSignUpError(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("captcha") ||
    normalizedMessage.includes("challenge")
  ) {
    return "Verifikasi CAPTCHA gagal atau telah kedaluwarsa. Silakan coba kembali.";
  }

  if (
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("too many") ||
    normalizedMessage.includes("over_email_send_rate_limit")
  ) {
    return "Terlalu banyak percobaan pendaftaran. Silakan coba kembali beberapa saat lagi.";
  }

  if (
    normalizedMessage.includes("database") ||
    normalizedMessage.includes("saving new user") ||
    normalizedMessage.includes("creating new user")
  ) {
    return "Pendaftaran belum dapat diproses karena terjadi masalah pada database.";
  }

  return "Pendaftaran belum dapat diproses. Silakan coba kembali.";
}

export default function Page() {
  const router = useRouter();

  const turnstileRef = useRef<TurnstileInstance | null>(null);

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [password, setPassword] = useState("");

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const resetCaptcha = () => {
    turnstileRef.current?.reset();
    setCaptchaToken(null);
  };

  const handleEmailSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    clearMessages();

    try {
      const cleanUsername = username.trim();
      const normalizedEmail = email.trim().toLowerCase();
      const cleanOrganization = organization.trim();

      if (
        !cleanUsername ||
        !normalizedEmail ||
        !cleanOrganization ||
        !password
      ) {
        setErrorMsg("Semua field wajib diisi.");
        return;
      }

      if (!isValidEmail(normalizedEmail)) {
        setErrorMsg("Format email tidak valid.");
        return;
      }

      if (password.length < 6) {
        setErrorMsg("Password minimal 6 karakter.");
        return;
      }

      if (!turnstileSiteKey) {
        setErrorMsg("Cloudflare Turnstile belum dikonfigurasi.");
        return;
      }

      if (!captchaToken) {
        setErrorMsg("Selesaikan verifikasi CAPTCHA terlebih dahulu.");
        return;
      }

      /*
       * Do not check whether the email already exists.
       *
       * Supabase may return an obfuscated successful response
       * for an existing account. Both new and existing emails
       * receive the same public-facing result.
       *
       * The database trigger creates public.users and sets:
       * email_confirmed = false.
       */
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/masuk/confirm`,

          captchaToken,

          data: {
            username: cleanUsername,
            organization: cleanOrganization,
          },
        },
      });

      /*
       * Turnstile tokens are single-use.
       * Reset after every Auth request.
       */
      resetCaptcha();

      if (signUpError) {
        console.error("Supabase signup error:", signUpError);

        setErrorMsg(getSafeSignUpError(signUpError.message));

        return;
      }

      /*
       * Email confirmation should normally prevent a session
       * from being created immediately. Keep this safeguard.
       */
      if (data.session) {
        await supabase.auth.signOut();
      }

      /*
       * Do not inspect identities or other response properties
       * to determine whether the email already exists.
       */
      setRegisteredEmail(normalizedEmail);

      setUsername("");
      setEmail("");
      setOrganization("");
      setPassword("");

      setSignupComplete(true);
      setSuccessMsg(GENERIC_SUCCESS_MESSAGE);
    } catch (error) {
      console.error("Unexpected signup error:", error);

      resetCaptcha();

      setErrorMsg("Pendaftaran belum dapat diproses. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  };

  const resetSignUpForm = () => {
    setSignupComplete(false);
    setRegisteredEmail("");

    setUsername("");
    setEmail("");
    setOrganization("");
    setPassword("");

    clearMessages();
    resetCaptcha();
  };

  return (
    <div className="flex w-full items-center justify-center">
      <div className="mx-8 my-12 flex min-h-[70vh] flex-col gap-3 rounded-lg border border-stone-100 bg-white p-6 shadow-2xl md:w-[50vw] md:rounded-2xl md:p-10 lg:w-[50%]">
        {signupComplete ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-3xl font-semibold text-sky-800">
              ✓
            </div>

            <h1 className="text-xl font-semibold text-stone-900">
              Periksa Email Anda
            </h1>

            {successMsg && (
              <p className="max-w-md font-medium leading-6 text-green-700">
                {successMsg}
              </p>
            )}

            <p className="text-sm text-stone-600">
              Permintaan pendaftaran telah diterima untuk:
            </p>

            <p className="break-all rounded-md bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-800">
              {registeredEmail}
            </p>

            <p className="max-w-md text-sm leading-6 text-stone-600">
              Silakan periksa kotak masuk, folder spam, atau folder junk pada
              email Anda.
            </p>

            <p className="max-w-md text-xs leading-5 text-stone-500">
              Demi keamanan, sistem tidak menampilkan apakah alamat email
              tersebut sudah terdaftar atau apakah email konfirmasi baru telah
              dikirim.
            </p>

            <button
              type="button"
              onClick={() => router.push("/masuk")}
              className="mt-2 rounded-xl bg-sky-800 px-5 py-2 text-white transition hover:bg-stone-700"
            >
              Ke Halaman Masuk
            </button>

            <button
              type="button"
              onClick={resetSignUpForm}
              className="text-sm text-stone-600 underline"
            >
              Gunakan email lain
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-center md:text-left">Daftar</h1>

            <form onSubmit={handleEmailSignUp} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="username" className="text-sm text-stone-700">
                  Nama
                </label>

                <input
                  id="username"
                  type="text"
                  placeholder="Nama"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                  disabled={loading}
                  autoComplete="name"
                  className="rounded-xl bg-stone-100 p-2 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-sm text-stone-700">
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={loading}
                  autoComplete="email"
                  className="rounded-xl bg-stone-100 p-2 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="organization"
                  className="text-sm text-stone-700"
                >
                  Organisasi
                </label>

                <input
                  id="organization"
                  type="text"
                  placeholder="Organisasi"
                  value={organization}
                  onChange={(event) => setOrganization(event.target.value)}
                  required
                  disabled={loading}
                  autoComplete="organization"
                  className="rounded-xl bg-stone-100 p-2 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="password" className="text-sm text-stone-700">
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                  autoComplete="new-password"
                  className="rounded-xl bg-stone-100 p-2 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <p className="text-xs text-stone-500">
                  Password minimal 6 karakter.
                </p>
              </div>

              {turnstileSiteKey ? (
                <Turnstile
                  ref={turnstileRef}
                  siteKey={turnstileSiteKey}
                  onSuccess={(token) => {
                    setCaptchaToken(token);
                    setErrorMsg(null);
                  }}
                  onExpire={() => {
                    setCaptchaToken(null);
                  }}
                  onError={() => {
                    setCaptchaToken(null);
                    setErrorMsg(
                      "CAPTCHA gagal dimuat. Silakan muat ulang halaman.",
                    );
                  }}
                  options={{
                    theme: "auto",
                    language: "id",
                    size: "flexible",
                    action: "turnstile-spin-v2",
                    refreshExpired: "auto",
                  }}
                  className="flex min-h-[65px] w-full justify-center"
                />
              ) : (
                <p className="rounded-md bg-red-50 p-3 text-center text-sm text-red-700">
                  NEXT_PUBLIC_TURNSTILE_SITE_KEY belum dikonfigurasi.
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !captchaToken || !turnstileSiteKey}
                className="flex items-center justify-center rounded-xl bg-sky-800 p-2 text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <SpinnerLoading size="sm" color="white" />
                ) : (
                  "Daftar"
                )}
              </button>
            </form>

            {errorMsg && (
              <p role="alert" className="mt-4 w-full text-center text-red-600">
                {errorMsg}
              </p>
            )}

            <p className="mt-2 text-sm">
              Sudah punya akun?{" "}
              <button
                type="button"
                onClick={() => router.push("/masuk")}
                className="underline"
              >
                Masuk
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
