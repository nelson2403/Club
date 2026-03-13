'use client'

import { useState } from 'react'
import { Building2, Info, Shield, Save, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

function Secao({ titulo, icone: Icon, children }: { titulo: string; icone: React.ElementType; children: React.ReactNode }) {
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

const inputCls = 'w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

export default function ConfiguracoesPage() {
  const [salvo, setSalvo] = useState(false)
  const [clube, setClube] = useState({ nome: 'Clube de Sócios', cnpj: '', telefone: '', email: '', endereco: '', cidade: '', estado: '' })

  function handleSalvar() {
    setSalvo(true)
    setTimeout(() => setSalvo(false), 3000)
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {salvo && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Configurações salvas!</span>
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-slate-900">Configurações</h1>
        <p className="text-sm text-slate-500">Dados do clube e configurações do sistema</p>
      </div>

      <Secao titulo="Dados do Clube" icone={Building2}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome do Clube</label>
            <input value={clube.nome} onChange={e => setClube({ ...clube, nome: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">CNPJ</label>
            <input value={clube.cnpj} onChange={e => setClube({ ...clube, cnpj: e.target.value })} className={inputCls} placeholder="00.000.000/0000-00" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Telefone</label>
            <input value={clube.telefone} onChange={e => setClube({ ...clube, telefone: e.target.value })} className={inputCls} placeholder="(00) 00000-0000" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">E-mail</label>
            <input type="email" value={clube.email} onChange={e => setClube({ ...clube, email: e.target.value })} className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Endereço</label>
            <input value={clube.endereco} onChange={e => setClube({ ...clube, endereco: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cidade</label>
            <input value={clube.cidade} onChange={e => setClube({ ...clube, cidade: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Estado (UF)</label>
            <input value={clube.estado} maxLength={2} onChange={e => setClube({ ...clube, estado: e.target.value })} className={inputCls} placeholder="UF" />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={handleSalvar} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl">
            <Save className="w-4 h-4" /> Salvar Dados
          </button>
        </div>
      </Secao>

      <Secao titulo="Informações do Sistema" icone={Info}>
        <div className="space-y-3 text-sm">
          {[
            { label: 'Versão', valor: '1.0.0' },
            { label: 'Backend', valor: 'Supabase (PostgreSQL)' },
            { label: 'Frontend', valor: 'Next.js 16 + React + TypeScript' },
            { label: 'Ambiente', valor: process.env.NODE_ENV === 'production' ? 'Produção' : 'Desenvolvimento' },
          ].map(({ label, valor }) => (
            <div key={label} className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500 font-medium">{label}</span>
              <span className="text-slate-800">{valor}</span>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Segurança & Acesso" icone={Shield}>
        <div className="space-y-3">
          <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 space-y-2">
            <p className="font-semibold text-slate-800">Autenticação</p>
            <p>Gerenciada pelo Supabase Auth com sessões JWT seguras.</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 space-y-2">
            <p className="font-semibold text-slate-800">Controle de Acesso</p>
            <p>Row Level Security (RLS) ativo em todas as tabelas. Cada usuário acessa apenas os dados permitidos pelo seu perfil.</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <p className="font-semibold mb-1">Backup dos dados</p>
            <p className="text-xs">O Supabase realiza backups automáticos. Para exportar dados, acesse o Dashboard do Supabase → Storage → Backups.</p>
          </div>
        </div>
      </Secao>
    </div>
  )
}
