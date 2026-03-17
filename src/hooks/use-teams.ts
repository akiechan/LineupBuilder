import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Team } from '@/lib/database.types';

export function useTeams() {
  return useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: () => api<Team[]>('/api/teams'),
  });
}

export function useTeam(teamId: string | null) {
  return useQuery<Team>({
    queryKey: ['team', teamId],
    queryFn: () => api<Team>(`/api/teams/${teamId}`),
    enabled: !!teamId,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (team: Omit<Team, 'id' | 'created_at'>) =>
      api<Team>('/api/teams', { method: 'POST', body: JSON.stringify(team) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<Team> & { id: string }) =>
      api<Team>(`/api/teams/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/teams/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });
}
