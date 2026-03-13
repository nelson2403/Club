import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Cliente admin — bypassa RLS para atualizar mensalidades via webhook
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Mapeamento billingType Asaas → forma_pagamento do sistema
const FORMA: Record<string, string> = {
  PIX: 'pix',
  CREDIT_CARD: 'cartao_credito',
  DEBIT_CARD: 'cartao_debito',
  BOLETO: 'outro',
  TRANSFER: 'transferencia',
  UNDEFINED: 'pix',
}

export async function POST(req: NextRequest) {
  // Verificar token de segurança enviado pelo Asaas
  const tokenHeader = req.headers.get('asaas-access-token')
  const tokenQuery = req.nextUrl.searchParams.get('token')
  const token = tokenHeader ?? tokenQuery

  if (!process.env.ASAAS_WEBHOOK_TOKEN || token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { event, payment } = body

  // Eventos que confirmam o pagamento
  if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
    const { data: mensalidade, error } = await supabase
      .from('mensalidades')
      .select('id, socio_id, valor')
      .eq('asaas_id', payment.id)
      .single()

    if (!error && mensalidade) {
      await supabase
        .from('mensalidades')
        .update({
          status: 'pago',
          data_pagamento: new Date().toISOString(),
          valor_pago: payment.value ?? mensalidade.valor,
          forma_pagamento: FORMA[payment.billingType] ?? 'pix',
          observacao: `Pago via ${payment.billingType} — ID Asaas: ${payment.id}`,
        })
        .eq('id', mensalidade.id)

      // Registrar no histórico de cobranças
      await supabase.from('historico_cobrancas').insert({
        mensalidade_id: mensalidade.id,
        tipo_cobranca: 'sistema',
        status: 'pago',
        observacao: `Confirmação automática via webhook Asaas. Evento: ${event}`,
      })
    }
  }

  // Pagamento estornado ou cancelado — voltar para pendente
  if (event === 'PAYMENT_REFUNDED' || event === 'PAYMENT_CHARGEBACK_REQUESTED') {
    await supabase
      .from('mensalidades')
      .update({
        status: 'pendente',
        data_pagamento: null,
        valor_pago: null,
        forma_pagamento: null,
        observacao: `Estorno/chargeback — ID Asaas: ${payment.id}`,
      })
      .eq('asaas_id', payment.id)
  }

  return NextResponse.json({ received: true })
}
