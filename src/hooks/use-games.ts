import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Game } from '@/lib/database.types';

export function useGames(teamId: string | null) {
  return useQuery<Game[]>({
    queryKey: ['games', teamId],
    queryFn: () => api<Game[]>(`/api/games?team_id=${teamId}`),
    enabled: !!teamId,
  });
}

export function useGame(gameId: string | null) {
  return useQuery<Game>({
    queryKey: ['game', gameId],
    queryFn: () => api<Game>(`/api/games/${gameId}`),
    enabled: !!gameId,
  });
}

export function useCreateGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (game: Omit<Game, 'id' | 'created_at' | 'attendance' | 'lineup' | 'guest_players'>) =>
      api<Game>('/api/games', { method: 'POST', body: JSON.stringify(game) }),
    onSuccess: (data: Game) =>
      queryClient.invalidateQueries({ queryKey: ['games', data.team_id] }),
  });
}

export function useUpdateGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<Game> & { id: string }) =>
      api<Game>(`/api/games/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
    onSuccess: (data: Game) => {
      queryClient.invalidateQueries({ queryKey: ['game', data.id] });
      queryClient.invalidateQueries({ queryKey: ['games', data.team_id] });
    },
  });
}

export function useDeleteGame(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/games/${id}`, { method: 'DELETE' }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['games', teamId] }),
  });
}

export function useUpdateGameAttendance(gameId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attendance: unknown) =>
      api(`/api/games/${gameId}`, { method: 'PATCH', body: JSON.stringify({ attendance }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['game', gameId] }),
  });
}

export function useUpdateGameLineup(gameId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lineup: unknown) =>
      api(`/api/games/${gameId}`, { method: 'PATCH', body: JSON.stringify({ lineup }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['game', gameId] }),
  });
}

export function useUpdateGameGuestPlayers(gameId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guest_players: unknown) =>
      api(`/api/games/${gameId}`, { method: 'PATCH', body: JSON.stringify({ guest_players }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['game', gameId] }),
  });
}
