import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { nome, cpf, telefone, email, data_nascimento, plano_id } = body

  if (!nome?.trim()) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  }

  // Verificar CPF duplicado
  if (cpf) {
    const cpfLimpo = cpf.replace(/\D/g, '')
    const { data: existente } = await supabase
      .from('socios')
      .select('id')
      .eq('cpf', cpfLimpo)
      .maybeSingle()

    if (existente) {
      return NextResponse.json({ error: 'CPF já cadastrado no sistema.' }, { status: 409 })
    }
  }

  // Criar sócio
  const { data: socio, error } = await supabase
    .from('socios')
    .insert({
      nome: nome.trim(),
      cpf: cpf ? cpf.replace(/\D/g, '') : null,
      telefone: telefone?.replace(/\D/g, '') || null,
      whatsapp: telefone?.replace(/\D/g, '') || null,
      email: email?.trim() || null,
      data_nascimento: data_nascimento || null,
      status: 'ativo',
    })
    .select()
    .single()

  if (error) {
    console.error('[public/cadastro]', error)
    return NextResponse.json({ error: 'Erro ao cadastrar. Tente novamente.' }, { status: 500 })
  }

  // Vincular plano se informado
  if (plano_id) {
    await supabase.from('socios_planos').insert({
      socio_id: socio.id,
      plano_id,
      data_inicio: new Date().toISOString().split('T')[0],
      status: 'ativo',
    })
  }

  return NextResponse.json({ ok: true, socio_id: socio.id })
}
