'use client'

import { useEffect } from 'react'

export default function PDVError({
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-sm w-full">
        <p className="text-lg font-bold text-gray-900 mb-2">Erro no PDV</p>
        <p className="text-sm text-gray-500 mb-5">{error.message || 'Tente novamente.'}</p>
        <button
          onClick={reset}
          className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium
                     px-5 py-2.5 rounded-lg transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
