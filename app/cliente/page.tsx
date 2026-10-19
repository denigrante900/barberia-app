"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import QRCode from "react-qr-code";
import { ArrowLeft, Gift, LoaderCircle, Sparkles, Trophy } from "lucide-react";
import {
  aplicaTarifaDescuento,
  daysSinceLastCut,
  formatEuro,
  supabase,
  type Profile,
} from "@/lib/supabase";

const STORAGE_KEY = "barberia_profile_id";
const CORTES_PARA_RECOMPENSA = 10;

export default function ClientePage() {
  const [nombre, setNombre] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadProfile = useCallback(async (id: string) => {
    const { data, error: queryError } = await supabase
      .from("profiles")
      .select("id, nombre, cortes, ultimo_corte")
      .eq("id", id)
      .single();

    if (queryError || !data) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return data as Profile;
  }, []);

  useEffect(() => {
    const boot = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const existing = await loadProfile(stored);
          setProfile(existing);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el perfil");
      } finally {
        setLoading(false);
      }
    };

    void boot();
  }, [loadProfile]);

  const crearPerfil = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from("profiles")
      .insert({
        nombre: nombre.trim() || "Cliente",
        cortes: 0,
        ultimo_corte: null,
      })
      .select("id, nombre, cortes, ultimo_corte")
      .single();

    setSaving(false);

    if (insertError || !data) {
      setError(insertError?.message ?? "No se pudo crear el perfil");
      return;
    }

    localStorage.setItem(STORAGE_KEY, data.id);
    setProfile(data as Profile);
  };

  const reclamarRecompensa = async () => {
    if (!profile || profile.cortes < CORTES_PARA_RECOMPENSA) return;
    setClaiming(true);
    setError(null);
    setSuccessMsg(null);

    // Reiniciamos los cortes a 0 al reclamar la recompensa
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ cortes: 0 })
      .eq("id", profile.id);

    setClaiming(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    // Reproducir el sonido personalizado (asegúrate de tener tu archivo en public/)
    try {
      const audio = new Audio("/recompensa.mp3");
      void audio.play();
    } catch {
      // Por si el navegador bloquea la reproducción automática sin interacción previa
    }

    setSuccessMsg("¡Recompensa reclamada! Tienes un 50% de descuento en este corte y tu contador se ha reiniciado.");
    setProfile({
      ...profile,
      cortes: 0,
    });
  };

  const descuento = useMemo(
    () => aplicaTarifaDescuento(profile?.ultimo_corte ?? null),
    [profile?.ultimo_corte],
  );
  const dias = daysSinceLastCut(profile?.ultimo_corte ?? null);
  const cortes = profile?.cortes ?? 0;
  const progreso = Math.min(cortes, CORTES_PARA_RECOMPENSA);

  if (loading) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-cyan-400" />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-stone-400">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <h1 className="font-display text-4xl text-stone-50">Tu ficha de cliente</h1>
        <p className="mt-2 text-sm text-stone-400">
          Creamos un perfil con un código único. El barbero lo escaneará en cada visita.
        </p>
        <form onSubmit={crearPerfil} className="mt-8 space-y-4">
          <label className="block text-sm text-stone-300">
            Nombre
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Cómo te llamamos"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 outline-none ring-cyan-400 focus:ring-2"
            />
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-cyan-500 py-3 font-medium text-ink-950 disabled:opacity-60"
          >
            {saving ? "Creando..." : "Generar mi QR"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-stone-400">
        <ArrowLeft className="h-4 w-4" /> Cambiar perfil
      </Link>

      <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">Cliente</p>
      <h1 className="font-display text-4xl text-stone-50">{profile.nombre || "Cliente"}</h1>

      <section className="mt-6 rounded-3xl bg-white p-5 shadow-glow">
        <QRCode
          value={profile.id}
          size={240}
          className="mx-auto h-auto w-full max-w-[240px]"
          viewBox="0 0 256 256"
        />
        <p className="mt-3 break-all text-center text-[11px] text-stone-500">{profile.id}</p>
      </section>

      {successMsg ? (
        <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {successMsg}
        </p>
      ) : null}
      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

      <section className="mt-6 rounded-3xl border border-white/10 bg-ink-800/80 p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-stone-400">Cortes acumulados</p>
            <p className="font-display text-4xl text-stone-50">
              {progreso}
              <span className="text-2xl text-stone-500">/{CORTES_PARA_RECOMPENSA}</span>
            </p>
          </div>
          {cortes >= CORTES_PARA_RECOMPENSA ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 px-3 py-1 text-xs text-cyan-400">
              <Gift className="h-3.5 w-3.5" /> ¡50% Descuento listo!
            </span>
          ) : null}
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink-950">
          <div
            className="h-full rounded-full bg-cyan-400 transition-all"
            style={{ width: `${(progreso / CORTES_PARA_RECOMPENSA) * 100}%` }}
          />
        </div>

        {cortes >= CORTES_PARA_RECOMPENSA ? (
          <button
            type="button"
            onClick={() => void reclamarRecompensa()}
            disabled={claiming}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 py-3 font-medium text-ink-950 transition hover:bg-cyan-400 disabled:opacity-60"
          >
            {claiming ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <Trophy className="h-5 w-5" />
            )}
            Reclamar 50% de Descuento
          </button>
        ) : null}
      </section>

      <section
        className={`mt-4 rounded-3xl border p-5 ${
          descuento
            ? "border-cyan-500/40 bg-cyan-500/10"
            : "border-white/10 bg-ink-800/80"
        }`}
      >
        <div className="flex items-start gap-3">
          <Sparkles className={`mt-0.5 h-5 w-5 ${descuento ? "text-cyan-400" : "text-stone-500"}`} />
          <div>
            <p className="text-sm text-stone-400">Tarifa de hoy</p>
            <p className="font-display text-3xl text-stone-50">
              {formatEuro(descuento ? 7.5 : 10)}
            </p>
            <p className="mt-1 text-sm text-stone-400">
              {descuento
                ? `Descuento activo: último corte hace ${Math.floor(dias ?? 0)} día(s) (≤ 14).`
                : "Vuelve en 14 días o menos para pagar 7,50€. Si no, la tarifa es 10,00€."}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}