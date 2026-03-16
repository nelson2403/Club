import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { gerarCobrancaCompleta } from '@/lib/api/asaas'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/admin/gerar-cobranca
 * Gera (ou retorna existente) cobrança Asaas (PIX + Boleto) para uma mensalidade.
 * Rota admin — não exige token_portal, exige sessão autenticada via Authorization header.
 *
 * Body: { mensalidade_id: string }
 */
export async function POST(req: NextRequest) {
  let body: { mensalidade_id: string }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { mensalidade_id } = body
  if (!mensalidade_id) {
    return NextResponse.json({ error: 'mensalidade_id é obrigatório' }, { status: 400 })
  }

  const { data: mensalidade, error: errMens } = await supabase
    .from('mensalidades')
    .select(`
      id, valor, data_vencimento, referencia_mes, status,
      asaas_id, pix_qrcode, pix_copia_cola, link_pagamento, boleto_url,
      socio:socio_id (
        id, nome, cpf, email, telefone, whatsapp
      )
    `)
    .eq('id', mensalidade_id)
    .single()

  if (errMens || !mensalidade) {
    return NextResponse.json({ error: 'Mensalidade não encontrada' }, { status: 404 })
  }

  if (mensalidade.status === 'pago') {
    return NextResponse.json({ error: 'Mensalidade já paga' }, { status: 400 })
  }

  // Se já existe cobrança, retornar dados existentes
  if (mensalidade.asaas_id && mensalidade.pix_copia_cola) {
    return NextResponse.json({
      asaas_id: mensalidade.asaas_id,
      pix_qrcode: mensalidade.pix_qrcode,
      pix_copia_cola: mensalidade.pix_copia_cola,
      link_pagamento: mensalidade.link_pagamento,
      boleto_url: mensalidade.boleto_url ?? null,
      ja_existia: true,
    })
  }

  const socio = (mensalidade as any).socio
  if (!socio) {
    return NextResponse.json({ error: 'Sócio não encontrado' }, { status: 404 })
  }

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
        // Asaas não aceita data no passado — usar hoje se já venceu
        data_vencimento: mensalidade.data_vencimento < new Date().toISOString().split('T')[0]
          ? new Date().toISOString().split('T')[0]
          : mensalidade.data_vencimento,
        referencia_mes: mensalidade.referencia_mes,
      },
    })

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
      ja_existia: false,
    })
  } catch (err: any) {
    console.error('[admin/gerar-cobranca]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
