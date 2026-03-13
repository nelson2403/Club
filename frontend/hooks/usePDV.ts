import { useState, useCallback } from 'react'
import type { ItemCarrinho, Produto, FormaPagamento } from '@/types/database'
import { vendasApi } from '@/lib/api/vendas'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function usePDV() {
  const qc = useQueryClient()
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [socioId, setSocioId] = useState<string | undefined>()
  const [desconto, setDesconto] = useState(0)

  const valorSubtotal = carrinho.reduce((acc, i) => acc + i.subtotal, 0)
  const valorTotal = Math.max(0, valorSubtotal - desconto)

  const adicionarItem = useCallback((produto: Produto, qtd = 1) => {
    setCarrinho((prev) => {
      const idx = prev.findIndex((i) => i.produto.id === produto.id)
      if (idx >= 0) {
        const novo = [...prev]
        const item = novo[idx]
        const novaQtd = item.quantidade + qtd
        novo[idx] = {
          ...item,
          quantidade: novaQtd,
          subtotal: novaQtd * item.preco_unitario,
        }
        return novo
      }
      return [
        ...prev,
        {
          produto,
          quantidade: qtd,
          preco_unitario: produto.preco_venda,
          subtotal: qtd * produto.preco_venda,
        },
      ]
    })
  }, [])

  const removerItem = useCallback((produtoId: string) => {
    setCarrinho((prev) => prev.filter((i) => i.produto.id !== produtoId))
  }, [])

  const alterarQuantidade = useCallback((produtoId: string, qtd: number) => {
    if (qtd <= 0) {
      removerItem(produtoId)
      return
    }
    setCarrinho((prev) =>
      prev.map((i) =>
        i.produto.id === produtoId
          ? { ...i, quantidade: qtd, subtotal: qtd * i.preco_unitario }
          : i
      )
    )
  }, [removerItem])

  const limparCarrinho = useCallback(() => {
    setCarrinho([])
    setSocioId(undefined)
    setDesconto(0)
  }, [])

  const finalizarVenda = useMutation({
    mutationFn: (params: { forma_pagamento: FormaPagamento; valor_recebido?: number; numero_autorizacao?: string }) =>
      vendasApi.criarVenda({
        socio_id: socioId,
        forma_pagamento: params.forma_pagamento,
        itens: carrinho,
        desconto,
        valor_recebido: params.valor_recebido,
        numero_autorizacao: params.numero_autorizacao,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendas'] })
      qc.invalidateQueries({ queryKey: ['caixa'] })
      qc.invalidateQueries({ queryKey: ['produtos'] })
      limparCarrinho()
    },
  })

  return {
    carrinho,
    socioId,
    desconto,
    valorSubtotal,
    valorTotal,
    totalItens: carrinho.reduce((acc, i) => acc + i.quantidade, 0),
    adicionarItem,
    removerItem,
    alterarQuantidade,
    limparCarrinho,
    setSocioId,
    setDesconto,
    finalizarVenda,
  }
}
