// ============================================================
// Edge Function: enviar-cobrancas
// Invocada via cron:
//   - Dia 1 às 08:00 → tipo: "mensal"  (gera cobrança + envia WhatsApp)
//   - Dia 9 às 08:00 → tipo: "lembrete" (envia lembrete de vencimento amanhã)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')!
const ASAAS_SANDBOX = Deno.env.get('ASAAS_SANDBOX') === 'true'
const ASAAS_BASE = ASAAS_SANDBOX
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/v3'
const EVOLUTION_URL = Deno.env.get('EVOLUTION_API_URL')!
const EVOLUTION_KEY = Deno.env.get('EVOLUTION_API_KEY')!
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE_NAME')!
const APP_URL = Deno.env.get('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// ─── Helpers Asaas ──────────────────────────────────────────

async function asaasRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'access_token': ASAAS_API_KEY,
      ...options?.headers,
    },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = (json as any).errors?.[0]?.description ?? (json as any).message ?? `Asaas ${res.status}`
    throw new Error(msg)
  }
  return json as T
}

async function criarOuBuscarCliente(socio: any): Promise<string> {
  if (socio.cpf) {
    const cpf = socio.cpf.replace(/\D/g, '')
    const { data: existentes } = await asaasRequest<{ data: any[] }>(`/customers?cpfCnpj=${cpf}`)
    if (existentes?.length) return existentes[0].id
  }
  const cliente = await asaasRequest<{ id: string }>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: socio.nome,
      cpfCnpj: socio.cpf?.replace(/\D/g, '') ?? undefined,
      email: socio.email ?? undefined,
      mobilePhone: (socio.whatsapp ?? socio.telefone)?.replace(/\D/g, '') ?? undefined,
      externalReference: socio.id,
      notificationDisabled: true,
    }),
  })
  return cliente.id
}

async function criarCobranca(customerId: string, mensalidade: any, socioNome: string) {
  const ref = String(mensalidade.referencia_mes)
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const mesLabel = meses[parseInt(ref.substring(4, 6)) - 1]
  const descricao = `Mensalidade ${mesLabel}/${ref.substring(0, 4)} — ${socioNome}`

  const cobranca = await asaasRequest<any>('/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer: customerId,
      billingType: 'UNDEFINED',
      value: mensalidade.valor,
      dueDate: mensalidade.data_vencimento,
      description: descricao,
      externalReference: mensalidade.id,
      postalService: false,
    }),
  })

  const qr = await asaasRequest<any>(`/payments/${cobranca.id}/pixQrCode`)

  return {
    asaasId: cobranca.id,
    asaasCustomerId: customerId,
    pixQrcode: qr.encodedImage,
    pixCopiaECola: qr.payload,
    linkPagamento: cobranca.invoiceUrl,
    boletoUrl: cobranca.bankSlipUrl ?? null,
  }
}

// ─── Helper WhatsApp ─────────────────────────────────────────

async function enviarWhatsApp(telefone: string, mensagem: string) {
  const digitos = telefone.replace(/\D/g, '')
  const numero = digitos.startsWith('55') ? digitos : `55${digitos}`

  const res = await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY },
    body: JSON.stringify({ number: numero, text: mensagem }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('[WhatsApp] erro:', JSON.stringify(err))
  }
}

// ─── Tipo MENSAL — dia 1: gera cobrança + envia WhatsApp ─────

async function processarEnvioMensal() {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const referencia = parseInt(`${ano}${mes}`)

  // Buscar mensalidades pendentes do mês atual sem cobrança gerada
  const { data: mensalidades, error } = await supabase
    .from('mensalidades')
    .select(`
      id, valor, data_vencimento, referencia_mes, status, asaas_id, pix_copia_cola,
      socio:socio_id (id, nome, cpf, email, telefone, whatsapp, token_portal)
    `)
    .eq('referencia_mes', referencia)
    .eq('status', 'pendente')

  if (error) throw error

  const resultados = { enviados: 0, erros: 0, sem_telefone: 0 }

  for (const m of mensalidades ?? []) {
    const socio = (m as any).socio
    if (!socio) continue

    try {
      let cobrancaDados: any

      // Criar cobrança Asaas se ainda não existe
      if (!m.asaas_id || !m.pix_copia_cola) {
        const customerId = await criarOuBuscarCliente(socio)
        cobrancaDados = await criarCobranca(customerId, m, socio.nome)

        await supabase.from('mensalidades').update({
          asaas_id: cobrancaDados.asaasId,
          asaas_customer_id: cobrancaDados.asaasCustomerId,
          pix_qrcode: cobrancaDados.pixQrcode,
          pix_copia_cola: cobrancaDados.pixCopiaECola,
          link_pagamento: cobrancaDados.linkPagamento,
          boleto_url: cobrancaDados.boletoUrl,
          cobranca_gerada_em: new Date().toISOString(),
        }).eq('id', m.id)
      } else {
        cobrancaDados = {
          pixCopiaECola: m.pix_copia_cola,
          linkPagamento: null,
          boletoUrl: null,
        }
      }

      const telefone = socio.whatsapp ?? socio.telefone
      if (!telefone) { resultados.sem_telefone++; continue }

      const linkPortal = `${APP_URL}/portal/${socio.token_portal}`
      const ref = String(m.referencia_mes)
      const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
        'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
      const mesLabel = meses[parseInt(ref.substring(4, 6)) - 1]

      const mensagem = [
        `Olá, *${socio.nome}*! 👋`,
        ``,
        `Sua fatura de *${mesLabel}/${ref.substring(0, 4)}* está disponível.`,
        `💰 Valor: *R$ ${Number(m.valor).toFixed(2).replace('.', ',')}*`,
        `📅 Vencimento: *dia 10*`,
        ``,
        `Acesse para pagar via PIX ou Boleto:`,
        linkPortal,
        ``,
        `Qualquer dúvida, estamos à disposição! 😊`,
      ].join('\n')

      await enviarWhatsApp(telefone, mensagem)

      await supabase.from('mensalidades').update({
        enviado_whatsapp: true,
        data_envio_whatsapp: new Date().toISOString(),
      }).eq('id', m.id)

      resultados.enviados++
    } catch (err: any) {
      console.error(`[enviar-cobrancas] erro sócio ${socio?.id}:`, err.message)
      resultados.erros++
    }
  }

  return resultados
}

// ─── Tipo LEMBRETE — dia 9: aviso de vencimento amanhã ───────

async function processarLembrete() {
  // Busca mensalidades que vencem amanhã (dia 10) com status pendente
  const amanha = new Date()
  amanha.setDate(amanha.getDate() + 1)
  const dataAmanha = amanha.toISOString().split('T')[0]

  const { data: mensalidades, error } = await supabase
    .from('mensalidades')
    .select(`
      id, valor, data_vencimento, referencia_mes,
      socio:socio_id (id, nome, telefone, whatsapp, token_portal)
    `)
    .eq('data_vencimento', dataAmanha)
    .eq('status', 'pendente')

  if (error) throw error

  const resultados = { enviados: 0, erros: 0, sem_telefone: 0 }

  for (const m of mensalidades ?? []) {
    const socio = (m as any).socio
    if (!socio) continue

    const telefone = socio.whatsapp ?? socio.telefone
    if (!telefone) { resultados.sem_telefone++; continue }

    try {
      const linkPortal = `${APP_URL}/portal/${socio.token_portal}`
      const ref = String(m.referencia_mes)
      const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
        'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
      const mesLabel = meses[parseInt(ref.substring(4, 6)) - 1]

      const mensagem = [
        `⚠️ *Lembrete de vencimento!*`,
        ``,
        `Olá, *${socio.nome}*!`,
        `Sua fatura de *${mesLabel}/${ref.substring(0, 4)}* vence *amanhã (dia 10)*.`,
        `💰 Valor: *R$ ${Number(m.valor).toFixed(2).replace('.', ',')}*`,
        ``,
        `Evite a multa de R$ 10,00 e pague até amanhã:`,
        linkPortal,
      ].join('\n')

      await enviarWhatsApp(telefone, mensagem)
      resultados.enviados++
    } catch (err: any) {
      console.error(`[lembrete] erro sócio ${socio?.id}:`, err.message)
      resultados.erros++
    }
  }

  return resultados
}

// ─── Handler principal ───────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  let tipo = 'mensal'
  try {
    const body = await req.json()
    tipo = body?.tipo ?? 'mensal'
  } catch { /* body vazio */ }

  try {
    const resultado = tipo === 'lembrete'
      ? await processarLembrete()
      : await processarEnvioMensal()

    return new Response(JSON.stringify({ ok: true, tipo, ...resultado }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('[enviar-cobrancas]', err)
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
