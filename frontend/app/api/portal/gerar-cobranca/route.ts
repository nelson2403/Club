import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { gerarCobrancaCompleta } from '@/lib/api/asaas'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  let body: { mensalidade_id: string; token: string }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { mensalidade_id, token } = body

  if (!mensalidade_id || !token) {
    return NextResponse.json({ error: 'mensalidade_id e token são obrigatórios' }, { status: 400 })
  }

  // Verificar que o token pertence ao sócio dono desta mensalidade
  const { data: mensalidade, error: errMens } = await supabase
    .from('mensalidades')
    .select(`
      id, valor, data_vencimento, referencia_mes, status,
      asaas_id, pix_qrcode, pix_copia_cola, link_pagamento,
      socio:socio_id (
        id, nome, cpf, email, telefone, whatsapp, token_portal
      )
    `)
    .eq('id', mensalidade_id)
    .single()

  if (errMens || !mensalidade) {
    return NextResponse.json({ error: 'Mensalidade não encontrada' }, { status: 404 })
  }

  const socio = (mensalidade as any).socio
  if (!socio || socio.token_portal !== token) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  if (mensalidade.status === 'pago') {
    return NextResponse.json({ error: 'Mensalidade já paga' }, { status: 400 })
  }

  // Se já existe cobrança, retornar os dados existentes
  if (mensalidade.asaas_id && mensalidade.pix_copia_cola) {
    return NextResponse.json({
      asaas_id: mensalidade.asaas_id,
      pix_qrcode: mensalidade.pix_qrcode,
      pix_copia_cola: mensalidade.pix_copia_cola,
      link_pagamento: mensalidade.link_pagamento,
      boleto_url: (mensalidade as any).boleto_url ?? null,
    })
  }

  // Gerar nova cobrança no Asaas
  try {
    const cobranca = await gerarCobrancaCompleta({
      socio: {
        id: socio.id,
        nome: socio.nome,
        cpf: socio.cpf,
        email: socio.email,
        telefone: socio.whatsapp ?? socio.telefone,
      },
      mensalidade: {
        id: mensalidade.id,
        valor: mensalidade.valor,
        data_vencimento: mensalidade.data_vencimento,
        referencia_mes: mensalidade.referencia_mes,
      },
    })

    // Salvar dados da cobrança na mensalidade
    await supabase
      .from('mensalidades')
      .update({
        asaas_id: cobranca.asaasId,
        asaas_customer_id: cobranca.asaasCustomerId,
        pix_qrcode: cobranca.pixQrcode,
        pix_copia_cola: cobranca.pixCopiaECola,
        link_pagamento: cobranca.linkPagamento,
        boleto_url: cobranca.boletoUrl,
        cobranca_gerada_em: new Date().toISOString(),
      })
      .eq('id', mensalidade_id)

    return NextResponse.json({
      asaas_id: cobranca.asaasId,
      pix_qrcode: cobranca.pixQrcode,
      pix_copia_cola: cobranca.pixCopiaECola,
      link_pagamento: cobranca.linkPagamento,
      boleto_url: cobranca.boletoUrl,
    })
  } catch (err: any) {
    console.error('[gerar-cobranca]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
