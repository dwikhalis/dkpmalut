"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image";
import SpinnerLoading from "../components/SpinnerLoading";

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Mode can be: "signin", "register", or "forgot"
  const [mode, setMode] = useState<"signin" | "forgot">("signin");

  //! RESET ALL FIELD when "mode" is changed
  useEffect(() => {
    setEmail("");
    setPassword("");
    clearMessages();
  }, [mode]);

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
        router.push("/Admin");
      }, 1000);
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
          <Image
            src={"/assets/hero_1.png"}
            alt="picture"
            priority
            quality={100}
            width={800}
            height={600}
            className="absolute w-[50%]object-contain z-[-1]"
          />
        </div>
        <div className="flex flex-col md:p-10 p-6 border-1 bg-white border-stone-100 gap-3 mx-8 mb-12 lg:mb-20 lg:my-12 lg:mr-24 rounded-lg md:rounded-2xl shadow-2xl lg:w-[50%] min-h-[70vh]">
          {mode === "signin" && (
            <>
              {/* //! LOGIN */}
              <h2 className="text-center md:text-left">Masuk</h2>
              <h5 className="text-center md:text-left mb-3">
                Untuk keperluan pembuatan akun, harap menghubungi Admin.
              </h5>
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
                  disabled={loading}
                  className="bg-sky-800 text-white p-2 rounded-xl hover:bg-stone-700 disabled:opacity-50"
                >
                  {loading ? (
                    <SpinnerLoading size={"sm"} color="white" />
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
            <p className="mt-4 text-green-600 w-full text-center">
              {successMsg} Menuju Dashboard...
            </p>
          )}
        </div>
      </div>
    </>
  );
}
