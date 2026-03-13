// ============================================================
// Cliente Asaas — PIX QR Code, Copia e Cola, Link de Pagamento
// Documentação: https://docs.asaas.com
// ============================================================

const BASE_URL = process.env.ASAAS_SANDBOX === 'true'
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/v3'

async function request<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const apiKey = process.env.ASAAS_API_KEY
  if (!apiKey) throw new Error('ASAAS_API_KEY não configurada')

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'access_token': apiKey,
      ...options?.headers,
    },
  })

  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    const msg = (json as any).errors?.[0]?.description
      ?? (json as any).message
      ?? `Asaas HTTP ${res.status}`
    throw new Error(msg)
  }

  return json as T
}

// ─── Tipagens ────────────────────────────────────────────────

export interface AsaasCliente {
  id: string
  name: string
  cpfCnpj?: string
  email?: string
  mobilePhone?: string
}

export interface AsaasCobranca {
  id: string
  status: string          // PENDING, RECEIVED, CONFIRMED, OVERDUE, etc.
  value: number
  dueDate: string
  billingType: string
  invoiceUrl: string      // link de pagamento
  bankSlipUrl: string | null
  externalReference?: string
}

export interface AsaasPixQrCode {
  encodedImage: string    // base64 da imagem PNG
  payload: string         // texto copia e cola
  expirationDate: string
}

// ─── Clientes ────────────────────────────────────────────────

export async function buscarClientePorCpf(cpf: string): Promise<AsaasCliente | null> {
  const cpfLimpo = cpf.replace(/\D/g, '')
  const data = await request<{ data: AsaasCliente[] }>(`/customers?cpfCnpj=${cpfLimpo}`)
  return data.data?.[0] ?? null
}

export async function criarCliente(params: {
  nome: string
  cpf?: string | null
  email?: string | null
  telefone?: string | null
  socioId: string
}): Promise<AsaasCliente> {
  return request<AsaasCliente>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: params.nome,
      cpfCnpj: params.cpf?.replace(/\D/g, '') ?? undefined,
      email: params.email ?? undefined,
      mobilePhone: params.telefone?.replace(/\D/g, '') ?? undefined,
      externalReference: params.socioId,
      notificationDisabled: true, // notificações via WhatsApp próprio
    }),
  })
}

/** Cria ou reutiliza cliente Asaas pelo CPF */
export async function criarOuBuscarCliente(params: {
  nome: string
  cpf?: string | null
  email?: string | null
  telefone?: string | null
  socioId: string
}): Promise<AsaasCliente> {
  if (params.cpf) {
    const existente = await buscarClientePorCpf(params.cpf)
    if (existente) return existente
  }
  return criarCliente(params)
}

// ─── Cobranças ───────────────────────────────────────────────

export async function criarCobrancaPix(params: {
  customerId: string
  valor: number
  vencimento: string   // YYYY-MM-DD
  descricao: string
  externalReference: string  // mensalidade_id
}): Promise<AsaasCobranca> {
  return request<AsaasCobranca>('/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer: params.customerId,
      billingType: 'PIX',
      value: params.valor,
      dueDate: params.vencimento,
      description: params.descricao,
      externalReference: params.externalReference,
      postalService: false,
    }),
  })
}

export async function buscarQrCodePix(paymentId: string): Promise<AsaasPixQrCode> {
  return request<AsaasPixQrCode>(`/payments/${paymentId}/pixQrCode`)
}

export async function buscarCobranca(paymentId: string): Promise<AsaasCobranca> {
  return request<AsaasCobranca>(`/payments/${paymentId}`)
}

export async function cancelarCobranca(paymentId: string): Promise<void> {
  await request(`/payments/${paymentId}`, { method: 'DELETE' })
}

// ─── Helper principal: gera cobrança completa com QR Code ───

export async function gerarCobrancaCompleta(params: {
  socio: {
    id: string
    nome: string
    cpf?: string | null
    email?: string | null
    telefone?: string | null
  }
  mensalidade: {
    id: string
    valor: number
    data_vencimento: string
    referencia_mes: number   // YYYYMM
  }
}): Promise<{
  asaasId: string
  asaasCustomerId: string
  pixQrcode: string
  pixCopiaECola: string
  linkPagamento: string
}> {
  const { socio, mensalidade } = params

  // 1. Criar ou buscar cliente
  const cliente = await criarOuBuscarCliente({
    nome: socio.nome,
    cpf: socio.cpf,
    email: socio.email,
    telefone: socio.telefone,
    socioId: socio.id,
  })

  // 2. Referência do mês legível (ex: 202501 → Janeiro/2025)
  const ref = String(mensalidade.referencia_mes)
  const ano = ref.substring(0, 4)
  const mes = ref.substring(4, 6)
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const mesLabel = meses[parseInt(mes) - 1]
  const descricao = `Mensalidade ${mesLabel}/${ano} — ${socio.nome}`

  // 3. Criar cobrança PIX
  const cobranca = await criarCobrancaPix({
    customerId: cliente.id,
    valor: mensalidade.valor,
    vencimento: mensalidade.data_vencimento,
    descricao,
    externalReference: mensalidade.id,
  })

  // 4. Buscar QR Code
  const qr = await buscarQrCodePix(cobranca.id)

  return {
    asaasId: cobranca.id,
    asaasCustomerId: cliente.id,
    pixQrcode: qr.encodedImage,
    pixCopiaECola: qr.payload,
    linkPagamento: cobranca.invoiceUrl,
  }
}
