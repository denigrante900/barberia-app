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

const CORTES_PARA_RECOMPENSA = 10;

export default function ClientePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchOrCreateProfile = useCallback(async (userId: string, defaultName: string) => {
    // Buscar si ya existe un perfil asociado a este auth_user_id
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, nombre, cortes, ultimo_corte")
      .eq("user_id", userId)
      .single();

    if (existingProfile) {
      return existingProfile as Profile;
    }

    // Si no existe, creamos automáticamente el perfil vinculado al usuario de Google
    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert({
        user_id: userId,
        nombre: defaultName || "Cliente",
        cortes: 0,
        ultimo_corte: null,
      })
      .select("id, nombre, cortes, ultimo_corte")
      .single();

    if (insertError || !newProfile) {
      throw new Error(insertError?.message ?? "No se pudo crear el perfil de fidelización");
    }

    return newProfile as Profile;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        // 1. Verificamos si venimos de la redirección de OAuth con tokens en el hash de la URL
        if (window.location.hash && window.location.hash.includes("access_token")) {
          const { data: urlData, error: urlError } = await supabase.auth.getSessionFromUrl({
            storeSession: true,
          });
          if (urlError) throw urlError;

          if (urlData?.session?.user) {
            const userProfile = await fetchOrCreateProfile(
              urlData.session.user.id,
              urlData.session.user.user_metadata?.full_name || urlData.session.user.email?.split("@")[0] || "Cliente"
            );
            if (isMounted) {
              setProfile(userProfile);
              window.history.replaceState({}, document.title, window.location.pathname);
              setLoading(false);
              return;
            }
          }
        }

        // 2. Comprobación de sesión estándar existente
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session?.user) {
          const userProfile = await fetchOrCreateProfile(
            session.user.id,
            session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Cliente"
          );
          if (isMounted) {
            setProfile(userProfile);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Error al autenticar el perfil");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        setLoading(true);
        try {
          const userProfile = await fetchOrCreateProfile(
            session.user.id,
            session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Cliente"
          );
          if (isMounted) {
            setProfile(userProfile);
          }
        } catch (err) {
          if (isMounted) {
            setError(err instanceof Error ? err.message : "Error al sincronizar el perfil");
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      } else {
        if (isMounted) {
          setProfile(null);
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchOrCreateProfile]);

  const iniciarSesionGoogle = async () => {
    setError(null);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/cliente`,
      },
    });

    if (authError) {
      setError(authError.message);
    }
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const reclamarRecompensa = async () => {
    if (!profile || profile.cortes < CORTES_PARA_RECOMPENSA) return;
    setClaiming(true);
    setError(null);
    setSuccessMsg(null);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ cortes: 0 })
      .eq("id", profile.id);

    setClaiming(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    try {
      const audio = new Audio("/recompensa.mp3");
      audio.volume = 1.0;
      void audio.play().catch((e) => console.log("Error al reproducir audio:", e));
    } catch (err) {
      console.log("No se pudo reproducir el sonido", err);
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
      <main className="grid min-h-dvh place-items-center bg-ink-950">
        <LoaderCircle className="h-8 w-8 animate-spin text-cyan-400" />
      </main>
    );
  }

  // Pantalla de inicio de sesión si no hay usuario autenticado con Google
  if (!profile) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 bg-ink-950 text-stone-50">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-stone-400 hover:text-stone-200">
          <ArrowLeft className="h-4 w-4" /> Volver al inicio
        </Link>
        <h1 className="font-display text-4xl">Acceso de Clientes</h1>
        <p className="mt-2 text-sm text-stone-400">
          Inicia sesión con tu cuenta de Google para acceder a tu tarjeta de fidelización desde cualquier dispositivo.
        </p>
        
        <div className="mt-8 space-y-4">
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button
            type="button"
            onClick={() => void iniciarSesionGoogle()}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 py-3 font-medium text-stone-100 transition hover:bg-white/10"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continuar con Google
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-5 py-8 bg-ink-950 text-stone-50 min-h-dvh">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-stone-400 hover:text-stone-200">
          <ArrowLeft className="h-4 w-4" /> Inicio
        </Link>
        <button
          onClick={() => void cerrarSesion()}
          className="text-xs text-red-400 hover:underline"
        >
          Cerrar sesión
        </button>
      </div>

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