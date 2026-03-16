import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  const token = auth?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ role: null })

  // Verificar o token e obter o usuário
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return NextResponse.json({ role: null })

  const { data } = await supabaseAdmin
    .from('usuarios')
    .select('tipo_usuario')
    .eq('id', user.id)
    .maybeSingle()

  return NextResponse.json({ role: data?.tipo_usuario ?? null })
}
