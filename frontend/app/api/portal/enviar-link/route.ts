import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
  const { socio_id } = await req.json()

  if (!socio_id) {
    return NextResponse.json({ error: 'socio_id obrigatório' }, { status: 400 })
  }

  const { data: socio, error } = await supabase
    .from('socios')
    .select('id, nome, telefone, whatsapp, token_portal')
    .eq('id', socio_id)
    .single()

  if (error || !socio) {
    return NextResponse.json({ error: 'Sócio não encontrado' }, { status: 404 })
  }

  const telefone = socio.whatsapp ?? socio.telefone
  if (!telefone) {
    return NextResponse.json({ error: 'Sócio sem telefone cadastrado' }, { status: 400 })
  }

  if (!socio.token_portal) {
    return NextResponse.json({ error: 'Token do portal não gerado' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const linkPortal = `${appUrl}/portal/${socio.token_portal}`

  const digitos = telefone.replace(/\D/g, '')
  const numero = digitos.startsWith('55') ? digitos : `55${digitos}`

  const evolutionUrl = process.env.EVOLUTION_API_URL
  const evolutionKey = process.env.EVOLUTION_API_KEY
  const evolutionInstance = process.env.EVOLUTION_INSTANCE_NAME

  if (!evolutionUrl || !evolutionKey || !evolutionInstance) {
    return NextResponse.json({ error: 'Evolution API não configurada' }, { status: 500 })
  }

  const mensagem = [
    `Olá, *${socio.nome}*! 👋`,
    ``,
    `Acesse o link abaixo para visualizar suas mensalidades e realizar pagamentos:`,
    ``,
    `📋 *Seu portal de faturas:*`,
    linkPortal,
    ``,
    `Pelo portal você pode:`,
    `✅ Ver todas as suas mensalidades`,
    `💳 Gerar PIX para pagamento`,
    `📜 Consultar seu histórico`,
    ``,
    `Qualquer dúvida estamos à disposição! 😊`,
  ].join('\n')

  const res = await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': evolutionKey,
    },
    body: JSON.stringify({ number: numero, text: mensagem }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({ error: `Evolution API: ${JSON.stringify(err)}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true, link: linkPortal })
  } catch (err: any) {
    console.error('[enviar-link] ERRO:', err)
    return NextResponse.json({ error: err.message ?? 'Erro interno' }, { status: 500 })
  }
}
