'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Lock, Unlock, GripVertical, X } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import type { Player, LineupPeriod, AttendanceRecord } from '@/lib/database.types';

export default function LineupDisplay({
  lineup,
  players,
  attendance,
  onUpdateLineup,
}: {
  lineup: LineupPeriod[];
  players: Player[];
  attendance: AttendanceRecord[];
  onUpdateLineup: (lineup: LineupPeriod[]) => void;
}) {
  const [editMode, setEditMode] = useState(false);

  const getPlayerById = (id: string) => players.find(p => p.id === id);

  const toggleLock = (periodIndex: number, playerIndex: number) => {
    const newLineup = lineup.map(p => ({ ...p, players: [...p.players] }));
    newLineup[periodIndex].players[playerIndex] = {
      ...newLineup[periodIndex].players[playerIndex],
      locked: !newLineup[periodIndex].players[playerIndex].locked,
    };
    onUpdateLineup(newLineup);
  };

  const swapPlayer = (periodIndex: number, playerIndex: number, newPlayerId: string) => {
    const newLineup = lineup.map(p => ({ ...p, players: [...p.players] }));
    const oldPlayerId = newLineup[periodIndex].players[playerIndex].player_id;
    if (oldPlayerId === newPlayerId) return;

    for (let qi = 0; qi < newLineup.length; qi++) {
      if (newLineup[qi].goalie === newPlayerId) {
        newLineup[qi].goalie = oldPlayerId;
        newLineup[periodIndex].players[playerIndex] = {
          ...newLineup[periodIndex].players[playerIndex],
          player_id: newPlayerId,
        };
        onUpdateLineup(newLineup);
        return;
      }
      for (let pi = 0; pi < newLineup[qi].players.length; pi++) {
        if (newLineup[qi].players[pi].player_id === newPlayerId) {
          newLineup[qi].players[pi] = {
            ...newLineup[qi].players[pi],
            player_id: oldPlayerId,
          };
          newLineup[periodIndex].players[playerIndex] = {
            ...newLineup[periodIndex].players[playerIndex],
            player_id: newPlayerId,
          };
          onUpdateLineup(newLineup);
          return;
        }
      }
    }

    newLineup[periodIndex].players[playerIndex] = {
      ...newLineup[periodIndex].players[playerIndex],
      player_id: newPlayerId,
    };
    onUpdateLineup(newLineup);
  };

  const swapGoalie = (periodIndex: number, newGoalieId: string) => {
    const newLineup = lineup.map(p => ({ ...p, players: [...p.players] }));
    const oldGoalieId = newLineup[periodIndex].goalie;
    if (oldGoalieId === newGoalieId) return;

    for (let qi = 0; qi < newLineup.length; qi++) {
      if (newLineup[qi].goalie === newGoalieId) {
        newLineup[qi].goalie = oldGoalieId;
        newLineup[periodIndex].goalie = newGoalieId;
        onUpdateLineup(newLineup);
        return;
      }
      for (let pi = 0; pi < newLineup[qi].players.length; pi++) {
        if (newLineup[qi].players[pi].player_id === newGoalieId) {
          newLineup[qi].players[pi] = {
            ...newLineup[qi].players[pi],
            player_id: oldGoalieId,
          };
          newLineup[periodIndex].goalie = newGoalieId;
          onUpdateLineup(newLineup);
          return;
        }
      }
    }

    newLineup[periodIndex].goalie = newGoalieId;
    onUpdateLineup(newLineup);
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination, type } = result;
    if (!destination) return;

    if (type === 'quarter') {
      if (source.index === destination.index) return;
      const newLineup = lineup.map(p => ({ ...p, players: [...p.players] }));
      const [moved] = newLineup.splice(source.index, 1);
      newLineup.splice(destination.index, 0, moved);
      newLineup.forEach((p, i) => { p.period = i + 1; });
      onUpdateLineup(newLineup);
      return;
    }

    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newLineup = lineup.map(p => ({ ...p, players: [...p.players] }));
    const srcPeriodIndex = parseInt(source.droppableId);
    const dstPeriodIndex = parseInt(destination.droppableId);
    const srcPlayer = newLineup[srcPeriodIndex].players[source.index];
    const dstPlayer = newLineup[dstPeriodIndex].players[destination.index];

    if (srcPlayer.locked) return;

    if (source.droppableId === destination.droppableId) {
      newLineup[srcPeriodIndex].players.splice(source.index, 1);
      newLineup[srcPeriodIndex].players.splice(destination.index, 0, srcPlayer);
    } else {
      if (dstPlayer && !dstPlayer.locked) {
        newLineup[srcPeriodIndex].players[source.index] = dstPlayer;
        newLineup[dstPeriodIndex].players[destination.index] = srcPlayer;
      }
    }
    onUpdateLineup(newLineup);
  };

  const removePlayer = (periodIndex: number, playerIndex: number) => {
    const newLineup = lineup.map(p => ({ ...p, players: [...p.players] }));
    newLineup[periodIndex].players.splice(playerIndex, 1);
    onUpdateLineup(newLineup);
  };

  // All players available for the game (playing + late)
  const availablePlayerIds = new Set<string>();
  if (attendance.length === 0) {
    players.forEach(p => availablePlayerIds.add(p.id));
  } else {
    attendance.forEach(a => {
      if (a.status === 'playing' || a.status === 'late') availablePlayerIds.add(a.player_id);
    });
  }

  // All players in the lineup (for dropdowns)
  const allLineupPlayerIds = new Set<string>();
  lineup.forEach(p => {
    if (p.goalie) allLineupPlayerIds.add(p.goalie);
    p.players.forEach(s => allLineupPlayerIds.add(s.player_id));
  });
  const lineupPlayers = players.filter(p => allLineupPlayerIds.has(p.id));

  const playerLabel = (p: Player) =>
    p.jersey_number != null ? `#${p.jersey_number} ${p.name}` : p.name;

  // Compute bench players per period
  const getBenchPlayers = (period: LineupPeriod) => {
    const activeIds = new Set<string>();
    if (period.goalie) activeIds.add(period.goalie);
    period.players.forEach(s => activeIds.add(s.player_id));
    return players
      .filter(p => availablePlayerIds.has(p.id) && !activeIds.has(p.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center print:hidden">
        <h2 className="text-xl font-bold">Generated Lineup</h2>
        <button onClick={() => setEditMode(!editMode)} className="text-sm text-blue-600 hover:text-blue-700">
          {editMode ? 'Done Editing' : 'Edit Lineup'}
        </button>
      </div>

      {editMode && (
        <p className="text-xs text-gray-500 print:hidden">
          Drag quarters to reorder. Drag players or use dropdowns to swap. Lock players to preserve on regeneration.
        </p>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="quarters" type="quarter" direction="horizontal">
          {(qProvided) => (
            <div
              ref={qProvided.innerRef}
              {...qProvided.droppableProps}
              className="grid grid-cols-1 md:grid-cols-4 gap-4"
            >
              {lineup.map((period, periodIndex) => {
                const goalie = getPlayerById(period.goalie);
                const bench = getBenchPlayers(period);
                return (
                  <Draggable
                    key={`quarter-${periodIndex}`}
                    draggableId={`quarter-${periodIndex}`}
                    index={periodIndex}
                    isDragDisabled={!editMode}
                  >
                    {(qDragProvided, qSnapshot) => (
                      <Card
                        ref={qDragProvided.innerRef}
                        {...qDragProvided.draggableProps}
                        className={`print:break-inside-avoid ${qSnapshot.isDragging ? 'shadow-xl ring-2 ring-green-300' : ''}`}
                      >
                        <CardContent className="pt-4 px-3">
                          {/* Quarter header - drag handle */}
                          <div
                            {...qDragProvided.dragHandleProps}
                            className={`flex items-center justify-center gap-1 mb-3 rounded py-1 ${editMode ? 'cursor-grab active:cursor-grabbing hover:bg-green-50' : ''}`}
                          >
                            {editMode && <GripVertical className="w-4 h-4 text-green-400" />}
                            <h3 className="font-bold text-sm text-green-700">Q{period.period}</h3>
                          </div>

                          {/* Goalie */}
                          {period.goalie && (
                          <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-900 mb-0.5">
                              <Shield className="w-3.5 h-3.5" />
                              Goalie
                            </div>
                            {editMode ? (
                              <select
                                value={period.goalie}
                                onChange={(e) => swapGoalie(periodIndex, e.target.value)}
                                className="w-full text-sm font-semibold text-blue-900 bg-white border border-blue-200 rounded px-1.5 py-1 print:hidden"
                              >
                                {lineupPlayers
                                  .sort((a, b) => a.name.localeCompare(b.name))
                                  .map(p => (
                                    <option key={p.id} value={p.id}>{playerLabel(p)}</option>
                                  ))}
                              </select>
                            ) : (
                              <div className="font-semibold text-sm text-blue-900 truncate">
                                {goalie?.name || 'Unknown'}
                                {goalie?.jersey_number != null && ` (#${goalie.jersey_number})`}
                              </div>
                            )}
                          </div>
                          )}

                          {/* Field players */}
                          <div>
                            <div className="text-xs font-medium text-gray-500 mb-1.5">Field Players</div>
                            <Droppable droppableId={String(periodIndex)} type="player" isDropDisabled={!editMode}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={`space-y-1.5 min-h-[40px] rounded transition-colors ${snapshot.isDraggingOver ? 'bg-green-50' : ''}`}
                                >
                                  {period.players.map((playerSlot, playerIndex) => {
                                    const player = getPlayerById(playerSlot.player_id);
                                    return (
                                      <Draggable
                                        key={`${periodIndex}-${playerSlot.player_id}`}
                                        draggableId={`${periodIndex}-${playerSlot.player_id}`}
                                        index={playerIndex}
                                        isDragDisabled={!editMode || playerSlot.locked}
                                      >
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className={`p-1.5 rounded border text-sm ${
                                              playerSlot.locked
                                                ? 'bg-yellow-50 border-yellow-300'
                                                : snapshot.isDragging
                                                ? 'bg-blue-50 border-blue-300 shadow-lg'
                                                : 'bg-white border-gray-200'
                                            }`}
                                          >
                                            <div className="flex items-center gap-1.5">
                                              {editMode && !playerSlot.locked && (
                                                <div {...provided.dragHandleProps} className="text-gray-400 cursor-grab active:cursor-grabbing shrink-0">
                                                  <GripVertical className="w-3.5 h-3.5" />
                                                </div>
                                              )}
                                              {editMode ? (
                                                <select
                                                  value={playerSlot.player_id}
                                                  onChange={(e) => swapPlayer(periodIndex, playerIndex, e.target.value)}
                                                  className="flex-1 min-w-0 text-xs font-medium bg-gray-50 border border-gray-200 rounded px-1 py-0.5 print:hidden"
                                                >
                                                  {lineupPlayers
                                                    .sort((a, b) => a.name.localeCompare(b.name))
                                                    .map(p => (
                                                      <option key={p.id} value={p.id}>{playerLabel(p)}</option>
                                                    ))}
                                                </select>
                                              ) : (
                                                <div className="flex-1 min-w-0 truncate text-xs font-medium">
                                                  {player?.name || 'Unknown'}
                                                  {player?.jersey_number != null && ` (#${player.jersey_number})`}
                                                </div>
                                              )}
                                              {editMode && (
                                                <>
                                                  <button onClick={() => toggleLock(periodIndex, playerIndex)} className="p-0.5 hover:bg-gray-100 rounded print:hidden shrink-0">
                                                    {playerSlot.locked ? <Lock className="w-3.5 h-3.5 text-yellow-600" /> : <Unlock className="w-3.5 h-3.5 text-gray-400" />}
                                                  </button>
                                                  <button onClick={() => removePlayer(periodIndex, playerIndex)} className="p-0.5 hover:bg-red-100 rounded print:hidden shrink-0" title="Remove player">
                                                    <X className="w-3.5 h-3.5 text-red-400" />
                                                  </button>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </Draggable>
                                    );
                                  })}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </div>

                          {/* Bench / Sitting Out */}
                          {bench.length > 0 && (
                            <div className="mt-3 pt-2 border-t border-dashed border-gray-200">
                              <div className="text-xs font-medium text-gray-400 mb-1">Bench</div>
                              <div className="flex flex-wrap gap-1">
                                {bench.map(p => (
                                  <span key={p.id} className="text-xs text-gray-400 bg-gray-50 rounded px-1.5 py-0.5">
                                    {p.jersey_number != null ? `#${p.jersey_number}` : p.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </Draggable>
                );
              })}
              {qProvided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
