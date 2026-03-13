'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { LayoutDashboard, ShoppingCart, ArrowLeft } from 'lucide-react'

type Modulo = 'gerencial' | 'pdv'

// Tela de seleção do módulo
function SelecaoModulo({ onSelecionar }: { onSelecionar: (m: Modulo) => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="w-full max-w-lg px-4">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-4">
            <span className="text-white text-3xl font-bold">C</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Clube de Sócios</h1>
          <p className="text-slate-400 mt-2">Selecione o módulo de acesso</p>
        </div>

        {/* Cards de seleção */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onSelecionar('gerencial')}
            className="group flex flex-col items-center gap-4 bg-white/5 hover:bg-blue-600
                       border border-white/10 hover:border-blue-500 rounded-2xl p-8
                       transition-all duration-200 hover:scale-105"
          >
            <div className="w-14 h-14 rounded-xl bg-blue-600 group-hover:bg-white/20
                            flex items-center justify-center transition-colors">
              <LayoutDashboard className="w-7 h-7 text-white" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-white text-lg">Gerencial</p>
              <p className="text-xs text-slate-400 mt-1">
                Dashboard, sócios,<br />financeiro e relatórios
              </p>
            </div>
          </button>

          <button
            onClick={() => onSelecionar('pdv')}
            className="group flex flex-col items-center gap-4 bg-white/5 hover:bg-green-600
                       border border-white/10 hover:border-green-500 rounded-2xl p-8
                       transition-all duration-200 hover:scale-105"
          >
            <div className="w-14 h-14 rounded-xl bg-green-600 group-hover:bg-white/20
                            flex items-center justify-center transition-colors">
              <ShoppingCart className="w-7 h-7 text-white" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-white text-lg">PDV — Bar</p>
              <p className="text-xs text-slate-400 mt-1">
                Ponto de venda,<br />caixa e vendas
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// Formulário de login
function FormLogin({
  modulo,
  onVoltar,
}: {
  modulo: Modulo
  onVoltar: () => void
}) {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  const isPdv = modulo === 'pdv'
  const corPrimaria = isPdv ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
  const corRing = isPdv ? 'focus:ring-green-500' : 'focus:ring-blue-500'
  const destino = isPdv ? '/pdv' : '/dashboard'

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error) {
      setErro('E-mail ou senha inválidos.')
      setLoading(false)
      return
    }

    // PDV: verificar se o usuário tem permissão (caixa, gerente ou admin)
    if (isPdv) {
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('tipo_usuario, ativo')
        .eq('id', data.user.id)
        .single()

      if (!usuario?.ativo) {
        await supabase.auth.signOut()
        setErro('Usuário inativo. Contate o administrador.')
        setLoading(false)
        return
      }
    }

    router.push(destino)
  }

  return (
    <div className={cn(
      'min-h-screen flex items-center justify-center',
      isPdv
        ? 'bg-gradient-to-br from-slate-900 to-green-950'
        : 'bg-gradient-to-br from-slate-900 to-blue-950'
    )}>
      <div className="w-full max-w-md px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={onVoltar}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                isPdv ? 'bg-green-600' : 'bg-blue-600'
              )}>
                {isPdv
                  ? <ShoppingCart className="w-5 h-5 text-white" />
                  : <LayoutDashboard className="w-5 h-5 text-white" />
                }
              </div>
              <div>
                <p className="font-bold text-gray-900 leading-tight">
                  {isPdv ? 'PDV — Bar' : 'Gerencial'}
                </p>
                <p className="text-xs text-gray-400">Clube de Sócios</p>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {isPdv ? 'Acesso ao Caixa' : 'Acesso Gerencial'}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {isPdv
              ? 'Entre com suas credenciais para operar o PDV.'
              : 'Entre com suas credenciais de administrador.'
            }
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(
                  'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm',
                  'focus:outline-none focus:ring-2 focus:border-transparent',
                  corRing
                )}
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className={cn(
                  'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm',
                  'focus:outline-none focus:ring-2 focus:border-transparent',
                  corRing
                )}
                placeholder="••••••••"
              />
            </div>

            {erro && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-60',
                corPrimaria
              )}
            >
              {loading ? 'Entrando...' : `Entrar no ${isPdv ? 'PDV' : 'Gerencial'}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const [modulo, setModulo] = useState<Modulo | null>(null)

  if (!modulo) {
    return <SelecaoModulo onSelecionar={setModulo} />
  }

  return <FormLogin modulo={modulo} onVoltar={() => setModulo(null)} />
}
