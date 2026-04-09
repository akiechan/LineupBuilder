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
  const [selectedQuarter, setSelectedQuarter] = useState<number | null>(null);

  const getPlayerById = (id: string) => players.find(p => p.id === id);

  const toggleGoalieLock = (periodIndex: number) => {
    const newLineup = lineup.map(p => ({ ...p, players: [...p.players] }));
    newLineup[periodIndex] = {
      ...newLineup[periodIndex],
      goalie_locked: !newLineup[periodIndex].goalie_locked,
    };
    onUpdateLineup(newLineup);
  };

  const toggleLock = (periodIndex: number, playerIndex: number) => {
    const newLineup = lineup.map(p => ({ ...p, players: [...p.players] }));
    newLineup[periodIndex].players[playerIndex] = {
      ...newLineup[periodIndex].players[playerIndex],
      locked: !newLineup[periodIndex].players[playerIndex].locked,
    };
    onUpdateLineup(newLineup);
  };

  // Direct assignment — no auto-swap. Just place the player in this slot.
  const assignPlayer = (periodIndex: number, playerIndex: number, newPlayerId: string) => {
    const newLineup = lineup.map(p => ({ ...p, players: [...p.players] }));
    newLineup[periodIndex].players[playerIndex] = {
      ...newLineup[periodIndex].players[playerIndex],
      player_id: newPlayerId,
    };
    onUpdateLineup(newLineup);
  };

  // Direct goalie assignment — no auto-swap.
  const assignGoalie = (periodIndex: number, newGoalieId: string) => {
    const newLineup = lineup.map(p => ({ ...p, players: [...p.players] }));
    newLineup[periodIndex].goalie = newGoalieId;
    onUpdateLineup(newLineup);
  };

  const handleQuarterTap = (index: number) => {
    if (selectedQuarter === null) {
      setSelectedQuarter(index);
    } else if (selectedQuarter === index) {
      setSelectedQuarter(null);
    } else {
      const newLineup = lineup.map(p => ({ ...p, players: [...p.players] }));
      [newLineup[selectedQuarter], newLineup[index]] = [newLineup[index], newLineup[selectedQuarter]];
      newLineup.forEach((p, i) => { p.period = i + 1; });
      onUpdateLineup(newLineup);
      setSelectedQuarter(null);
    }
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

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
  const availablePlayers = players
    .filter(p => availablePlayerIds.has(p.id))
    .sort((a, b) => a.name.localeCompare(b.name));

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
        <button onClick={() => { setEditMode(!editMode); setSelectedQuarter(null); }} className="text-sm text-blue-600 hover:text-blue-700">
          {editMode ? 'Done Editing' : 'Edit Lineup'}
        </button>
      </div>

      {editMode && (
        <div className="print:hidden space-y-3">
          <p className="text-xs text-gray-500">
            Use dropdowns to assign any player to any slot. Lock players to preserve on regeneration.
          </p>
          {/* Quarter reorder bar */}
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-2 text-center">
              {selectedQuarter === null ? 'Tap a quarter to reorder it' : `Q${lineup[selectedQuarter].period} selected — tap another quarter to swap`}
            </p>
            <div className="flex gap-2">
              {lineup.map((period, i) => (
                <button
                  key={i}
                  onClick={() => handleQuarterTap(i)}
                  className={`flex-1 py-3 rounded-lg border-2 font-bold text-sm transition-all touch-manipulation select-none ${
                    selectedQuarter === i
                      ? 'bg-green-600 text-white border-green-600 shadow-md'
                      : selectedQuarter !== null
                      ? 'bg-white text-green-700 border-green-300 hover:border-green-500 hover:bg-green-50'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                  }`}
                >
                  Q{period.period}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {lineup.map((period, periodIndex) => {
            const goalie = getPlayerById(period.goalie);
            const bench = getBenchPlayers(period);
            return (
              <Card key={`quarter-${periodIndex}`} className="print:break-inside-avoid">
                <CardContent className="pt-4 px-3">
                  <div className="flex items-center justify-center mb-3">
                    <h3 className={`font-bold text-sm px-1 ${selectedQuarter === periodIndex ? 'text-green-600' : 'text-green-700'}`}>
                      Q{period.period}
                    </h3>
                  </div>

                          {/* Goalie */}
                          {period.goalie && (
                          <div className={`mb-3 p-2 rounded-lg ${period.goalie_locked && editMode ? 'bg-yellow-50 border border-yellow-300' : 'bg-blue-50'}`}>
                            <div className="flex items-center justify-between text-xs font-medium text-blue-900 mb-0.5">
                              <div className="flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5" />
                                Goalie
                              </div>
                              {editMode && (
                                <button onClick={() => toggleGoalieLock(periodIndex)} className="p-1.5 hover:bg-blue-100 rounded print:hidden">
                                  {period.goalie_locked ? <Lock className="w-4 h-4 text-yellow-600" /> : <Unlock className="w-4 h-4 text-gray-400" />}
                                </button>
                              )}
                            </div>
                            {editMode ? (
                              <select
                                value={period.goalie}
                                onChange={(e) => assignGoalie(periodIndex, e.target.value)}
                                className="w-full text-sm font-semibold text-blue-900 bg-white border border-blue-200 rounded px-1.5 py-1.5 print:hidden"
                              >
                                {availablePlayers.map(p => (
                                  <option key={p.id} value={p.id}>{playerLabel(p)}</option>
                                ))}
                              </select>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <div className="font-semibold text-sm text-blue-900 truncate flex-1">
                                  {goalie?.name || 'Unknown'}
                                  {goalie?.jersey_number != null && ` (#${goalie.jersey_number})`}
                                </div>
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
                                        key={`${periodIndex}-${playerIndex}`}
                                        draggableId={`${periodIndex}-${playerIndex}`}
                                        index={playerIndex}
                                        isDragDisabled={!editMode || playerSlot.locked}
                                      >
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className={`p-1.5 rounded border text-sm ${
                                              playerSlot.locked && editMode
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
                                                  onChange={(e) => assignPlayer(periodIndex, playerIndex, e.target.value)}
                                                  className="flex-1 min-w-0 text-xs font-medium bg-gray-50 border border-gray-200 rounded px-1.5 py-1.5 print:hidden"
                                                >
                                                  {availablePlayers.map(p => (
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
                                                  <button onClick={() => toggleLock(periodIndex, playerIndex)} className="p-1.5 hover:bg-gray-100 rounded print:hidden shrink-0 -mr-0.5">
                                                    {playerSlot.locked ? <Lock className="w-4 h-4 text-yellow-600" /> : <Unlock className="w-4 h-4 text-gray-400" />}
                                                  </button>
                                                  <button onClick={() => removePlayer(periodIndex, playerIndex)} className="p-1.5 hover:bg-red-100 rounded print:hidden shrink-0 -mr-1" title="Remove player">
                                                    <X className="w-4 h-4 text-red-400" />
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
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
