// ============================================================
// Cliente Evolution API — WhatsApp
// Documentação: https://doc.evolution-api.com
// ============================================================

function getConfig() {
  const url = process.env.EVOLUTION_API_URL
  const key = process.env.EVOLUTION_API_KEY
  const instance = process.env.EVOLUTION_INSTANCE_NAME

  if (!url || !key || !instance) {
    throw new Error('Evolution API não configurada (EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_NAME)')
  }

  return { url, key, instance }
}

async function request(path: string, body: unknown) {
  const { url, key } = getConfig()

  const res = await fetch(`${url}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Evolution API ${res.status}: ${JSON.stringify(err)}`)
  }

  return res.json()
}

// Formata número brasileiro para WhatsApp (com código do país)
function formatarNumero(tel: string): string {
  const digitos = tel.replace(/\D/g, '')
  if (digitos.startsWith('55') && digitos.length >= 12) return digitos
  if (digitos.length === 11) return `55${digitos}` // celular com DDD
  if (digitos.length === 10) return `55${digitos}` // fixo com DDD
  return `55${digitos}`
}

// ─── Mensagens ────────────────────────────────────────────────

export async function enviarTexto(telefone: string, texto: string) {
  const { instance } = getConfig()
  return request(`/message/sendText/${instance}`, {
    number: formatarNumero(telefone),
    textMessage: { text: texto },
  })
}

export async function enviarImagem(telefone: string, base64: string, legenda: string) {
  const { instance } = getConfig()
  return request(`/message/sendMedia/${instance}`, {
    number: formatarNumero(telefone),
    mediaMessage: {
      mediatype: 'image',
      media: base64,
      caption: legenda,
    },
  })
}

export async function enviarDocumento(telefone: string, url: string, nomeArquivo: string) {
  const { instance } = getConfig()
  return request(`/message/sendMedia/${instance}`, {
    number: formatarNumero(telefone),
    mediaMessage: {
      mediatype: 'document',
      media: url,
      fileName: nomeArquivo,
    },
  })
}

// ─── Mensagem de cobrança completa ───────────────────────────

export async function enviarCobrancaWhatsApp(params: {
  telefone: string
  nomeSocio: string
  valor: number
  vencimento: string         // DD/MM/YYYY
  pixCopiaECola: string
  pixQrcode: string          // base64
  linkPagamento: string
  linkPortal: string
}) {
  const {
    telefone, nomeSocio, valor, vencimento,
    pixCopiaECola, pixQrcode, linkPagamento, linkPortal,
  } = params

  const valorFormatado = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  // 1. Mensagem principal com valor, vencimento e copia e cola
  const texto = [
    `Olá, *${nomeSocio}*! 👋`,
    ``,
    `Sua mensalidade do clube vence em *${vencimento}*.`,
    ``,
    `*Valor:* ${valorFormatado}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `*PIX Copia e Cola:*`,
    ``,
    pixCopiaECola,
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🔗 *Link de pagamento:*`,
    linkPagamento,
    ``,
    `📋 *Ver todas as suas faturas:*`,
    linkPortal,
    ``,
    `Em caso de dúvidas, entre em contato conosco. 😊`,
  ].join('\n')

  await enviarTexto(telefone, texto)

  // 2. Imagem do QR Code PIX
  await enviarImagem(
    telefone,
    pixQrcode,
    `QR Code PIX — ${valorFormatado} — Venc. ${vencimento}`,
  )
}
