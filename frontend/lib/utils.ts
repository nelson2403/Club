import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

export function formatarData(data: string | Date, formato = 'dd/MM/yyyy'): string {
  try {
    const d = typeof data === 'string' ? parseISO(data) : data
    if (!isValid(d)) return '-'
    return format(d, formato, { locale: ptBR })
  } catch {
    return '-'
  }
}

export function formatarDataHora(data: string | Date): string {
  return formatarData(data, 'dd/MM/yyyy HH:mm')
}

export function formatarCPF(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function formatarTelefone(tel: string): string {
  const nums = tel.replace(/\D/g, '')
  if (nums.length === 11) return nums.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  return nums.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

export function referenciaParaLabel(referencia: number): string {
  const ano = Math.floor(referencia / 100)
  const mes = referencia % 100
  return format(new Date(ano, mes - 1, 1), 'MMMM/yyyy', { locale: ptBR })
}

export function statusCorMensalidade(status: string): string {
  const mapa: Record<string, string> = {
    pago: 'text-green-600 bg-green-50',
    pendente: 'text-yellow-600 bg-yellow-50',
    vencido: 'text-red-600 bg-red-50',
    cancelado: 'text-gray-500 bg-gray-50',
  }
  return mapa[status] ?? 'text-gray-500 bg-gray-50'
}

export function statusCorSocio(status: string): string {
  const mapa: Record<string, string> = {
    ativo: 'text-green-600 bg-green-50',
    inativo: 'text-gray-500 bg-gray-50',
    bloqueado: 'text-red-600 bg-red-50',
  }
  return mapa[status] ?? 'text-gray-500 bg-gray-50'
}

export function formaPagamentoLabel(forma: string): string {
  const mapa: Record<string, string> = {
    dinheiro: 'Dinheiro',
    pix: 'PIX',
    cartao_debito: 'Cartão Débito',
    cartao_credito: 'Cartão Crédito',
    transferencia: 'Transferência',
  }
  return mapa[forma] ?? forma
}
