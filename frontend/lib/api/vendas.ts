import { createClient } from '@/lib/supabase/client'
import type { Venda, ItemVenda, FormaPagamento, ItemCarrinho } from '@/types/database'

const supabase = createClient()

export const vendasApi = {
  criarVenda: async (params: {
    socio_id?: string
    forma_pagamento: FormaPagamento
    itens: ItemCarrinho[]
    desconto?: number
    valor_recebido?: number
    numero_autorizacao?: string
  }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const valor_subtotal = params.itens.reduce((acc, i) => acc + i.subtotal, 0)
    const desconto = params.desconto ?? 0
    const valor_total = valor_subtotal - desconto

    // 1. Criar cabeçalho da venda
    const { data: venda, error: errVenda } = await supabase
      .from('vendas')
      .insert({
        usuario_id: user.id,
        socio_id: params.socio_id,
        forma_pagamento: params.forma_pagamento,
        valor_subtotal,
        desconto,
        valor_total,
        valor_recebido: params.valor_recebido,
        observacao: params.numero_autorizacao ? `NSU/Autorização: ${params.numero_autorizacao}` : undefined,
        status: 'aberta',
      })
      .select()
      .single()

    if (errVenda) throw errVenda

    // 2. Inserir itens
    const itens = params.itens.map((item) => ({
      venda_id: venda.id,
      produto_id: item.produto.id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      desconto_item: 0,
    }))

    const { error: errItens } = await supabase.from('itens_venda').insert(itens)
    if (errItens) throw errItens

    // 3. Finalizar (baixa estoque, financeiro, caixa)
    const { data: resultado, error: errFinal } = await supabase
      .rpc('fn_finalizar_venda', {
        p_venda_id: venda.id,
        p_usuario_id: user.id,
        p_valor_recebido: params.valor_recebido ?? valor_total,
      })

    if (errFinal) throw errFinal
    return { venda, resultado }
  },

  listar: async (filtros?: {
    status?: string
    data_inicio?: string
    data_fim?: string
    usuario_id?: string
    page?: number
    limit?: number
  }) => {
    let query = supabase
      .from('vendas')
      .select(`
        *,
        usuarios(nome),
        socios(nome),
        itens_venda(
          *, produtos(nome)
        )
      `, { count: 'exact' })

    if (filtros?.status) query = query.eq('status', filtros.status)
    if (filtros?.usuario_id) query = query.eq('usuario_id', filtros.usuario_id)
    if (filtros?.data_inicio) query = query.gte('data_venda', filtros.data_inicio)
    if (filtros?.data_fim) query = query.lte('data_venda', filtros.data_fim)

    const page = filtros?.page ?? 1
    const limit = filtros?.limit ?? 20
    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1).order('data_venda', { ascending: false })

    const { data, error, count } = await query
    if (error) throw error
    return { data: data ?? [], total: count ?? 0 }
  },

  buscarPorId: async (id: string) => {
    const { data, error } = await supabase
      .from('vendas')
      .select(`
        *,
        usuarios(nome),
        socios(nome, cpf),
        itens_venda(*, produtos(nome, unidade_medida))
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  cancelar: async (id: string, motivo?: string) => {
    const { data, error } = await supabase
      .from('vendas')
      .update({ status: 'cancelada', observacao: motivo })
      .eq('id', id)
      .eq('status', 'aberta') // só cancela se ainda estiver aberta
      .select()
      .single()

    if (error) throw error
    return data
  },

  resumoDiario: async () => {
    const { data, error } = await supabase
      .from('vw_vendas_resumo_diario')
      .select('*')
      .limit(30)

    if (error) throw error
    return data ?? []
  },

  produtosMaisVendidos: async () => {
    const { data, error } = await supabase
      .from('vw_produtos_mais_vendidos')
      .select('*')
      .limit(20)

    if (error) throw error
    return data ?? []
  },
}
