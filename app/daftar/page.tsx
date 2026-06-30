"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/supabaseClient";
import SpinnerLoading from "../components/SpinnerLoading";

export default function Page() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
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

      if (password.length < 6) {
        setErrorMsg("Password minimal 6 karakter.");
        return;
      }

      // 1. Check if email already exists in public.users
      const { data: existingUsers, error: checkError } = await supabase
        .from("users")
        .select("id, email")
        .eq("email", normalizedEmail)
        .limit(1);

      if (checkError) {
        setErrorMsg(checkError.message);
        return;
      }

      if (existingUsers && existingUsers.length > 0) {
        setErrorMsg("Email sudah terdaftar. Silakan masuk.");
        return;
      }

      // 2. Create Supabase Auth account
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            username: cleanUsername,
            organization: cleanOrganization,
          },
        },
      });

      if (signUpError) {
        setErrorMsg(signUpError.message);
        return;
      }

      const authUserId = data.user?.id;

      if (!authUserId) {
        setErrorMsg("Gagal membuat akun. User ID tidak ditemukan.");
        return;
      }

      // 3. Insert user profile into public.users table
      // id and created_at are auto-generated.
      const { error: insertError } = await supabase.from("users").insert({
        username: cleanUsername,
        email: normalizedEmail,
        organization: cleanOrganization,
      });

      if (insertError) {
        if (insertError.code === "23505") {
          setErrorMsg("Email sudah terdaftar.");
        } else {
          setErrorMsg(insertError.message);
        }
        return;
      }

      // 4. Prevent automatic login after successful sign up
      if (data.session) {
        await supabase.auth.signOut();
      }

      // 5. Clear form and show success screen
      setUsername("");
      setEmail("");
      setOrganization("");
      setPassword("");

      setSignupComplete(true);
      setSuccessMsg("Pendaftaran berhasil. Akun anda sudah dibuat.");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Terjadi kesalahan saat mendaftar.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center w-full">
      <div className="flex flex-col md:p-10 p-6 border bg-white border-stone-100 gap-3 mx-8 my-12 mb-12 md:my-12 md:w-[50vw] rounded-lg md:rounded-2xl shadow-2xl lg:w-[50%] min-h-[70vh]">
        {signupComplete ? (
          <div className="flex flex-col items-center justify-center gap-4 flex-1 text-center">
            {successMsg && (
              <p className="text-green-600 font-medium">{successMsg}</p>
            )}

            <p className="text-sm text-stone-600">
              Silakan masuk menggunakan email dan password yang sudah anda
              daftarkan.
            </p>

            <button
              type="button"
              onClick={() => router.push("/masuk")}
              className="bg-sky-800 text-white px-5 py-2 rounded-xl hover:bg-stone-700"
            >
              Masuk
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-center md:text-left">Daftar</h2>
            <form onSubmit={handleEmailSignUp} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Nama"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-stone-100 p-2 rounded-xl"
              />

              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-stone-100 p-2 rounded-xl"
              />

              <input
                type="text"
                placeholder="Organisasi"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                required
                className="bg-stone-100 p-2 rounded-xl"
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-stone-100 p-2 rounded-xl"
              />

              <button
                type="submit"
                disabled={loading}
                className="bg-sky-800 text-white p-2 rounded-xl hover:bg-stone-700 disabled:opacity-50 flex justify-center items-center"
              >
                {loading ? (
                  <SpinnerLoading size="sm" color="white" />
                ) : (
                  "Daftar"
                )}
              </button>
            </form>

            {errorMsg && (
              <p className="mt-4 text-red-600 w-full text-center">{errorMsg}</p>
            )}

            <p className="mt-2 text-sm">
              Sudah punya akun?{" "}
              <span
                className="underline cursor-pointer"
                onClick={() => router.push("/masuk")}
              >
                Masuk
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
