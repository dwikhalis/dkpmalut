"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useRouter } from "next/navigation";

export default function Page() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const router = useRouter();

  // Mode can be: "signin", "register", or "forgot"
  const [mode, setMode] = useState<"signin" | "register" | "forgot">("signin");

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
      setSuccessMsg("Logged in successfully!");
    }
    setLoading(false);
  };

  //! REGISTER Handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg(
        "Registration successful! Please check your email to confirm your account."
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
      setSuccessMsg("Password reset email sent! Check your inbox.");
    }
    setLoading(false);
  };

  //! GOOGLE SIGNIN Handler
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

  return (
    <>
      <div className="flex justify-center items-center h-[70vh]">
        <div className="max-w-md mx-auto p-6 border rounded-md shadow-md">
          {mode === "signin" && (
            <>
              <h2 className="text-2xl font-semibold mb-4">Sign In</h2>
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
                  className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Sign In"}
                </button>
              </form>
              <button
                onClick={() => {
                  clearMessages();
                  setMode("forgot");
                }}
                className="text-sm mt-2 underline text-blue-600 hover:text-blue-800"
              >
                Forgot password?
              </button>
              <p className="mt-3 text-center">
                Don't have an account?{" "}
                <button
                  onClick={() => {
                    clearMessages();
                    setMode("register");
                  }}
                  className="underline text-blue-600 hover:text-blue-800"
                >
                  Register here
                </button>
              </p>
            </>
          )}

          {mode === "register" && (
            <>
              <h2 className="text-2xl font-semibold mb-4">Register</h2>
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
                  className="bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Register"}
                </button>
              </form>
              <p className="mt-3 text-center">
                Already have an account?{" "}
                <button
                  onClick={() => {
                    clearMessages();
                    setMode("signin");
                  }}
                  className="underline text-blue-600 hover:text-blue-800"
                >
                  Sign in here
                </button>
              </p>
            </>
          )}

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
                  className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send Reset Email"}
                </button>
              </form>
              <button
                onClick={() => {
                  clearMessages();
                  setMode("signin");
                }}
                className="text-sm mt-2 underline text-blue-600 hover:text-blue-800"
              >
                Back to sign in
              </button>
            </>
          )}

          <div className="my-4 text-center">OR</div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="bg-red-600 text-white p-2 rounded hover:bg-red-700 disabled:opacity-50 w-full"
          >
            {loading ? "Loading..." : "Continue with Google"}
          </button>

          {errorMsg && <p className="mt-4 text-red-600">{errorMsg}</p>}
          {successMsg && <p className="mt-4 text-green-600">{successMsg}</p>}
        </div>
      </div>
    </>
  );
}
