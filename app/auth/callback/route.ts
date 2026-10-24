import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Captura la ruta de destino que configuraste (ej: /cliente)
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )
    
    // Intercambia el código de Google por una sesión real
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Si va bien, redirige al usuario a la vista de cliente
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Si hay algún error, devuelve al inicio
  return NextResponse.redirect(`${origin}/`)
}