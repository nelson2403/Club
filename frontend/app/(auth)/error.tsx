'use client'

import { useEffect } from 'react'

export default function AuthError({
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-sm w-full">
        <p className="text-lg font-bold text-gray-900 mb-2">Erro ao carregar</p>
        <p className="text-sm text-gray-500 mb-5">{error.message || 'Tente novamente.'}</p>
        <button
          onClick={reset}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium
                     px-5 py-2.5 rounded-lg transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
