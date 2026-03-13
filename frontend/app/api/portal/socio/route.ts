import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 })
  }

  // Buscar sócio pelo token do portal
  const { data: socio, error: errSocio } = await supabase
    .from('socios')
    .select('id, nome, email, status, token_portal')
    .eq('token_portal', token)
    .single()

  if (errSocio || !socio) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 404 })
  }

  // Buscar mensalidades do sócio (últimos 12 meses + futuras)
  const { data: mensalidades } = await supabase
    .from('mensalidades')
    .select(`
      id, valor, data_vencimento, data_pagamento, referencia_mes,
      status, forma_pagamento,
      asaas_id, pix_qrcode, pix_copia_cola, link_pagamento
    `)
    .eq('socio_id', socio.id)
    .neq('status', 'cancelado')
    .order('referencia_mes', { ascending: false })
    .limit(24)

  return NextResponse.json({ socio, mensalidades: mensalidades ?? [] })
}
