import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabase } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const supabaseAdmin = createSupabase(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  // Verificar que quem chama é master
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: me } = await supabaseAdmin
    .from('usuarios')
    .select('tipo_usuario')
    .eq('id', user.id)
    .single()

  if (me?.tipo_usuario !== 'master') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { user_id } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'user_id obrigatório' }, { status: 400 })

  // Não deixar o master excluir a si mesmo
  if (user_id === user.id) {
    return NextResponse.json({ error: 'Você não pode excluir sua própria conta.' }, { status: 400 })
  }

  // Remover da tabela usuarios
  await supabaseAdmin.from('usuarios').delete().eq('id', user_id)

  // Remover do Supabase Auth
  const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
