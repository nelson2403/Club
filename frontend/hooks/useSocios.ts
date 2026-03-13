import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sociosApi } from '@/lib/api/socios'
import type { Socio } from '@/types/database'

export const SOCIOS_KEYS = {
  all: ['socios'] as const,
  lists: () => [...SOCIOS_KEYS.all, 'list'] as const,
  list: (filtros: object) => [...SOCIOS_KEYS.lists(), filtros] as const,
  detail: (id: string) => [...SOCIOS_KEYS.all, 'detail', id] as const,
}

export function useSocios(filtros?: Parameters<typeof sociosApi.listar>[0]) {
  return useQuery({
    queryKey: SOCIOS_KEYS.list(filtros ?? {}),
    queryFn: () => sociosApi.listar(filtros),
  })
}

export function useSocio(id: string) {
  return useQuery({
    queryKey: SOCIOS_KEYS.detail(id),
    queryFn: () => sociosApi.buscarPorId(id),
    enabled: !!id,
  })
}

export function useCriarSocio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: sociosApi.criar,
    onSuccess: () => qc.invalidateQueries({ queryKey: SOCIOS_KEYS.lists() }),
  })
}

export function useAtualizarSocio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dados }: { id: string } & Partial<Socio>) =>
      sociosApi.atualizar(id, dados),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: SOCIOS_KEYS.lists() })
      qc.invalidateQueries({ queryKey: SOCIOS_KEYS.detail(vars.id) })
    },
  })
}

export function useAlterarStatusSocio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Socio['status'] }) =>
      sociosApi.alterarStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: SOCIOS_KEYS.all }),
  })
}

export function useAtribuirPlano() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ socio_id, plano_id }: { socio_id: string; plano_id: string }) =>
      sociosApi.atribuirPlano(socio_id, plano_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: SOCIOS_KEYS.all }),
  })
}
