'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCriarSocio } from '@/hooks/useSocios'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, User, MapPin, Phone, CreditCard, FileText, UserPlus, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const supabase = createClient()

const schema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  cpf: z.string().optional(),
  telefone: z.string().optional(),
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
  plano_id: z.string().optional(),
  data_inicio_plano: z.string().optional(),
  como_conheceu: z.string().optional(),
  observacoes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface DependenteForm {
  nome: string
  data_nascimento: string
  grau_parentesco: string
  cpf: string
}

const inputCls = cn(
  'w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white',
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'
)
const selectCls = cn(inputCls, 'cursor-pointer')

function Campo({ label, error, obrigatorio, children }: {
  label: string; error?: string; obrigatorio?: boolean; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label}{obrigatorio && <span className="text-red-500 ml-0.5">*</span>}
      </label>
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

const depVazio: DependenteForm = { nome: '', data_nascimento: '', grau_parentesco: '', cpf: '' }

function FormDependente({
  dep, onChange, onRemove,
}: {
  dep: DependenteForm
  onChange: (d: DependenteForm) => void
  onRemove: () => void
}) {
  return (
    <div className="border border-slate-200 rounded-xl p-4 space-y-3 relative bg-slate-50/50">
      <button type="button" onClick={onRemove}
        className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
        <Trash2 className="w-4 h-4" />
      </button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <Campo label="Nome completo" obrigatorio>
            <input value={dep.nome} onChange={(e) => onChange({ ...dep, nome: e.target.value })}
              className={inputCls} placeholder="Nome do dependente" />
          </Campo>
        </div>
        <Campo label="Grau de parentesco" obrigatorio>
          <select value={dep.grau_parentesco}
            onChange={(e) => onChange({ ...dep, grau_parentesco: e.target.value })}
            className={selectCls}>
            <option value="">Selecionar...</option>
            <option value="filho">Filho(a)</option>
            <option value="sobrinho">Sobrinho(a)</option>
            <option value="conjuge">Cônjuge / Companheiro(a)</option>
            <option value="pai_mae">Pai / Mãe</option>
            <option value="irmao">Irmão / Irmã</option>
            <option value="neto">Neto(a)</option>
            <option value="outro_familiar">Outro familiar</option>
          </select>
        </Campo>
        <Campo label="Data de nascimento">
          <input type="date" value={dep.data_nascimento}
            onChange={(e) => onChange({ ...dep, data_nascimento: e.target.value })}
            className={inputCls} />
        </Campo>
        <Campo label="CPF (opcional)">
          <input value={dep.cpf} onChange={(e) => onChange({ ...dep, cpf: e.target.value })}
            className={inputCls} placeholder="000.000.000-00" />
        </Campo>
      </div>
    </div>
  )
}

export default function NovoSocioPage() {
  const router = useRouter()
  const { mutate: criar, isPending } = useCriarSocio()
  const [dependentes, setDependentes] = useState<DependenteForm[]>([])

  const { data: planos } = useQuery({
    queryKey: ['planos'],
    queryFn: async () => {
      const { data } = await supabase
        .from('planos')
        .select('id, nome_plano, valor_mensalidade, dia_vencimento')
        .eq('ativo', true)
        .order('valor_mensalidade')
      return data ?? []
    },
  })

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { data_inicio_plano: new Date().toISOString().split('T')[0] },
  })

  const planoSelecionado = watch('plano_id')
  const planoEscolhido = planos?.find((p) => p.id === planoSelecionado)

  function adicionarDependente() {
    setDependentes([...dependentes, { ...depVazio }])
  }

  function atualizarDependente(i: number, d: DependenteForm) {
    const arr = [...dependentes]
    arr[i] = d
    setDependentes(arr)
  }

  function removerDependente(i: number) {
    setDependentes(dependentes.filter((_, idx) => idx !== i))
  }

  async function salvarDependentes(socioId: string) {
    const validos = dependentes.filter(d => d.nome.trim() && d.grau_parentesco)
    if (!validos.length) return
    await supabase.from('dependentes').insert(
      validos.map(d => ({
        socio_id: socioId,
        nome: d.nome.trim(),
        data_nascimento: d.data_nascimento || null,
        grau_parentesco: d.grau_parentesco,
        cpf: d.cpf || null,
        ativo: true,
      }))
    )
  }

  function onSubmit(data: FormData) {
    const { plano_id, data_inicio_plano, sexo, profissao, estado_civil, como_conheceu, ...dadosSocio } = data
    criar(
      { ...dadosSocio, status: 'ativo' },
      {
        onSuccess: async (socio) => {
          if (plano_id && data_inicio_plano) {
            await supabase.from('socios_planos').insert({
              socio_id: socio.id, plano_id,
              data_inicio: data_inicio_plano, status: 'ativo',
            })
          }
          await salvarDependentes(socio.id)
          router.push(`/socios/${socio.id}`)
        },
      }
    )
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/socios"
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Novo Sócio</h1>
          <p className="text-sm text-slate-500">Preencha os dados completos do sócio</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        <Secao titulo="Dados Pessoais" icone={User}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Campo label="Nome completo" obrigatorio error={errors.nome?.message}>
                <input {...register('nome')} className={inputCls} placeholder="Nome completo do sócio" autoFocus />
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
                <input {...register('profissao')} className={inputCls} placeholder="Profissão do sócio" />
              </Campo>
            </div>
          </div>
        </Secao>

        <Secao titulo="Contato" icone={Phone}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo label="Telefone / WhatsApp">
              <input {...register('telefone')} className={inputCls} placeholder="(00) 00000-0000" />
            </Campo>
            <Campo label="E-mail" error={errors.email?.message}>
              <input {...register('email')} type="email" className={inputCls} placeholder="email@exemplo.com" />
            </Campo>
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
                <input {...register('endereco')} className={inputCls} placeholder="Rua, Avenida..." />
              </Campo>
            </div>
            <Campo label="Número">
              <input {...register('numero')} className={inputCls} placeholder="Nº" />
            </Campo>
            <Campo label="Complemento">
              <input {...register('complemento')} className={inputCls} placeholder="Apto, Bloco..." />
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
                <input {...register('estado')} className={inputCls} maxLength={2} placeholder="UF" />
              </Campo>
            </div>
          </div>
        </Secao>

        <Secao titulo="Plano de Mensalidade" icone={CreditCard}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo label="Plano">
              <select {...register('plano_id')} className={selectCls}>
                <option value="">Selecionar plano (opcional)</option>
                {planos?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome_plano} — R$ {p.valor_mensalidade.toFixed(2)}/mês
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Data de Início">
              <input {...register('data_inicio_plano')} type="date" className={inputCls} />
            </Campo>
          </div>
          {planoEscolhido && (
            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-900">{planoEscolhido.nome_plano}</p>
                <p className="text-xs text-blue-500 mt-0.5">Vencimento todo dia {planoEscolhido.dia_vencimento}</p>
              </div>
              <p className="text-xl font-bold text-blue-700">
                R$ {planoEscolhido.valor_mensalidade.toFixed(2)}
                <span className="text-sm font-normal text-blue-400">/mês</span>
              </p>
            </div>
          )}
        </Secao>

        {/* ——— DEPENDENTES ——— */}
        <Secao titulo={`Dependentes${dependentes.length ? ` (${dependentes.length})` : ''}`} icone={UserPlus}>
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Dependentes não pagam mensalidade. Podem acessar o clube desde que o sócio titular esteja em dia.
            </p>

            {dependentes.map((dep, i) => (
              <FormDependente
                key={i}
                dep={dep}
                onChange={(d) => atualizarDependente(i, d)}
                onRemove={() => removerDependente(i)}
              />
            ))}

            <button
              type="button"
              onClick={adicionarDependente}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors w-full justify-center"
            >
              <Plus className="w-4 h-4" />
              Adicionar Dependente
            </button>
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
              <textarea {...register('observacoes')} rows={3} className={inputCls}
                placeholder="Informações adicionais, restrições, preferências..." />
            </Campo>
          </div>
        </Secao>

        <div className="flex justify-end gap-3 pb-6">
          <Link href="/socios"
            className="px-5 py-2.5 text-sm border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors font-medium">
            Cancelar
          </Link>
          <button type="submit" disabled={isPending}
            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 shadow-sm">
            {isPending ? 'Cadastrando...' : 'Cadastrar Sócio'}
          </button>
        </div>
      </form>
    </div>
  )
}
