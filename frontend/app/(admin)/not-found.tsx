import Link from 'next/link'
import { FileQuestion, ArrowLeft } from 'lucide-react'

export default function AdminNotFound() {
  return (
    <div className="flex items-center justify-center h-full min-h-96">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-sm w-full">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <FileQuestion className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-4xl font-bold text-gray-200 mb-2">404</p>
        <h2 className="text-base font-bold text-gray-900 mb-1">Página não encontrada</h2>
        <p className="text-sm text-gray-500 mb-5">
          Este conteúdo não existe ou foi removido.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700
                     text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Dashboard
        </Link>
      </div>
    </div>
  )
}
