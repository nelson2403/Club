'use client'

import { useState } from 'react'
import { formatarMoeda, formatarData } from '@/lib/utils'
import { Download, FileText, BarChart3, Users, Package, TrendingUp } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type TipoRelatorio = 'inadimplentes' | 'vendas_bar' | 'produtos_mais_vendidos' | 'mensalidades'

async function buscarRelatorio(tipo: TipoRelatorio, dataInicio?: string, dataFim?: string) {
  const params = new URLSearchParams({ tipo })
  if (dataInicio) params.set('data_inicio', dataInicio)
  if (dataFim) params.set('data_fim', dataFim)

  const resp = await fetch(`/api/relatorios?${params.toString()}`)
  if (!resp.ok) throw new Error('Erro ao buscar relatório')
  return resp.json()
}

function exportarExcel(dados: unknown[], nomeArquivo: string) {
  const ws = XLSX.utils.json_to_sheet(dados)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Relatório')
  XLSX.writeFile(wb, `${nomeArquivo}.xlsx`)
}

function exportarPDF(titulo: string, colunas: string[], linhas: string[][], nomeArquivo: string) {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(titulo, 14, 20)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Gerado em: ${formatarData(new Date().toISOString())}`, 14, 28)

  autoTable(doc, {
    head: [colunas],
    body: linhas,
    startY: 35,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  })

  doc.save(`${nomeArquivo}.pdf`)
}

const relatorios = [
  {
    id: 'inadimplentes',
    titulo: 'Sócios Inadimplentes',
    descricao: 'Lista de sócios com mensalidades em atraso',
    icone: Users,
    cor: 'text-red-600 bg-red-50',
  },
  {
    id: 'vendas_bar',
    titulo: 'Vendas do Bar',
    descricao: 'Histórico de vendas realizadas no PDV',
    icone: BarChart3,
    cor: 'text-blue-600 bg-blue-50',
  },
  {
    id: 'produtos_mais_vendidos',
    titulo: 'Produtos Mais Vendidos',
    descricao: 'Ranking de produtos por quantidade vendida',
    icone: TrendingUp,
    cor: 'text-green-600 bg-green-50',
  },
  {
    id: 'mensalidades',
    titulo: 'Mensalidades',
    descricao: 'Relatório de mensalidades por período',
    icone: FileText,
    cor: 'text-purple-600 bg-purple-50',
  },
] as const

export default function RelatoriosPage() {
  const [tipo, setTipo] = useState<TipoRelatorio | null>(null)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [dados, setDados] = useState<unknown[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleBuscar(tipoSelecionado: TipoRelatorio) {
    setLoading(true)
    setErro('')
    setTipo(tipoSelecionado)
    try {
      const resultado = await buscarRelatorio(tipoSelecionado, dataInicio, dataFim)
      setDados(resultado.data)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  function handleExportarExcel() {
    if (!tipo || !dados.length) return
    exportarExcel(dados, `relatorio_${tipo}`)
  }

  function handleExportarPDF() {
    if (!tipo || !dados.length) return

    const configs: Record<TipoRelatorio, { titulo: string; cols: string[]; extrator: (d: unknown) => string[] }> = {
      inadimplentes: {
        titulo: 'Sócios Inadimplentes',
        cols: ['Nome', 'CPF', 'Telefone', 'Mensalidades', 'Valor Devido', 'Dias Atraso'],
        extrator: (d: any) => [
          d.nome, d.cpf ?? '-', d.telefone ?? '-',
          String(d.total_mensalidades_abertas),
          formatarMoeda(d.valor_total_devido),
          String(d.dias_inadimplente),
        ],
      },
      vendas_bar: {
        titulo: 'Vendas do Bar',
        cols: ['Nº', 'Data', 'Total', 'Forma', 'Sócio'],
        extrator: (d: any) => [
          String(d.numero_venda),
          formatarData(d.data_venda),
          formatarMoeda(d.valor_total),
          d.forma_pagamento,
          d.socios?.nome ?? '-',
        ],
      },
      produtos_mais_vendidos: {
        titulo: 'Produtos Mais Vendidos',
        cols: ['Produto', 'Categoria', 'Qtd Vendida', 'Total Faturado'],
        extrator: (d: any) => [
          d.nome, d.categoria ?? '-',
          String(d.total_quantidade),
          formatarMoeda(d.total_faturado),
        ],
      },
      mensalidades: {
        titulo: 'Mensalidades',
        cols: ['Sócio', 'Plano', 'Vencimento', 'Valor', 'Status', 'Pagamento'],
        extrator: (d: any) => [
          d.socios?.nome ?? '-',
          d.planos?.nome_plano ?? '-',
          formatarData(d.data_vencimento),
          formatarMoeda(d.valor),
          d.status,
          d.data_pagamento ? formatarData(d.data_pagamento) : '-',
        ],
      },
    }

    const cfg = configs[tipo]
    exportarPDF(cfg.titulo, cfg.cols, dados.map(cfg.extrator), `relatorio_${tipo}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-sm text-gray-500">Gere e exporte relatórios do sistema</p>
      </div>

      {/* Filtros de data */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Filtros de Período</h2>
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Data Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Cards de relatórios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {relatorios.map(({ id, titulo, descricao, icone: Icon, cor }) => (
          <div key={id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start gap-4">
              <div className={`p-2.5 rounded-xl ${cor}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{titulo}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{descricao}</p>
              </div>
            </div>
            <button
              onClick={() => handleBuscar(id)}
              disabled={loading && tipo === id}
              className="mt-4 w-full bg-gray-900 hover:bg-gray-800 text-white text-sm
                         font-medium py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              {loading && tipo === id ? 'Gerando...' : 'Gerar Relatório'}
            </button>
          </div>
        ))}
      </div>

      {/* Resultado */}
      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
          {erro}
        </div>
      )}

      {dados.length > 0 && tipo && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">
              Resultado — {relatorios.find((r) => r.id === tipo)?.titulo}
              <span className="ml-2 text-gray-400 font-normal">({dados.length} registros)</span>
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleExportarExcel}
                className="flex items-center gap-1.5 text-xs font-medium text-green-600
                           hover:text-green-800 border border-green-200 hover:border-green-400
                           px-3 py-1.5 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Excel
              </button>
              <button
                onClick={handleExportarPDF}
                className="flex items-center gap-1.5 text-xs font-medium text-red-600
                           hover:text-red-800 border border-red-200 hover:border-red-400
                           px-3 py-1.5 rounded-lg transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                PDF
              </button>
            </div>
          </div>
          <div className="overflow-auto max-h-96 p-4">
            <pre className="text-xs text-gray-600 whitespace-pre-wrap">
              {JSON.stringify(dados.slice(0, 5), null, 2)}
              {dados.length > 5 && `\n... e mais ${dados.length - 5} registros`}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
