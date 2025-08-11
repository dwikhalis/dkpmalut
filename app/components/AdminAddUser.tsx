"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import Image from "next/image";

export default function Page() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Mode can be: "signin", "register", or "forgot"
  const [mode, setMode] = useState<"signin" | "register" | "forgot">("signin");

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
      setErrorMsg(error.message);
    } else {
      setSuccessMsg("Login berhasil!");
    }
    setLoading(false);
  };

  //! SIGNIN GOOGLE Handler
  const handleGoogleSignIn = async () => {
    setLoading(true);
    clearMessages();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });

    if (error) {
      setErrorMsg(error.message);
    }
    setLoading(false);
  };

  //! REGISTER Handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg(
        "Registrasi berhasil! Silahkan cek email anda untuk konfirmasi."
      );
    }
    setLoading(false);
  };

  //! FORGOT PASSWORD Handler
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password", // update if you want a custom reset page
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg("Email reset password telah dikirm. Cek email anda.");
    }
    setLoading(false);
  };

  return (
    <>
      <div className="flex lg:flex-row flex-col">
        <div className="flex lg:h-[80vh] lg:w-[50%] flex-col justify-center items-center lg:items-start mx-12 lg:ml-24 my-8 md:my-12 gap-3">
          <h2 className="text-center md:text-left">Login Staff</h2>
          <h6 className="text-center md:text-left">
            Dinas Kelautan Dan Perikanan Maluku Utara
          </h6>
          <h6 className="text-center md:text-left">
            Untuk keperluan pembuatan akun, harap menghubungi Admin.
          </h6>
        </div>
        <div className="flex flex-col p-10 border-1 border-stone-100 mx-12 mb-12 lg:mb-20 lg:my-12 lg:mr-24 rounded-lg md:rounded-2xl shadow-2xl lg:w-[50%]">
          {mode === "signin" && (
            <>
              {/* //! LOGIN */}
              <h2 className="text-2xl font-semibold mb-4">Masuk</h2>
              <form
                onSubmit={handleEmailSignIn}
                className="flex flex-col gap-4"
              >
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border p-2 rounded"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border p-2 rounded"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-black text-white p-2 rounded hover:bg-stone-700 disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Masuk"}
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
              <p className="mt-3 text-center">
                Belum punya akun ?{" "}
                <button
                  onClick={() => {
                    clearMessages();
                    setMode("register");
                  }}
                  className="underline text-stone-600 hover:text-stone-800"
                >
                  Registrasi
                </button>
              </p>
            </>
          )}

          {/* //! REGISTER */}
          {mode === "register" && (
            <>
              <h2 className="text-2xl font-semibold mb-4">Registrasi</h2>
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border p-2 rounded"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border p-2 rounded"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-black text-white p-2 rounded hover:bg-stone-700 disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Daftar"}
                </button>
              </form>
              <p className="mt-3 text-center">
                Sudah memiliki akun?{" "}
                <button
                  onClick={() => {
                    clearMessages();
                    setMode("signin");
                  }}
                  className="underline text-stone-600 hover:text-stone-800"
                >
                  Login disini
                </button>
              </p>
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
                  className="border p-2 rounded"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-black text-white p-2 rounded hover:bg-stone-700 disabled:opacity-50"
                >
                  {loading ? "Mengirim..." : "Kirim email reset password"}
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

          {/* //! GOOGLE Button */}
          <div className="my-4 text-center">Atau</div>
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="bg-white text-black p-1 rounded hover:bg-stone-300 disabled:opacity-50 w-full shadow-xl border-1 border-stone-200"
          >
            {loading ? (
              "Loading..."
            ) : (
              <div className="flex gap-2 justify-center items-center">
                <Image
                  src={"/assets/icon_google.webp"}
                  alt="G"
                  width={35}
                  height={35}
                />
                <div>Gunakan akun Google</div>
              </div>
            )}
          </button>

          {errorMsg && <p className="mt-4 text-red-600">{errorMsg}</p>}
          {successMsg && <p className="mt-4 text-green-600">{successMsg}</p>}
        </div>
      </div>
    </>
  );
}
