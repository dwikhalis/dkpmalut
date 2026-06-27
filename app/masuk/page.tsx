"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useRouter } from "next/navigation";
import SpinnerLoading from "../components/SpinnerLoading";
import { getUserEmailList } from "@/lib/supabase/supabaseHelper";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  // Mode can be: "signin", "register", or "forgot"
  const [mode, setMode] = useState<"signin" | "forgot">("signin");

  //! RESET ALL FIELD when "mode" is changed
  useEffect(() => {
    setEmail("");
    setPassword("");
    clearMessages();
  }, [mode]);

  //! Cooldown timer for forgot password (e.g., 60 seconds)
  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    const saved = localStorage.getItem("resetCooldown");
    if (saved) setCooldown(Number(saved));
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      localStorage.setItem("resetCooldown", cooldown.toString());
    }
  }, [cooldown]);

  const getCooldownTime = (retryCount: number) => {
    // exponential backoff: 60 → 120 → 180 → max 300
    return Math.min(60 * (retryCount + 1), 300);
  };

  //! RESET Messages
  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  //! SIGNIN EMAIL Handler
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg("Akun belum terdaftar! Hubungi Admin.");
    } else {
      setSuccessMsg("Login berhasil!");
      setTimeout(() => {
        router.push("/admin");
      }, 1000);
    }
    setLoading(false);
  };

  //! FORGOT PASSWORD Handler
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cooldown > 0) {
      setErrorMsg(`Tunggu ${cooldown} detik sebelum mencoba lagi`);
      return;
    }

    setLoading(true);
    clearMessages();

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const userId = await getUserEmailList(normalizedEmail);

      if (!userId) {
        setErrorMsg("Email belum terdaftar");
        setLoading(false);
        return;
      }

      // ✅ Use environment-based URL
      const redirectTo = `${getBaseUrl()}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        { redirectTo },
      );

      if (error) {
        if (error.message.toLowerCase().includes("rate limit")) {
          const newRetry = retryCount + 1;
          const waitTime = getCooldownTime(newRetry);

          setRetryCount(newRetry);
          setCooldown(waitTime);

          setErrorMsg(`Terlalu banyak permintaan. Tunggu ${waitTime} detik.`);
        } else {
          setErrorMsg(error.message);
        }
      } else {
        setSuccessMsg("Email reset password telah dikirim. Cek email anda.");
        setRetryCount(0);
        setCooldown(60);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Terjadi kesalahan");
      }
    }

    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center w-full">
      <div className="flex flex-col md:p-10 p-6 border-1 bg-white border-stone-100 gap-3 mx-8 my-12 mb-12 md:my-12 md:w-[50vw] rounded-lg md:rounded-2xl shadow-2xl lg:w-[50%] min-h-[70vh]">
        {mode === "signin" && (
          <>
            {/* //! LOGIN */}
            <h2 className="text-center md:text-left">Masuk</h2>
            <h5 className="text-center md:text-left mb-3">
              Untuk keperluan pembuatan akun, harap menghubungi Admin.
            </h5>
            <form onSubmit={handleEmailSignIn} className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-stone-100 p-2 rounded-xl"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-stone-100 p-2 rounded-xl"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-sky-800 text-white p-2 rounded-xl hover:bg-stone-700 disabled:opacity-50"
              >
                {loading ? (
                  <SpinnerLoading size={"sm"} color="white" />
                ) : (
                  "Masuk"
                )}
              </button>
            </form>
            <button
              onClick={() => {
                clearMessages();
                setMode("forgot");
              }}
              className="text-sm mt-2 underline text-stone-600 hover:text-stone-800"
            >
              Lupa password?
            </button>
          </>
        )}

        {/* //! FORGOT PASSWORD */}
        {mode === "forgot" && (
          <>
            <h2 className="text-2xl font-semibold mb-4">Reset Password</h2>
            <form
              onSubmit={handleForgotPassword}
              className="flex flex-col gap-4"
            >
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-stone-100 p-2 rounded-xl"
              />
              <button
                type="submit"
                disabled={loading || cooldown > 0}
                className="bg-sky-800 text-white p-2 rounded-xl hover:bg-stone-700 disabled:opacity-50"
              >
                {loading ? (
                  <SpinnerLoading size={"sm"} color="white" />
                ) : cooldown > 0 ? (
                  `Tunggu ${cooldown}s`
                ) : (
                  "Kirim email reset password"
                )}
              </button>
            </form>
            <button
              onClick={() => {
                clearMessages();
                setMode("signin");
              }}
              className="text-sm mt-2 underline text-stone-600 hover:text-stone-800"
            >
              Kembali ke Login
            </button>
          </>
        )}

        {errorMsg && (
          <p className="mt-4 text-red-600 w-full text-center">{errorMsg}</p>
        )}
        {successMsg && (
          <p className="mt-4 text-green-600 w-full text-center">{successMsg}</p>
        )}
      </div>
    </div>
  );
}
