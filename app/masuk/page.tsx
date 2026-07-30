"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

import { supabase } from "@/lib/supabase/supabaseClient";
import SpinnerLoading from "../components/SpinnerLoading";
import { EyeClosed, EyeOpen } from "@/public/icons/iconSets";

const RESET_COOLDOWN_KEY = "resetPasswordCooldownUntil";

const GENERIC_RESET_MESSAGE =
  "Jika alamat email terdaftar, kami akan mengirimkan tautan reset password.";

type FormMode = "signin" | "forgot";

function isCaptchaError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("captcha") ||
    normalized.includes("challenge") ||
    normalized.includes("timeout-or-duplicate")
  );
}

function isRateLimitError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("rate limit") ||
    normalized.includes("too many") ||
    normalized.includes("over_email_send_rate_limit")
  );
}

export default function Page() {
  const router = useRouter();

  const turnstileRef = useRef<TurnstileInstance | null>(null);

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  const [mode, setMode] = useState<FormMode>("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [cooldown, setCooldown] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const resetCaptcha = () => {
    turnstileRef.current?.reset();
    setCaptchaToken(null);
  };

  const startCooldown = (seconds: number) => {
    const cooldownUntil = Date.now() + seconds * 1000;

    localStorage.setItem(RESET_COOLDOWN_KEY, cooldownUntil.toString());

    setCooldown(seconds);
  };

  const getCooldownTime = (currentRetryCount: number) => {
    return Math.min(60 * (currentRetryCount + 1), 300);
  };

  /*
   * Reset form values and CAPTCHA when switching mode.
   */
  useEffect(() => {
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setCaptchaToken(null);
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [mode]);

  /*
   * Restore and maintain the forgot-password cooldown.
   *
   * An absolute timestamp is used so reloading the page does
   * not reset the cooldown.
   */
  useEffect(() => {
    const updateCooldown = () => {
      const savedValue = localStorage.getItem(RESET_COOLDOWN_KEY);

      if (!savedValue) {
        setCooldown(0);
        return;
      }

      const cooldownUntil = Number(savedValue);

      if (!Number.isFinite(cooldownUntil)) {
        localStorage.removeItem(RESET_COOLDOWN_KEY);
        setCooldown(0);
        return;
      }

      const remainingSeconds = Math.max(
        0,
        Math.ceil((cooldownUntil - Date.now()) / 1000),
      );

      setCooldown(remainingSeconds);

      if (remainingSeconds === 0) {
        localStorage.removeItem(RESET_COOLDOWN_KEY);
      }
    };

    updateCooldown();

    const timer = window.setInterval(updateCooldown, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const handleEmailSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) return;

    clearMessages();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setErrorMsg("Email dan password wajib diisi.");
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

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
        options: {
          captchaToken,
        },
      });

      resetCaptcha();

      if (error) {
        console.error("Supabase login error:", error);

        if (isCaptchaError(error.message)) {
          setErrorMsg(
            "Verifikasi CAPTCHA gagal atau sudah kedaluwarsa. Silakan coba kembali.",
          );
          return;
        }

        /*
         * Generic message prevents the login form from exposing
         * whether the email, password, or confirmation status
         * caused the failure.
         */
        setErrorMsg("Email atau password salah, atau akun belum dikonfirmasi.");

        return;
      }

      setSuccessMsg("Login berhasil!");

      window.setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (error) {
      console.error("Unexpected login error:", error);

      resetCaptcha();

      setErrorMsg("Login belum dapat diproses. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (loading) return;

    clearMessages();

    if (cooldown > 0) {
      setErrorMsg(`Tunggu ${cooldown} detik sebelum mencoba kembali.`);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMsg("Email wajib diisi.");
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

    setLoading(true);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo,
          captchaToken,
        },
      );

      resetCaptcha();

      if (error && isCaptchaError(error.message)) {
        console.error("Password reset CAPTCHA error:", error);

        setErrorMsg(
          "Verifikasi CAPTCHA gagal atau sudah kedaluwarsa. Silakan coba kembali.",
        );

        return;
      }

      /*
       * Do not reveal whether the email exists.
       *
       * Non-CAPTCHA errors are logged internally, but visitors
       * receive the same response.
       */
      if (error) {
        console.error("Supabase password reset error:", error);
      }

      if (error && isRateLimitError(error.message)) {
        const newRetryCount = retryCount + 1;
        const waitingTime = getCooldownTime(newRetryCount);

        setRetryCount(newRetryCount);
        startCooldown(waitingTime);
      } else {
        setRetryCount(0);
        startCooldown(60);
      }

      setSuccessMsg(GENERIC_RESET_MESSAGE);
    } catch (error) {
      console.error("Unexpected password reset error:", error);

      resetCaptcha();

      setErrorMsg(
        "Permintaan reset password belum dapat diproses. Silakan coba kembali.",
      );
    } finally {
      setLoading(false);
    }
  };

  const renderTurnstile = () => {
    if (!turnstileSiteKey) {
      return (
        <p className="rounded-md bg-red-50 p-3 text-center text-sm text-red-700">
          NEXT_PUBLIC_TURNSTILE_SITE_KEY belum dikonfigurasi.
        </p>
      );
    }

    return (
      <Turnstile
        /*
         * Remount the widget when changing between login
         * and forgot-password modes.
         */
        key={mode}
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
          setErrorMsg("CAPTCHA gagal dimuat. Silakan muat ulang halaman.");
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
    );
  };

  return (
    <div className="flex w-full items-center justify-center">
      <div className="mx-8 my-12 flex min-h-[70vh] flex-col gap-3 rounded-lg border border-stone-100 bg-white p-6 shadow-2xl md:my-12 md:w-[50vw] md:rounded-2xl md:p-10 lg:w-[50%]">
        {mode === "signin" && (
          <>
            <h1 className="text-center md:text-left">Masuk</h1>

            <div className="flex">
              <p className="mt-2 text-sm">
                Belum punya akun?{" "}
                <Link
                  href="/daftar"
                  className="cursor-pointer text-sm underline"
                >
                  Daftar
                </Link>
              </p>
            </div>

            <form onSubmit={handleEmailSignIn} className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={loading}
                autoComplete="email"
                className="rounded-xl bg-stone-100 p-2 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                  className="w-full rounded-xl bg-stone-100 p-2 pr-11 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <button
                  type="button"
                  aria-label={
                    showPassword
                      ? "Sembunyikan password"
                      : "Tampilkan password"
                  }
                  title={
                    showPassword
                      ? "Sembunyikan password"
                      : "Tampilkan password"
                  }
                  disabled={loading}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-stone-600 hover:text-stone-900 disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOpen className="size-5" />
                  ) : (
                    <EyeClosed className="size-5" />
                  )}
                </button>
              </div>

              {renderTurnstile()}

              <button
                type="submit"
                disabled={loading || !captchaToken || !turnstileSiteKey}
                className="flex items-center justify-center rounded-xl bg-sky-800 p-2 text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <SpinnerLoading size="sm" color="white" /> : "Masuk"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setMode("forgot");
              }}
              className="mt-2 cursor-pointer text-sm underline"
            >
              Lupa password?
            </button>
          </>
        )}

        {mode === "forgot" && (
          <>
            <h1 className="mb-4 text-2xl font-semibold">Reset Password</h1>

            <p className="text-sm leading-6 text-stone-600">
              Masukkan alamat email Anda. Demi keamanan, sistem tidak akan
              menampilkan apakah email tersebut terdaftar.
            </p>

            <form
              onSubmit={handleForgotPassword}
              className="flex flex-col gap-4"
            >
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={loading}
                autoComplete="email"
                className="rounded-xl bg-stone-100 p-2 disabled:cursor-not-allowed disabled:opacity-60"
              />

              {renderTurnstile()}

              <button
                type="submit"
                disabled={
                  loading || cooldown > 0 || !captchaToken || !turnstileSiteKey
                }
                className="flex items-center justify-center rounded-xl bg-sky-800 p-2 text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <SpinnerLoading size="sm" color="white" />
                ) : cooldown > 0 ? (
                  `Tunggu ${cooldown}s`
                ) : (
                  "Kirim Email Reset Password"
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setMode("signin");
              }}
              className="mt-2 text-sm text-stone-600 underline hover:text-stone-800"
            >
              Kembali ke Login
            </button>
          </>
        )}

        {errorMsg && (
          <p role="alert" className="mt-4 w-full text-center text-red-600">
            {errorMsg}
          </p>
        )}

        {successMsg && (
          <p role="status" className="mt-4 w-full text-center text-green-600">
            {successMsg}
          </p>
        )}
      </div>
    </div>
  );
}
