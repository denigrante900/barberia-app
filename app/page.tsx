import Link from "next/link";
import { Scissors, UserRound } from "lucide-react";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-10">
      <p className="mb-2 text-center text-xs uppercase tracking-[0.35em] text-brass-400">
        Programa de fidelización
      </p>
      <h1 className="font-display text-center text-5xl font-semibold text-stone-50">
        Barbería
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-center text-sm text-stone-400">
        Elige tu perfil para continuar. El cliente muestra su QR; el barbero
        escanea y cobra según cortes y recencia.
      </p>

      <div className="mt-10 grid gap-4">
        <Link
          href="/cliente"
          className="group rounded-3xl border border-brass-500/25 bg-ink-800/80 p-6 shadow-glow transition hover:border-brass-400/50 hover:bg-ink-700"
        >
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brass-500/15 text-brass-300">
              <UserRound className="h-7 w-7" />
            </span>
            <div>
              <h2 className="font-display text-2xl text-stone-50">Cliente</h2>
              <p className="text-sm text-stone-400">
                Tu QR, tu racha de cortes y la tarifa de 7,50€
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/barbero"
          className="group rounded-3xl border border-white/10 bg-ink-800/80 p-6 transition hover:border-brass-400/40 hover:bg-ink-700"
        >
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-stone-100/5 text-stone-200">
              <Scissors className="h-7 w-7" />
            </span>
            <div>
              <h2 className="font-display text-2xl text-stone-50">Barbero</h2>
              <p className="text-sm text-stone-400">
                Escanea, calcula tarifa y confirma el cobro
              </p>
            </div>
          </div>
        </Link>
      </div>
    </main>
  );
}
