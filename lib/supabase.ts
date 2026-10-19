import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  nombre: string | null;
  cortes: number;
  ultimo_corte: string | null;
};

export type Visita = {
  id?: string;
  profile_id: string;
  precio: number;
  es_gratis: boolean;
  created_at?: string;
};

export function daysSinceLastCut(ultimoCorte: string | null): number | null {
  if (!ultimoCorte) return null;
  const then = new Date(ultimoCorte).getTime();
  if (Number.isNaN(then)) return null;
  return (Date.now() - then) / (1000 * 60 * 60 * 24);
}

export function aplicaTarifaDescuento(ultimoCorte: string | null): boolean {
  const days = daysSinceLastCut(ultimoCorte);
  return days !== null && days <= 14;
}

export function calcularTarifa(ultimoCorte: string | null): number {
  return aplicaTarifaDescuento(ultimoCorte) ? 7.5 : 10;
}

export function formatEuro(value: number): string {
  return `${value.toFixed(2).replace(".", ",")}€`;
}
