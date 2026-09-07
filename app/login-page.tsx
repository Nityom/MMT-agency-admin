"use client";

import { Eye, EyeOff, Gauge, Lock } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useAuth } from "./auth";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      const ok = login(email, password);
      if (!ok) {
        setError("Invalid email or password. Please try again.");
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }
      setLoading(false);
    }, 500);
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#f0f5f2]">

      {/* ── SVG background pattern ── */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.055]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="hex" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
            <polygon
              points="30,2 56,16 56,44 30,58 4,44 4,16"
              fill="none"
              stroke="#1f6f59"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex)" />
      </svg>

      {/* ── Gradient blobs ── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 -left-28 w-[480px] h-[480px] rounded-full bg-[#1f6f59]/12 blur-[90px] animate-[pulse_7s_ease-in-out_infinite]" />
        <div className="absolute -bottom-36 -right-36 w-[520px] h-[520px] rounded-full bg-[#243852]/10 blur-[110px] animate-[pulse_9s_ease-in-out_infinite_1s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full bg-[#1f6f59]/8 blur-[70px] animate-[pulse_5s_ease-in-out_infinite_0.5s]" />
      </div>

      {/* ── Floating decorative circles ── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* top-right large ring */}
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full border-[18px] border-[#1f6f59]/10" />
        {/* bottom-left medium ring */}
        <div className="absolute -bottom-10 -left-10 w-52 h-52 rounded-full border-[12px] border-[#1f6f59]/8" />
        {/* mid-right small solid */}
        <div className="absolute top-1/3 right-12 w-5 h-5 rounded-full bg-[#1f6f59]/20 animate-[bounce_3s_ease-in-out_infinite]" />
        {/* mid-left tiny solid */}
        <div className="absolute bottom-1/3 left-16 w-3 h-3 rounded-full bg-[#a86618]/25 animate-[bounce_4s_ease-in-out_infinite_0.8s]" />
        {/* scattered dots */}
        <div className="absolute top-20 left-1/4 w-2 h-2 rounded-full bg-[#1f6f59]/30" />
        <div className="absolute bottom-24 right-1/3 w-2 h-2 rounded-full bg-[#243852]/20" />
        <div className="absolute top-2/3 left-1/3 w-1.5 h-1.5 rounded-full bg-[#1f6f59]/25" />
      </div>

      {/* ── Decorative corner shapes ── */}
      <svg aria-hidden="true" className="pointer-events-none absolute top-0 left-0 w-64 h-64 opacity-[0.07]" viewBox="0 0 256 256">
        <circle cx="0" cy="0" r="180" fill="none" stroke="#1f6f59" strokeWidth="2"/>
        <circle cx="0" cy="0" r="120" fill="none" stroke="#1f6f59" strokeWidth="1.5"/>
        <circle cx="0" cy="0" r="60"  fill="none" stroke="#1f6f59" strokeWidth="1"/>
      </svg>
      <svg aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 w-64 h-64 opacity-[0.07]" viewBox="0 0 256 256">
        <circle cx="256" cy="256" r="180" fill="none" stroke="#1f6f59" strokeWidth="2"/>
        <circle cx="256" cy="256" r="120" fill="none" stroke="#1f6f59" strokeWidth="1.5"/>
        <circle cx="256" cy="256" r="60"  fill="none" stroke="#1f6f59" strokeWidth="1"/>
      </svg>

      {/* ── Card ── */}
      <div
        className={[
          "relative z-10 w-full max-w-[420px] mx-4",
          "rounded-3xl border border-[#d5e4dc] bg-white/95 backdrop-blur-md",
          "shadow-[0_12px_60px_rgba(31,111,89,0.13),0_2px_8px_rgba(0,0,0,0.05)]",
          "overflow-hidden",
          shake ? "animate-[shake_0.5s_ease]" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Card top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#1f6f59] via-[#3aaa88] to-[#243852]" />

        {/* Card inner content */}
        <div className="px-8 pt-8 pb-8">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#1f6f59] to-[#155244] shadow-[0_4px_16px_rgba(31,111,89,0.35)]">
              <Gauge size={24} className="text-white" />
            </div>
            <div>
              <p className="m-0 font-bold text-[#172321] text-[16px] leading-tight">
                MMT Agency
              </p>
              <p className="m-0 text-[10px] font-semibold tracking-[2.5px] text-[#1f6f59] uppercase mt-0.5">
                Admin Portal
              </p>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-[#172321] font-bold text-[24px] leading-tight mb-1">
            Welcome back 👋
          </h1>
          <p className="text-[#6b7773] text-[13px] mb-6">
            Sign in to manage your operations.
          </p>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-email" className="text-[11px] font-bold text-[#52655e] uppercase tracking-[1px]">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder=""
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11 px-4 rounded-xl border border-[#d5e4dc] bg-[#f5faf7] text-[#172321] text-[14px] outline-none transition-all duration-200 focus:border-[#1f6f59] focus:bg-white focus:shadow-[0_0_0_3px_rgba(31,111,89,0.12)] disabled:opacity-50"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-password" className="text-[11px] font-bold text-[#52655e] uppercase tracking-[1px]">
                Password
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8aaba0] pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full h-11 pl-9 pr-10 rounded-xl border border-[#d5e4dc] bg-[#f5faf7] text-[#172321] placeholder-[#a4b5af] text-[14px] outline-none transition-all duration-200 focus:border-[#1f6f59] focus:bg-white focus:shadow-[0_0_0_3px_rgba(31,111,89,0.12)] disabled:opacity-50"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-[#8aaba0] hover:text-[#1f6f59] transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div role="alert" className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#fdf1ef] border border-[#f0c4bb] text-[#a84938] text-[12.5px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a84938] flex-none" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading || !email || !password}
              className="mt-1 h-11 w-full rounded-xl font-bold text-[14px] text-white bg-gradient-to-r from-[#1f6f59] to-[#196150] shadow-[0_4px_18px_rgba(31,111,89,0.35)] transition-all duration-200 hover:shadow-[0_6px_24px_rgba(31,111,89,0.45)] hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2.5"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-5 border-t border-[#e8f0eb] flex items-center justify-between">
            <p className="text-[11px] text-[#98aba4] m-0">
              Session valid for{" "}
              <span className="text-[#1f6f59] font-semibold">24 hours</span>
            </p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#1f6f59] animate-pulse" />
              <span className="text-[10px] text-[#6b9985] font-medium">Secured</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          15%      { transform: translateX(-7px); }
          30%      { transform: translateX(7px); }
          45%      { transform: translateX(-5px); }
          60%      { transform: translateX(5px); }
          75%      { transform: translateX(-3px); }
          90%      { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}
