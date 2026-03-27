'use client';

import { useState } from 'react';
import { useTeams, useDeleteTeam } from '@/hooks/use-teams';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import TeamCard from '@/components/teams/TeamCard';
import TeamDialog from '@/components/teams/TeamDialog';
import type { Team } from '@/lib/database.types';

export default function TeamsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const { data: teams = [], isLoading } = useTeams();
  const deleteMutation = useDeleteTeam();

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this team? All players will remain but be unassigned.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTeam(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-7 h-7 text-green-600 shrink-0" />
              Game Lineup Builder
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage your teams and game lineups</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
            <Plus className="w-5 h-5 mr-2" />
            New Team
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl h-48 animate-pulse" />)}
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No teams yet</h3>
            <p className="text-gray-500 mb-6">Create your first team to get started</p>
            <Button onClick={() => setDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-5 h-5 mr-2" />
              Create Team
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}

        <TeamDialog open={dialogOpen} onClose={handleCloseDialog} team={editingTeam} />
      </div>
    </div>
  );
}
