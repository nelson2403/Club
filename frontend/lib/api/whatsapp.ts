// ============================================================
// Cliente Evolution API — Envio de mensagens WhatsApp
// ============================================================

const BASE_URL = process.env.EVOLUTION_API_URL
const API_KEY = process.env.EVOLUTION_API_KEY
const INSTANCE = process.env.EVOLUTION_INSTANCE_NAME ?? 'clube'

function normalizar(numero: string): string {
  const digitos = numero.replace(/\D/g, '')
  return digitos.startsWith('55') ? digitos : `55${digitos}`
}

async function post(path: string, body: unknown) {
  if (!BASE_URL || !API_KEY) throw new Error('Evolution API não configurada')

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: API_KEY },
    body: JSON.stringify(body),
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Evolution ${res.status}: ${JSON.stringify(json)}`)
  }
  return json
}

/** Envia mensagem de texto */
export async function enviarTexto(numero: string, texto: string) {
  return post(`/message/sendText/${INSTANCE}`, {
    number: normalizar(numero),
    textMessage: { text: texto },
  })
}

/** Envia imagem a partir de base64 com legenda */
export async function enviarImagem(numero: string, base64: string, legenda: string) {
  return post(`/message/sendMedia/${INSTANCE}`, {
    number: normalizar(numero),
    mediaMessage: { mediatype: 'image', media: base64, caption: legenda },
  })
}

/** Monta e envia a mensagem de cobrança completa */
export async function enviarCobrancaWhatsApp(params: {
  numero: string
  nomesSocio: string
  valorFormatado: string
  vencimento: string        // dd/MM/yyyy
  mesReferencia: string     // ex: Janeiro/2025
  pixCopiaECola: string
  pixQrCodeBase64: string
  linkPagamento: string
  linkPortal: string
}) {
  const {
    numero, nomesSocio, valorFormatado, vencimento,
    mesReferencia, pixCopiaECola, pixQrCodeBase64, linkPagamento, linkPortal,
  } = params

  const texto = [
    `Olá, *${nomesSocio}*! 👋`,
    ``,
    `Sua mensalidade do clube vence amanhã, *${vencimento}*.`,
    ``,
    `📅 *Referência:* ${mesReferencia}`,
    `💰 *Valor:* ${valorFormatado}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📋 *PIX Copia e Cola:*`,
    ``,
    pixCopiaECola,
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🔗 *Link de pagamento:*`,
    linkPagamento,
    ``,
    `📱 *Suas faturas:*`,
    linkPortal,
    ``,
    `Qualquer dúvida estamos à disposição! 😊`,
  ].join('\n')

  await enviarTexto(numero, texto)
  await enviarImagem(numero, pixQrCodeBase64, `QR Code PIX — ${valorFormatado} — Venc. ${vencimento}`)
}
