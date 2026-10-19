"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Delete, Lock } from "lucide-react";
import {
  BARBERO_PIN,
  grantBarberoAccess,
  isBarberoAuthorized,
} from "@/lib/barbero-auth";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"] as const;

export function PinGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [digits, setDigits] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    setUnlocked(isBarberoAuthorized());
    setReady(true);
  }, []);

  const unlock = useCallback(() => {
    grantBarberoAccess();
    setUnlocked(true);
    setDigits("");
    setError(false);
  }, []);

  const submit = useCallback(
    (value: string) => {
      if (value === BARBERO_PIN) {
        unlock();
        return;
      }
      setError(true);
      window.setTimeout(() => {
        setDigits("");
        setError(false);
      }, 380);
    },
    [unlock],
  );

  const press = useCallback(
    (digit: string) => {
      setDigits((prev) => {
        if (prev.length >= BARBERO_PIN.length) return prev;
        const next = `${prev}${digit}`;
        if (next.length === BARBERO_PIN.length) {
          window.setTimeout(() => submit(next), 40);
        }
        return next;
      });
      setError(false);
    },
    [submit],
  );

  const backspace = useCallback(() => {
    setError(false);
    setDigits((prev) => prev.slice(0, -1));
  }, []);

  useEffect(() => {
    if (!ready || unlocked) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key >= "0" && event.key <= "9") {
        event.preventDefault();
        press(event.key);
      } else if (event.key === "Backspace") {
        event.preventDefault();
        backspace();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [backspace, press, ready, unlocked]);

  if (!ready) {
    return <div className="min-h-dvh" aria-hidden />;
  }

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 px-5 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pin-title"
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-ink-800 p-6 shadow-glow"
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brass-500/15 text-brass-300">
            <Lock className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-brass-400">Acceso barbero</p>
            <h1 id="pin-title" className="font-display text-2xl text-stone-50">
              Introduce el PIN
            </h1>
          </div>
        </div>

        <div className="mb-6 flex justify-center gap-3" aria-live="polite">
          {Array.from({ length: BARBERO_PIN.length }).map((_, index) => (
            <span
              key={index}
              className={`h-3.5 w-3.5 rounded-full border ${
                error
                  ? "border-red-400 bg-red-400"
                  : digits.length > index
                    ? "border-brass-400 bg-brass-400"
                    : "border-white/20 bg-transparent"
              }`}
            />
          ))}
        </div>

        {error ? (
          <p className="mb-4 text-center text-sm text-red-400">PIN incorrecto</p>
        ) : (
          <p className="mb-4 text-center text-sm text-stone-400">
            Acceso rápido para esta sesión
          </p>
        )}

        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((key, index) => {
            if (key === "") {
              return <span key={`empty-${index}`} />;
            }
            if (key === "back") {
              return (
                <button
                  key="back"
                  type="button"
                  onClick={backspace}
                  className="grid h-14 place-items-center rounded-2xl border border-white/10 text-stone-300 hover:bg-white/5"
                  aria-label="Borrar"
                >
                  <Delete className="h-5 w-5" />
                </button>
              );
            }
            return (
              <button
                key={key}
                type="button"
                onClick={() => press(key)}
                className="h-14 rounded-2xl border border-white/10 font-display text-2xl text-stone-50 hover:border-brass-400/40 hover:bg-ink-700"
              >
                {key}
              </button>
            );
          })}
        </div>

        <Link
          href="/"
          className="mt-5 block text-center text-sm text-stone-500 hover:text-stone-300"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
