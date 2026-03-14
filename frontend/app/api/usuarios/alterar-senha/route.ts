import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { user_id, nova_senha } = await req.json()

  if (!user_id || !nova_senha) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  if (nova_senha.length < 6) {
    return NextResponse.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, { status: 400 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Configuração do servidor incompleta' }, { status: 500 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  )

  const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
    password: nova_senha,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
