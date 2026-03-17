import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Player } from '@/lib/database.types';

export function usePlayers(teamId: string | null) {
  return useQuery<Player[]>({
    queryKey: ['players', teamId],
    queryFn: () => api<Player[]>(`/api/players?team_id=${teamId}`),
    enabled: !!teamId,
  });
}

export function useCreatePlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (player: Omit<Player, 'id' | 'created_at'>) =>
      api<Player>('/api/players', { method: 'POST', body: JSON.stringify(player) }),
    onSuccess: (data: Player) =>
      queryClient.invalidateQueries({ queryKey: ['players', data.team_id] }),
  });
}

export function useUpdatePlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<Player> & { id: string }) =>
      api<Player>(`/api/players/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
    onSuccess: (data: Player) =>
      queryClient.invalidateQueries({ queryKey: ['players', data.team_id] }),
  });
}

export function useDeletePlayer(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/players/${id}`, { method: 'DELETE' }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['players', teamId] }),
  });
}
