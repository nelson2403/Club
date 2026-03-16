import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function calcularIdade(dataNasc: string): number {
  const hoje = new Date()
  const nasc = new Date(dataNasc)
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { nome, cpf, telefone, email, data_nascimento, plano_id, dependentes = [] } = body

  if (!nome?.trim()) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  }

  // Verificar CPF duplicado do titular
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

  // Criar sócio titular
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

  // Vincular plano ao titular
  if (plano_id) {
    await supabase.from('socios_planos').insert({
      socio_id: socio.id,
      plano_id,
      data_inicio: new Date().toISOString().split('T')[0],
      status: 'ativo',
    })
  }

  // Processar dependentes
  const dependentesValidos = (dependentes as any[]).filter(d => d.nome?.trim() && d.data_nascimento)

  for (const dep of dependentesValidos) {
    const idade = calcularIdade(dep.data_nascimento)
    const cpfDep = dep.cpf ? dep.cpf.replace(/\D/g, '') : null

    if (idade >= 18) {
      // Maior de idade → criar como sócio titular com mensalidade própria
      // Verificar CPF duplicado
      if (cpfDep) {
        const { data: existe } = await supabase
          .from('socios')
          .select('id')
          .eq('cpf', cpfDep)
          .maybeSingle()
        if (existe) continue // pula se já existe
      }

      const { data: socioAdulto } = await supabase
        .from('socios')
        .insert({
          nome: dep.nome.trim(),
          cpf: cpfDep,
          data_nascimento: dep.data_nascimento,
          status: 'ativo',
        })
        .select()
        .single()

      // Vincular ao mesmo plano do titular
      if (socioAdulto && plano_id) {
        await supabase.from('socios_planos').insert({
          socio_id: socioAdulto.id,
          plano_id,
          data_inicio: new Date().toISOString().split('T')[0],
          status: 'ativo',
        })
      }
    } else {
      // Menor de idade → dependente sem mensalidade
      await supabase.from('dependentes').insert({
        socio_id: socio.id,
        nome: dep.nome.trim(),
        cpf: cpfDep,
        data_nascimento: dep.data_nascimento,
        grau_parentesco: 'outro_familiar',
        ativo: true,
      })
    }
  }

  return NextResponse.json({ ok: true, socio_id: socio.id })
}
