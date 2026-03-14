import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { nome, email, senha, tipo_usuario } = await req.json()

  if (!nome || !email || !senha || !tipo_usuario) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  if (senha.length < 6) {
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

  // Cria usuário sem e-mail de confirmação
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, tipo_usuario },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ user: data.user }, { status: 201 })
}
