'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatarMoeda, cn } from '@/lib/utils'
import { Wallet, CheckCircle, Clock, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

const supabase = createClient()

export default function CaixasPage() {
  const { data: caixas, isLoading } = useQuery({
    queryKey: ['caixas', 'historico'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('caixas')
        .select(`
          *,
          operador:usuario_abertura(nome),
          fechador:usuario_fechamento(nome)
        `)
        .order('data_abertura', { ascending: false })
        .limit(50)
      if (error) throw error
      return data ?? []
    },
  })

  function formatarDataHora(dt: string) {
    return new Date(dt).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  function calcularDuracao(abertura: string, fechamento?: string) {
    const fim = fechamento ? new Date(fechamento) : new Date()
    const inicio = new Date(abertura)
    const minutos = Math.floor((fim.getTime() - inicio.getTime()) / 60000)
    const h = Math.floor(minutos / 60)
    const m = minutos % 60
    return h > 0 ? `${h}h ${m}min` : `${m}min`
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Fechamento de Caixa</h1>
        <p className="text-sm text-slate-500">Histórico de caixas abertos e fechados</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Operador</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Abertura</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Fechamento</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Duração</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Fundo Inicial</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Contagem Final</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-10 text-slate-400">Carregando...</td></tr>
            ) : (caixas ?? []).length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-slate-400">Nenhum caixa encontrado</td></tr>
            ) : (caixas ?? []).map((c: any) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-slate-500">
                        {(c.operador?.nome ?? '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-slate-800 text-sm">{c.operador?.nome ?? '—'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs">{formatarDataHora(c.data_abertura)}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">
                  {c.data_fechamento ? formatarDataHora(c.data_fechamento) : '—'}
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">{calcularDuracao(c.data_abertura, c.data_fechamento)}</td>
                <td className="px-4 py-3 text-right text-slate-700 font-medium text-sm">{formatarMoeda(c.valor_inicial)}</td>
                <td className="px-4 py-3 text-right">
                  {c.valor_final != null ? (
                    <div>
                      <span className="font-semibold text-slate-800">{formatarMoeda(c.valor_final)}</span>
                      {c.diferenca != null && c.diferenca !== 0 && (
                        <p className={cn('text-xs', c.diferenca > 0 ? 'text-green-600' : 'text-red-500')}>
                          {c.diferenca > 0 ? '+' : ''}{formatarMoeda(c.diferenca)}
                        </p>
                      )}
                    </div>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                    c.status === 'aberto' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'
                  )}>
                    {c.status === 'aberto'
                      ? <><Clock className="w-3 h-3" /> Aberto</>
                      : <><CheckCircle className="w-3 h-3" /> Fechado</>
                    }
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/caixas/${c.id}`}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Ver detalhes
                    <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
