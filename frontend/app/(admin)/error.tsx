'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex items-center justify-center h-full min-h-96">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-sm w-full">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <h2 className="text-base font-bold text-gray-900 mb-1">Erro ao carregar</h2>
        <p className="text-sm text-gray-500 mb-5">
          Não foi possível carregar esta página. Verifique sua conexão e tente novamente.
        </p>
        {error.message && (
          <p className="text-xs text-gray-400 font-mono bg-gray-50 px-3 py-2 rounded mb-4 text-left break-all">
            {error.message}
          </p>
        )}
        <div className="flex gap-3">
          <Link
            href="/dashboard"
            className="flex-1 flex items-center justify-center gap-1.5 border border-gray-300
                       text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Início
          </Link>
          <button
            onClick={reset}
            className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700
                       text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Tentar novamente
          </button>
        </div>
      </div>
    </div>
  )
}
