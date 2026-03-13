// Edge Function: Relatórios (PDF/Excel)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type TipoRelatorio =
  | 'inadimplentes'
  | 'vendas_bar'
  | 'produtos_mais_vendidos'
  | 'fluxo_caixa'
  | 'mensalidades'
  | 'estoque'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Token necessário')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Não autenticado')

    const url = new URL(req.url)
    const tipo = url.searchParams.get('tipo') as TipoRelatorio
    const dataInicio = url.searchParams.get('data_inicio')
    const dataFim = url.searchParams.get('data_fim')

    let data: unknown[] = []

    switch (tipo) {
      case 'inadimplentes': {
        const { data: rows, error } = await supabase
          .from('vw_inadimplentes')
          .select('*')
        if (error) throw error
        data = rows ?? []
        break
      }

      case 'vendas_bar': {
        let query = supabase
          .from('vendas')
          .select(`
            id, numero_venda, data_venda, valor_total, forma_pagamento, status,
            usuarios(nome),
            socios(nome),
            itens_venda(quantidade, preco_unitario, subtotal, produtos(nome))
          `)
          .eq('status', 'finalizada')

        if (dataInicio) query = query.gte('data_venda', dataInicio)
        if (dataFim) query = query.lte('data_venda', dataFim)

        const { data: rows, error } = await query.order('data_venda', { ascending: false })
        if (error) throw error
        data = rows ?? []
        break
      }

      case 'produtos_mais_vendidos': {
        const { data: rows, error } = await supabase
          .from('vw_produtos_mais_vendidos')
          .select('*')
        if (error) throw error
        data = rows ?? []
        break
      }

      case 'fluxo_caixa': {
        let query = supabase
          .from('movimentacoes_financeiras')
          .select(`
            id, descricao, valor, tipo, data, origem,
            categorias_financeiras(nome)
          `)

        if (dataInicio) query = query.gte('data', dataInicio)
        if (dataFim) query = query.lte('data', dataFim)

        const { data: rows, error } = await query.order('data', { ascending: false })
        if (error) throw error
        data = rows ?? []
        break
      }

      case 'mensalidades': {
        let query = supabase
          .from('mensalidades')
          .select(`
            id, valor, data_vencimento, data_pagamento, status, forma_pagamento,
            socios(nome, cpf, telefone),
            planos(nome_plano)
          `)

        if (dataInicio) query = query.gte('data_vencimento', dataInicio)
        if (dataFim) query = query.lte('data_vencimento', dataFim)

        const { data: rows, error } = await query.order('data_vencimento', { ascending: false })
        if (error) throw error
        data = rows ?? []
        break
      }

      case 'estoque': {
        const { data: rows, error } = await supabase
          .from('estoque')
          .select(`
            quantidade_atual, ultima_atualizacao,
            produtos(nome, codigo_barras, estoque_minimo, preco_venda, custo,
              categorias_produto(nome)
            )
          `)
        if (error) throw error
        data = rows ?? []
        break
      }

      default:
        throw new Error(`Tipo de relatório inválido: ${tipo}`)
    }

    return new Response(
      JSON.stringify({ success: true, tipo, total: data.length, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
