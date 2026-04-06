"use client";

import { useState, useRef, useEffect } from "react";
import { login } from "@/utils/auth";
import { useRouter } from "next/navigation";

interface LoginModalProps {
  onClose: () => void;
}

export default function LoginModal({ onClose }: LoginModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const ok = login(password);
    setLoading(false);
    if (ok) {
      onClose();
      router.push("/admin");
    } else {
      setError("Incorrect password. Please try again.");
      setPassword("");
      inputRef.current?.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="relative bg-white rounded-xl shadow-2xl p-8 w-full max-w-sm mx-4"
        style={{ border: "1.5px solid #2ecfba" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-400 hover:text-gray-600 text-2xl leading-none"
          aria-label="Close"
        >
          &times;
        </button>

        <h2
          className="text-xl font-bold mb-1"
          style={{ color: "#1c2d2d" }}
        >
          Private screen
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              ref={inputRef}
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ focusRingColor: "#2ecfba" } as React.CSSProperties}
              onFocus={(e) => {
                e.target.style.borderColor = "#2ecfba";
                e.target.style.boxShadow = "0 0 0 2px rgba(46,207,186,0.2)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#d1d5db";
                e.target.style.boxShadow = "none";
              }}
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "#2ecfba", color: "#1c2d2d" }}
          >
            {loading ? "Logging in…" : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
