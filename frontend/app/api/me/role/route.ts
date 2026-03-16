import { NextResponse } from 'next/server'
import { createClient as createSupabase } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const supabaseAdmin = createSupabase(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ role: null })

  const { data } = await supabaseAdmin
    .from('usuarios')
    .select('tipo_usuario')
    .eq('id', user.id)
    .maybeSingle()

  return NextResponse.json({ role: data?.tipo_usuario ?? null })
}
