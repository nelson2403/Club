// ============================================================
// Edge Function: cobrar-mensalidades
// Roda diariamente às 08:00 via Supabase Cron
// Gera cobranças PIX para mensalidades que vencem amanhã
// e envia notificação via WhatsApp (Evolution API)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const ASAAS_BASE = Deno.env.get('ASAAS_SANDBOX') === 'true'
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/v3'

const ASAAS_KEY = Deno.env.get('ASAAS_API_KEY')!
const EVOLUTION_URL = Deno.env.get('EVOLUTION_API_URL')!
const EVOLUTION_KEY = Deno.env.get('EVOLUTION_API_KEY')!
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE_NAME')!
const APP_URL = Deno.env.get('NEXT_PUBLIC_APP_URL')!

// ─── Helpers ─────────────────────────────────────────────────

async function asaasRequest(path: string, options?: RequestInit) {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'access_token': ASAAS_KEY,
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).errors?.[0]?.description ?? `Asaas ${res.status}`)
  }
  return res.json()
}

async function evolutionEnviarTexto(numero: string, texto: string) {
  const digitos = numero.replace(/\D/g, '')
  const num = digitos.startsWith('55') ? digitos : `55${digitos}`

  const res = await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_KEY },
    body: JSON.stringify({ number: num, text: texto }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Evolution ${res.status}: ${JSON.stringify(err)}`)
  }
  return res.json()
}

async function evolutionEnviarImagem(numero: string, base64: string, legenda: string) {
  const digitos = numero.replace(/\D/g, '')
  const num = digitos.startsWith('55') ? digitos : `55${digitos}`

  const res = await fetch(`${EVOLUTION_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_KEY },
    body: JSON.stringify({
      number: num,
      mediaMessage: { mediatype: 'image', media: base64, caption: legenda },
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Evolution ${res.status}: ${JSON.stringify(err)}`)
  }
  return res.json()
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(data: string) {
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

function refMesLabel(ref: number) {
  const s = String(ref)
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  return `${meses[parseInt(s.substring(4, 6)) - 1]} ${s.substring(0, 4)}`
}

// ─── Lógica principal ────────────────────────────────────────

async function processarMensalidade(m: any) {
  const socio = m.socio
  const telefone = socio.whatsapp ?? socio.telefone

  if (!telefone) {
    console.log(`[SKIP] Sócio ${socio.nome} sem telefone cadastrado`)
    return { ok: false, motivo: 'sem_telefone' }
  }

  // 1. Criar ou buscar cliente Asaas
  let asaasCustomerId = m.asaas_customer_id

  if (!asaasCustomerId) {
    // Tentar encontrar por CPF
    if (socio.cpf) {
      const cpfLimpo = socio.cpf.replace(/\D/g, '')
      const { data: clientes } = await asaasRequest(`/customers?cpfCnpj=${cpfLimpo}`)
      if (clientes?.length > 0) {
        asaasCustomerId = clientes[0].id
      }
    }

    // Criar cliente se não encontrado
    if (!asaasCustomerId) {
      const cliente = await asaasRequest('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: socio.nome,
          cpfCnpj: socio.cpf?.replace(/\D/g, '') ?? undefined,
          email: socio.email ?? undefined,
          mobilePhone: telefone.replace(/\D/g, '') ?? undefined,
          externalReference: socio.id,
          notificationDisabled: true,
        }),
      })
      asaasCustomerId = cliente.id
    }
  }

  // 2. Criar cobrança PIX
  const ref = String(m.referencia_mes)
  const ano = ref.substring(0, 4)
  const mes = ref.substring(4, 6)
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const mesLabel = meses[parseInt(mes) - 1]

  const cobranca = await asaasRequest('/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer: asaasCustomerId,
      billingType: 'PIX',
      value: m.valor,
      dueDate: m.data_vencimento,
      description: `Mensalidade ${mesLabel}/${ano} — ${socio.nome}`,
      externalReference: m.id,
      postalService: false,
    }),
  })

  // 3. Buscar QR Code
  const qr = await asaasRequest(`/payments/${cobranca.id}/pixQrCode`)

  // 4. Salvar na mensalidade
  await supabase
    .from('mensalidades')
    .update({
      asaas_id: cobranca.id,
      asaas_customer_id: asaasCustomerId,
      pix_qrcode: qr.encodedImage,
      pix_copia_cola: qr.payload,
      link_pagamento: cobranca.invoiceUrl,
      cobranca_gerada_em: new Date().toISOString(),
    })
    .eq('id', m.id)

  // 5. Enviar WhatsApp
  const valorFormatado = formatarMoeda(m.valor)
  const vencimento = formatarData(m.data_vencimento)
  const linkPortal = `${APP_URL}/portal/${socio.token_portal}`

  const textoMsg = [
    `Olá, *${socio.nome}*! 👋`,
    ``,
    `Sua mensalidade do clube vence em *${vencimento}*.`,
    ``,
    `*Mês de referência:* ${refMesLabel(m.referencia_mes)}`,
    `*Valor:* ${valorFormatado}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `*PIX Copia e Cola:*`,
    ``,
    qr.payload,
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🔗 *Link de pagamento:*`,
    cobranca.invoiceUrl,
    ``,
    `📋 *Suas faturas:*`,
    linkPortal,
    ``,
    `Qualquer dúvida estamos à disposição! 😊`,
  ].join('\n')

  await evolutionEnviarTexto(telefone, textoMsg)
  await evolutionEnviarImagem(telefone, qr.encodedImage, `QR Code PIX — ${valorFormatado} — Venc. ${vencimento}`)

  // 6. Marcar como notificado
  await supabase
    .from('mensalidades')
    .update({
      enviado_whatsapp: true,
      data_envio_whatsapp: new Date().toISOString(),
    })
    .eq('id', m.id)

  // 7. Registrar no histórico
  await supabase.from('historico_cobrancas').insert({
    mensalidade_id: m.id,
    tipo_cobranca: 'whatsapp',
    status: 'enviado',
    observacao: `Cobrança automática enviada via WhatsApp para ${telefone}`,
  })

  console.log(`[OK] ${socio.nome} — ${valorFormatado} — venc. ${vencimento}`)
  return { ok: true }
}

// ─── Handler ─────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Segurança: aceita apenas chamadas autorizadas
  const authHeader = req.headers.get('Authorization')
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    // Buscar mensalidades com vencimento amanhã que ainda não foram cobradas
    const amanha = new Date()
    amanha.setDate(amanha.getDate() + 1)
    const amanhaStr = amanha.toISOString().split('T')[0]

    const { data: mensalidades, error } = await supabase
      .from('mensalidades')
      .select(`
        id, valor, data_vencimento, referencia_mes, status,
        asaas_id, asaas_customer_id,
        socio:socio_id (
          id, nome, cpf, email, telefone, whatsapp, token_portal
        )
      `)
      .eq('data_vencimento', amanhaStr)
      .in('status', ['pendente'])
      .eq('enviado_whatsapp', false)

    if (error) throw error

    if (!mensalidades || mensalidades.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhuma mensalidade para cobrar hoje', data: amanhaStr }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processando ${mensalidades.length} mensalidade(s) para ${amanhaStr}`)

    const resultados = []
    for (const m of mensalidades) {
      try {
        const resultado = await processarMensalidade(m)
        resultados.push({ id: m.id, ...resultado })
      } catch (err: any) {
        console.error(`[ERRO] Mensalidade ${m.id}:`, err.message)
        resultados.push({ id: m.id, ok: false, motivo: err.message })
      }
    }

    const sucessos = resultados.filter(r => r.ok).length
    const falhas = resultados.filter(r => !r.ok).length

    return new Response(
      JSON.stringify({ processados: resultados.length, sucessos, falhas, resultados }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('[FATAL]', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
