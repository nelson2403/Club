'use client'

import React, { use } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, User, MapPin, Phone, FileText } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const supabase = createClient()

const schema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  cpf: z.string().optional(),
  telefone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  data_nascimento: z.string().optional(),
  sexo: z.string().optional(),
  profissao: z.string().optional(),
  estado_civil: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().max(2).optional(),
  cep: z.string().optional(),
  como_conheceu: z.string().optional(),
  observacoes: z.string().optional(),
  status: z.enum(['ativo', 'inativo', 'suspenso', 'cancelado']),
})

type FormData = z.infer<typeof schema>

const inputCls = cn(
  'w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white',
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'
)
const selectCls = cn(inputCls, 'cursor-pointer')

function Campo({ label, error, children }: {
  label: string; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

function Secao({ titulo, icone: Icon, children }: {
  titulo: string; icone: React.ElementType; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100 bg-slate-50">
        <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
          <Icon className="w-4 h-4 text-blue-600" />
        </div>
        <h2 className="text-sm font-bold text-slate-800">{titulo}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

export default function EditarSocioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const qc = useQueryClient()

  const { data: socio, isLoading } = useQuery({
    queryKey: ['socio', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('socios').select('*').eq('id', id).single()
      if (error) throw error
      return data
    },
  })

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: socio ? {
      nome: socio.nome ?? '',
      cpf: socio.cpf ?? '',
      telefone: socio.telefone ?? '',
      whatsapp: (socio as any).whatsapp ?? '',
      email: socio.email ?? '',
      data_nascimento: socio.data_nascimento ?? '',
      sexo: (socio as any).sexo ?? '',
      profissao: (socio as any).profissao ?? '',
      estado_civil: (socio as any).estado_civil ?? '',
      endereco: socio.endereco ?? '',
      numero: socio.numero ?? '',
      complemento: socio.complemento ?? '',
      bairro: socio.bairro ?? '',
      cidade: socio.cidade ?? '',
      estado: socio.estado ?? '',
      cep: socio.cep ?? '',
      como_conheceu: (socio as any).como_conheceu ?? '',
      observacoes: socio.observacoes ?? '',
      status: socio.status ?? 'ativo',
    } : undefined,
  })

  const { mutate, isPending, isError, error: mutError } = useMutation({
    mutationFn: async (data: FormData) => {
      const { error } = await supabase.from('socios').update(data).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['socio', id] })
      qc.invalidateQueries({ queryKey: ['socios'] })
      router.push(`/socios/${id}`)
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!socio) return <div className="text-slate-500">Sócio não encontrado.</div>

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/socios/${id}`}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Editar Sócio</h1>
          <p className="text-sm text-slate-500">{socio.nome}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-5">

        <Secao titulo="Dados Pessoais" icone={User}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Campo label="Nome completo *" error={errors.nome?.message}>
                <input {...register('nome')} className={inputCls} />
              </Campo>
            </div>
            <Campo label="CPF">
              <input {...register('cpf')} className={inputCls} placeholder="000.000.000-00" />
            </Campo>
            <Campo label="Data de Nascimento">
              <input {...register('data_nascimento')} type="date" className={inputCls} />
            </Campo>
            <Campo label="Sexo">
              <select {...register('sexo')} className={selectCls}>
                <option value="">Não informado</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
                <option value="O">Outro</option>
              </select>
            </Campo>
            <Campo label="Estado Civil">
              <select {...register('estado_civil')} className={selectCls}>
                <option value="">Não informado</option>
                <option value="solteiro">Solteiro(a)</option>
                <option value="casado">Casado(a)</option>
                <option value="divorciado">Divorciado(a)</option>
                <option value="viuvo">Viúvo(a)</option>
                <option value="uniao_estavel">União Estável</option>
              </select>
            </Campo>
            <div className="md:col-span-2">
              <Campo label="Profissão">
                <input {...register('profissao')} className={inputCls} />
              </Campo>
            </div>
            <Campo label="Status">
              <select {...register('status')} className={selectCls}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="suspenso">Suspenso</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </Campo>
          </div>
        </Secao>

        <Secao titulo="Contato" icone={Phone}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo label="Telefone">
              <input {...register('telefone')} className={inputCls} placeholder="(00) 00000-0000" />
            </Campo>
            <Campo label="WhatsApp">
              <input {...register('whatsapp')} className={inputCls} placeholder="(00) 00000-0000" />
            </Campo>
            <div className="md:col-span-2">
              <Campo label="E-mail" error={errors.email?.message}>
                <input {...register('email')} type="email" className={inputCls} />
              </Campo>
            </div>
          </div>
        </Secao>

        <Secao titulo="Endereço" icone={MapPin}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo label="CEP">
              <input {...register('cep')} className={inputCls} placeholder="00000-000" />
            </Campo>
            <div className="hidden md:block" />
            <div className="md:col-span-2">
              <Campo label="Endereço">
                <input {...register('endereco')} className={inputCls} />
              </Campo>
            </div>
            <Campo label="Número">
              <input {...register('numero')} className={inputCls} />
            </Campo>
            <Campo label="Complemento">
              <input {...register('complemento')} className={inputCls} />
            </Campo>
            <Campo label="Bairro">
              <input {...register('bairro')} className={inputCls} />
            </Campo>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Campo label="Cidade">
                  <input {...register('cidade')} className={inputCls} />
                </Campo>
              </div>
              <Campo label="UF">
                <input {...register('estado')} className={inputCls} maxLength={2} />
              </Campo>
            </div>
          </div>
        </Secao>

        <Secao titulo="Informações Adicionais" icone={FileText}>
          <div className="space-y-4">
            <Campo label="Como nos conheceu">
              <select {...register('como_conheceu')} className={selectCls}>
                <option value="">Não informado</option>
                <option value="indicacao">Indicação de amigo/familiar</option>
                <option value="redes_sociais">Redes Sociais</option>
                <option value="google">Google / Internet</option>
                <option value="panfleto">Panfleto</option>
                <option value="evento">Evento do clube</option>
                <option value="outro">Outro</option>
              </select>
            </Campo>
            <Campo label="Observações">
              <textarea {...register('observacoes')} rows={3} className={inputCls} />
            </Campo>
          </div>
        </Secao>

        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {(mutError as Error)?.message ?? 'Erro ao salvar'}
          </div>
        )}

        <div className="flex justify-end gap-3 pb-6">
          <Link href={`/socios/${id}`}
            className="px-5 py-2.5 text-sm border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors font-medium">
            Cancelar
          </Link>
          <button type="submit" disabled={isPending}
            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 shadow-sm">
            {isPending ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  )
}
