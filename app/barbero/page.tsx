"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Check,
  Gift,
  LoaderCircle,
  RotateCcw,
  Scissors,
} from "lucide-react";
import {
  aplicaTarifaDescuento,
  calcularTarifa,
  formatEuro,
  supabase,
  type Profile,
} from "@/lib/supabase";

const READER_ID = "barbero-qr-reader";
const CORTES_PARA_GRATIS = 10;

export default function BarberoPage() {
  const scannerRef = useRef<{
    isScanning: boolean;
    stop: () => Promise<void>;
    clear: () => Promise<void>;
  } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [canjearGratis, setCanjearGratis] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const stopScanner = useCallback(async () => {
    const instance = scannerRef.current;
    if (!instance) return;
    try {
      if (instance.isScanning) {
        await instance.stop();
      }
      await instance.clear();
    } catch {
      /* scanner already stopped */
    }
    scannerRef.current = null;
    setScanning(false);
  }, []);

  const onScan = useCallback(
    async (decodedText: string) => {
      const id = decodedText.trim();
      if (!id) return;

      await stopScanner();
      setLookupError(null);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, nombre, cortes, ultimo_corte")
        .eq("id", id)
        .single();

      if (error || !data) {
        setLookupError("No encontramos ese cliente. Pídele que muestre su QR.");
        setProfile(null);
        return;
      }

      const found = data as Profile;
      setProfile(found);
      setCanjearGratis(found.cortes >= CORTES_PARA_GRATIS);
      setDone(null);
    },
    [stopScanner],
  );

  const startScanner = useCallback(async () => {
    setScanError(null);
    setLookupError(null);
    setProfile(null);
    setDone(null);
    setCanjearGratis(false);

    try {
      await stopScanner();
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(READER_ID);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
scannerRef.current = scanner as any;
      setScanning(true);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => {
          void onScan(text);
        },
        () => undefined,
      );
    } catch (err) {
      setScanning(false);
      setScanError(
        err instanceof Error
          ? err.message
          : "No se pudo abrir la cámara. Revisa permisos y usa HTTPS o localhost.",
      );
    }
  }, [onScan, stopScanner]);

  useEffect(() => {
    void startScanner();
    return () => {
      void stopScanner();
    };
    // Arranque único al montar la vista del barbero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tarifaBase = profile ? calcularTarifa(profile.ultimo_corte) : 10;
  const puedeGratis = (profile?.cortes ?? 0) >= CORTES_PARA_GRATIS;
  const precioFinal = profile && canjearGratis && puedeGratis ? 0 : tarifaBase;
  const descuento = profile ? aplicaTarifaDescuento(profile.ultimo_corte) : false;

  const confirmarCobro = async () => {
    if (!profile) return;
    setConfirming(true);
    setLookupError(null);

    const esGratis = precioFinal === 0;
    const nuevosCortes = esGratis ? 0 : profile.cortes + 1;
    const ahora = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        cortes: nuevosCortes,
        ultimo_corte: ahora,
      })
      .eq("id", profile.id);

    if (updateError) {
      setConfirming(false);
      setLookupError(updateError.message);
      return;
    }

    const { error: visitaError } = await supabase.from("visitas").insert({
      profile_id: profile.id,
      precio: precioFinal,
      es_gratis: esGratis,
    });

    setConfirming(false);

    if (visitaError) {
      setLookupError(
        `Perfil actualizado, pero no se guardó la visita: ${visitaError.message}`,
      );
      return;
    }

    setDone(
      esGratis
        ? `Corte gratis canjeado para ${profile.nombre || "el cliente"}.`
        : `Cobro de ${formatEuro(precioFinal)} registrado.`,
    );
    setProfile({
      ...profile,
      cortes: nuevosCortes,
      ultimo_corte: ahora,
    });
    setCanjearGratis(false);
  };

  return (
    <main className="mx-auto max-w-lg px-5 py-8">
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-stone-400">
        <ArrowLeft className="h-4 w-4" /> Cambiar perfil
      </Link>

      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brass-500/15 text-brass-300">
          <Scissors className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-brass-400">Barbero</p>
          <h1 className="font-display text-3xl text-stone-50">Escanear cliente</h1>
        </div>
      </div>

      <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-ink-900">
        <div id={READER_ID} className="min-h-56 w-full bg-black" />
        {!scanning ? (
          <div className="flex items-center justify-between px-4 py-3 text-sm text-stone-400">
            <span>Cámara en pausa</span>
            <button
              type="button"
              onClick={() => void startScanner()}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-stone-100"
            >
              <Camera className="h-4 w-4" /> Escanear de nuevo
            </button>
          </div>
        ) : (
          <p className="px-4 py-3 text-sm text-stone-400">Apunta al QR del cliente…</p>
        )}
      </section>

      {scanError ? <p className="mt-3 text-sm text-red-400">{scanError}</p> : null}
      {lookupError ? <p className="mt-3 text-sm text-red-400">{lookupError}</p> : null}
      {done ? (
        <p className="mt-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {done}
        </p>
      ) : null}

      {profile ? (
        <section className="mt-6 space-y-4 rounded-3xl border border-white/10 bg-ink-800/80 p-5">
          <div>
            <p className="text-sm text-stone-400">Cliente</p>
            <h2 className="font-display text-3xl text-stone-50">
              {profile.nombre || "Sin nombre"}
            </h2>
            <p className="text-sm text-stone-500">
              Cortes: {profile.cortes}/{CORTES_PARA_GRATIS}
            </p>
          </div>

          <div className="rounded-2xl bg-ink-950/70 p-4">
            <p className="text-sm text-stone-400">Tarifa calculada</p>
            <p className="font-display text-4xl text-brass-300">{formatEuro(precioFinal)}</p>
            <p className="mt-1 text-xs text-stone-500">
              {canjearGratis && puedeGratis
                ? "Canje de corte gratis aplicado."
                : descuento
                  ? "Último corte hace 14 días o menos → 7,50€."
                  : "Fuera de ventana de 14 días → 10,00€."}
            </p>
          </div>

          <label
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
              puedeGratis
                ? "border-brass-500/40 bg-brass-500/10"
                : "border-white/10 bg-ink-950/50 opacity-60"
            }`}
          >
            <span className="inline-flex items-center gap-2 text-sm">
              <Gift className="h-4 w-4 text-brass-300" />
              Corte Gratis (0,00€)
            </span>
            <input
              type="checkbox"
              className="h-5 w-5 accent-brass-400"
              checked={canjearGratis && puedeGratis}
              disabled={!puedeGratis}
              onChange={(e) => setCanjearGratis(e.target.checked)}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => void startScanner()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 py-3 text-sm"
            >
              <RotateCcw className="h-4 w-4" /> Otro QR
            </button>
            <button
              type="button"
              onClick={() => void confirmarCobro()}
              disabled={confirming}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brass-500 py-3 text-sm font-medium text-ink-950 disabled:opacity-60"
            >
              {confirming ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Confirmar cobro
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
