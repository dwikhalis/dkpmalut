"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image";
import SpinnerLoading from "../components/SpinnerLoading";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setErrorMsg("Link tidak valid atau sudah expired");
      }
    };

    checkSession();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    // 1. Validate password
    if (password !== confirmPassword) {
      setErrorMsg("Password tidak sama");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password minimal 6 karakter");
      setLoading(false);
      return;
    }

    // 2. ✅ Check session BEFORE updating password
    const { data, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !data.session) {
      setErrorMsg("Link reset tidak valid atau sudah kadaluarsa");
      setLoading(false);
      return;
    }

    // 3. Update password
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg("Password berhasil diubah");

      setTimeout(() => {
        router.push("/");
      }, 1500);
    }

    setLoading(false);
  };

  return (
    <div className="flex lg:flex-row flex-col">
      {/* LEFT IMAGE (reuse your layout) */}
      <div className="flex lg:h-[80vh] lg:w-[50%] flex-col justify-center items-center lg:items-start mx-12 lg:ml-24 my-8 md:my-12 gap-3">
        <Image
          src={"/assets/hero_1.png"}
          alt="picture"
          priority
          width={800}
          height={600}
          className="absolute w-[50%] object-contain z-[-1]"
        />
      </div>

      {/* FORM */}
      <div className="flex flex-col md:p-10 p-6 bg-white border-stone-100 gap-3 mx-8 mb-12 lg:mb-20 lg:my-12 lg:mr-24 rounded-lg md:rounded-2xl shadow-2xl lg:w-[50%] min-h-[70vh]">
        <h2 className="text-2xl font-semibold mb-4">Reset Password</h2>

        <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
          <input
            type="password"
            placeholder="Password baru"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-stone-100 p-2 rounded-xl"
          />

          <input
            type="password"
            placeholder="Konfirmasi password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
              "Update Password"
            )}
          </button>
        </form>

        {errorMsg && (
          <p className="mt-4 text-red-600 text-center">{errorMsg}</p>
        )}
        {successMsg && (
          <p className="mt-4 text-green-600 text-center">{successMsg}</p>
        )}
      </div>
    </div>
  );
}
