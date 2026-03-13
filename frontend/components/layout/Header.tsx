'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Usuario } from '@/types/database'
import { LogOut, User } from 'lucide-react'

interface HeaderProps {
  usuario: Usuario
}

const tipoLabel: Record<string, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  caixa: 'Operador de Caixa',
}

export function Header({ usuario }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900 leading-tight">{usuario.nome}</p>
          <p className="text-xs text-gray-400">{tipoLabel[usuario.tipo_usuario]}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <User className="w-4 h-4 text-blue-600" />
        </div>
        <button
          onClick={handleLogout}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
