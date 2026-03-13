'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { TipoUsuario } from '@/types/database'
import {
  LayoutDashboard, Users, CreditCard, Package,
  BarChart3, DollarSign, Settings, UserCog,
  BellRing, ChevronDown, ChevronRight, AlertCircle,
  ShoppingBag, ClipboardList, TrendingUp, Boxes,
} from 'lucide-react'
import { useState } from 'react'

type NavChild = { href: string; label: string }

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  roles: TipoUsuario[]
  badge?: string
  children?: NavChild[]
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Geral',
    items: [
      {
        href: '/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        roles: ['admin', 'gerente', 'caixa', 'master', 'administrador', 'operador'],
      },
    ],
  },
  {
    label: 'Sócios',
    items: [
      {
        href: '/socios',
        label: 'Cadastro de Sócios',
        icon: Users,
        roles: ['admin', 'gerente', 'master', 'administrador'],
        children: [
          { href: '/socios', label: 'Todos os Sócios' },
          { href: '/socios/novo', label: 'Novo Sócio' },
        ],
      },
      {
        href: '/mensalidades',
        label: 'Mensalidades',
        icon: CreditCard,
        roles: ['admin', 'gerente', 'master', 'administrador'],
        children: [
          { href: '/mensalidades', label: 'Todas' },
          { href: '/mensalidades?status=pendente', label: 'Pendentes' },
          { href: '/mensalidades?status=vencido', label: 'Vencidas' },
          { href: '/mensalidades?status=pago', label: 'Pagas' },
        ],
      },
      {
        href: '/cobrancas',
        label: 'Inadimplentes',
        icon: AlertCircle,
        roles: ['admin', 'gerente', 'master', 'administrador'],
      },
      {
        href: '/planos',
        label: 'Planos',
        icon: ClipboardList,
        roles: ['admin', 'gerente', 'master', 'administrador'],
      },
    ],
  },
  {
    label: 'Bar & Estoque',
    items: [
      {
        href: '/estoque',
        label: 'Produtos',
        icon: Package,
        roles: ['admin', 'gerente', 'master', 'administrador'],
        children: [
          { href: '/estoque', label: 'Todos os Produtos' },
          { href: '/estoque/novo', label: 'Novo Produto' },
          { href: '/estoque?filtro=baixo', label: 'Estoque Baixo' },
          { href: '/estoque/movimentacoes', label: 'Movimentações' },
        ],
      },
      {
        href: '/estoque/categorias',
        label: 'Categorias',
        icon: Boxes,
        roles: ['admin', 'gerente', 'master', 'administrador'],
      },
      {
        href: '/vendas',
        label: 'Vendas do Bar',
        icon: ShoppingBag,
        roles: ['admin', 'gerente', 'master', 'administrador'],
      },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      {
        href: '/financeiro',
        label: 'Lançamentos',
        icon: DollarSign,
        roles: ['admin', 'gerente', 'master', 'administrador'],
      },
      {
        href: '/caixas',
        label: 'Controle de Caixa',
        icon: TrendingUp,
        roles: ['admin', 'gerente', 'master', 'administrador'],
      },
      {
        href: '/relatorios',
        label: 'Relatórios',
        icon: BarChart3,
        roles: ['admin', 'gerente', 'master', 'administrador'],
      },
    ],
  },
  {
    label: 'Administração',
    items: [
      {
        href: '/usuarios',
        label: 'Usuários & Acessos',
        icon: UserCog,
        roles: ['admin', 'master'],
      },
      {
        href: '/configuracoes',
        label: 'Configurações',
        icon: Settings,
        roles: ['admin', 'master'],
      },
    ],
  },
]

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const ativo = pathname === item.href || pathname.startsWith(item.href + '/')
  const temFilhos = !!item.children?.length
  const [aberto, setAberto] = useState(ativo)
  const Icon = item.icon

  if (!temFilhos) {
    return (
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          ativo
            ? 'bg-blue-600 text-white'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        )}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 truncate">{item.label}</span>
        {item.badge && (
          <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {item.badge}
          </span>
        )}
      </Link>
    )
  }

  return (
    <div>
      <button
        onClick={() => setAberto(!aberto)}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          ativo
            ? 'bg-blue-50 text-blue-700'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        )}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-left truncate">{item.label}</span>
        {aberto
          ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        }
      </button>

      {aberto && (
        <div className="ml-6 mt-0.5 space-y-0.5 border-l-2 border-slate-100 pl-3">
          {item.children!.map((filho) => (
            <Link
              key={filho.href}
              href={filho.href}
              className={cn(
                'block px-2 py-1.5 rounded-md text-xs transition-colors',
                pathname === filho.href.split('?')[0]
                  ? 'text-blue-700 font-semibold bg-blue-50'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              )}
            >
              {filho.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

interface SidebarProps {
  tipoUsuario: TipoUsuario
}

export function Sidebar({ tipoUsuario }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-white font-bold text-base">C</span>
        </div>
        <div>
          <p className="font-bold text-slate-900 text-sm leading-tight">Clube de Sócios</p>
          <p className="text-xs text-slate-400">Sistema de Gestão</p>
        </div>
      </div>

      {/* Nav por grupos */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
        {navGroups.map((grupo) => {
          const itensVisiveis = grupo.items.filter((item) =>
            item.roles.includes(tipoUsuario)
          )
          if (itensVisiveis.length === 0) return null

          return (
            <div key={grupo.label}>
              <p className="px-3 mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {grupo.label}
              </p>
              <div className="space-y-0.5">
                {itensVisiveis.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} />
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          Sistema online
        </div>
      </div>
    </aside>
  )
}
