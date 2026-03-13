import { createClient } from '@/lib/supabase/client'
import type { FormaPagamento } from '@/types/database'

const supabase = createClient()

export const mensalidadesApi = {
  listar: async (filtros?: {
    status?: string
    socio_id?: string
    referencia_mes?: number
    data_inicio?: string
    data_fim?: string
    page?: number
    limit?: number
  }) => {
    let query = supabase
      .from('mensalidades')
      .select(`
        *,
        socios(id, nome, cpf, telefone, email),
        planos(nome_plano)
      `, { count: 'exact' })

    if (filtros?.status) query = query.eq('status', filtros.status)
    if (filtros?.socio_id) query = query.eq('socio_id', filtros.socio_id)
    if (filtros?.referencia_mes) query = query.eq('referencia_mes', filtros.referencia_mes)
    if (filtros?.data_inicio) query = query.gte('data_vencimento', filtros.data_inicio)
    if (filtros?.data_fim) query = query.lte('data_vencimento', filtros.data_fim)

    const page = filtros?.page ?? 1
    const limit = filtros?.limit ?? 20
    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1).order('data_vencimento', { ascending: false })

    const { data, error, count } = await query
    if (error) throw error
    return { data: data ?? [], total: count ?? 0 }
  },

  inadimplentes: async () => {
    const { data, error } = await supabase
      .from('vw_inadimplentes')
      .select('*')
      .order('dias_inadimplente', { ascending: false })

    if (error) throw error
    return data ?? []
  },

  registrarPagamento: async (
    mensalidade_id: string,
    forma_pagamento: FormaPagamento,
    valor_pago: number,
    observacao?: string
  ) => {
    const { data, error } = await supabase
      .rpc('fn_pagar_mensalidade', {
        p_mensalidade_id: mensalidade_id,
        p_forma_pagamento: forma_pagamento,
        p_valor_pago: valor_pago,
        p_usuario_id: (await supabase.auth.getUser()).data.user?.id,
        p_observacao: observacao,
      })

    if (error) throw error
    return data
  },

  gerarMensalidades: async (ano: number, mes: number) => {
    const { data, error } = await supabase
      .rpc('fn_gerar_mensalidades', { p_ano: ano, p_mes: mes })

    if (error) throw error
    return data
  },

  marcarVencidas: async () => {
    const { data, error } = await supabase
      .rpc('fn_atualizar_mensalidades_vencidas')

    if (error) throw error
    return data
  },

  registrarCobranca: async (
    mensalidade_id: string,
    tipo: 'manual' | 'whatsapp' | 'email',
    observacao?: string
  ) => {
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('historico_cobrancas')
      .insert({
        mensalidade_id,
        tipo_cobranca: tipo,
        observacao,
        usuario_id: user?.id,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },
}
