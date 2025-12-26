"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function signUp() {
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) return setMsg(error.message);
    setMsg("Account created. You can log in now.");
  }

  async function signIn() {
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) return setMsg(error.message);
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border p-5">
        <h1 className="text-xl font-semibold">PanelFlow</h1>

        <input
          className="w-full rounded-xl border p-3"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full rounded-xl border p-3"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {msg && <p className="text-sm opacity-80">{msg}</p>}

        <div className="flex gap-2">
          <button
            onClick={signIn}
            disabled={loading}
            className="flex-1 rounded-xl border px-4 py-3 disabled:opacity-40"
          >
            Log in
          </button>

          <button
            onClick={signUp}
            disabled={loading}
            className="flex-1 rounded-xl border px-4 py-3 disabled:opacity-40"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
}
