import type { Player, Game, LineupPeriod, AttendanceRecord } from './database.types';

export function generateLineup(
  game: Game,
  allPlayers: Player[],
  currentAttendance?: AttendanceRecord[],
  existingLineup?: LineupPeriod[],
): LineupPeriod[] {
  const attendance = currentAttendance ?? (game.attendance || []) as AttendanceRecord[];

  // Include both 'playing' and 'late' players. Late players get reduced periods.
  const latePlayerIds = new Set<string>();
  const playingPlayers = attendance.length === 0
    ? allPlayers
    : allPlayers.filter(p => {
        const record = attendance.find(a => a.player_id === p.id);
        if (record?.status === 'late') {
          latePlayerIds.add(p.id);
          return true;
        }
        return record?.status === 'playing';
      });

  if (playingPlayers.length === 0) throw new Error('No players marked as playing');

  const numPeriods = game.num_periods || 4;
  const hasGoalie = game.has_goalie ?? true;
  const goalieRotation = game.goalie_rotation_periods || 1;
  const countGoalieTime = game.count_goalie_as_playing_time ?? true;
  const strategies = game.strategy_priorities || [];

  const totalAttending = playingPlayers.length;
  let playersPerPeriod: number;
  if (totalAttending >= 7) {
    playersPerPeriod = game.players_per_period || 6;
  } else if (totalAttending === 6) {
    playersPerPeriod = 5;
  } else if (totalAttending === 5) {
    playersPerPeriod = 4;
  } else {
    playersPerPeriod = Math.max(totalAttending - 1, 3);
  }

  // --- Strategy weights from user priority order ---
  const enabledCount = strategies.length;
  const strategyWeight = (name: string): number => {
    const rank = strategies.indexOf(name);
    if (rank === -1) return 0;
    return 3 * (enabledCount - rank) / enabledCount;
  };

  const W_skill = strategyWeight('skill_weighted');
  const W_att = strategyWeight('attendance_weighted');
  const W_fair = strategyWeight('playing_time_weighted');
  const genderEnabled = strategies.includes('gender_weighted');
  const skillDistMode = strategies.includes('skill_grouped') ? 'grouped'
    : strategies.includes('skill_balanced') ? 'balanced'
    : 'none';
  const W_dist = skillDistMode !== 'none' ? 3 : 0;

  // --- Playing time guarantees ---
  const totalSlots = numPeriods * playersPerPeriod + (hasGoalie && countGoalieTime ? numPeriods : 0);
  const minPerPlayer = Math.floor(totalSlots / totalAttending);

  // --- Goalie selection ---
  let eligibleGoalies: Player[] = [];
  if (hasGoalie) {
    eligibleGoalies = playingPlayers.filter(p => p.goalie_preference <= 2);
    if (eligibleGoalies.length === 0) eligibleGoalies = [...playingPlayers];
  }

  const fieldPlayCount: Record<string, number> = {};
  const goaliePlayCount: Record<string, number> = {};
  playingPlayers.forEach(p => {
    fieldPlayCount[p.id] = 0;
    goaliePlayCount[p.id] = 0;
  });

  const getEffectivePlayCount = (playerId: string) => {
    if (countGoalieTime) return fieldPlayCount[playerId] + goaliePlayCount[playerId];
    return fieldPlayCount[playerId];
  };

  // --- Skill distribution targets per period ---
  const periodSkillTarget: number[] = [];
  if (W_dist > 0) {
    const overallAvg = playingPlayers.reduce((sum, p) => sum + (p.skill_level || 2), 0) / playingPlayers.length;
    if (skillDistMode === 'balanced') {
      for (let i = 0; i < numPeriods; i++) periodSkillTarget.push(overallAvg);
    } else {
      const sortedBySkill = [...playingPlayers].sort((a, b) => (b.skill_level || 2) - (a.skill_level || 2));
      const groupSize = Math.ceil(sortedBySkill.length / numPeriods);
      for (let i = 0; i < numPeriods; i++) {
        const group = sortedBySkill.slice(i * groupSize, (i + 1) * groupSize);
        const avgSkill = group.length > 0
          ? group.reduce((sum, p) => sum + (p.skill_level || 2), 0) / group.length
          : overallAvg;
        periodSkillTarget.push(avgSkill);
      }
    }
  }

  const randomValues: Record<string, number[]> = {};
  playingPlayers.forEach(p => {
    randomValues[p.id] = Array.from({ length: numPeriods }, () => Math.random());
  });

  const periodScore = (p: Player, period: number): number => {
    const skill = ((p.skill_level || 2) - 1) / 2;
    const att = ((p.attendance_pattern || 1) - 1) / 2;
    const dist = W_dist > 0
      ? 1 - Math.abs((p.skill_level || 2) - periodSkillTarget[period - 1]) / 2
      : 0;
    const rand = randomValues[p.id][period - 1];
    // Late players get a penalty in early periods (they arrive late)
    const latePenalty = latePlayerIds.has(p.id) && period <= Math.ceil(numPeriods / 3) ? -10 : 0;

    return (
      W_skill * skill +
      W_att * att +
      W_dist * dist +
      1.0 * rand +
      latePenalty
    );
  };

  const bonusScore = (p: Player): number => {
    const skill = ((p.skill_level || 2) - 1) / 2;
    const att = ((p.attendance_pattern || 1) - 1) / 2;
    const fair = 1;
    const rand = Math.random() * 0.3;
    // Late players get slight penalty for bonus slots
    const latePenalty = latePlayerIds.has(p.id) ? -0.5 : 0;

    return (
      W_skill * skill +
      W_att * att +
      W_fair * fair +
      rand +
      latePenalty
    );
  };

  // ============================================================
  // TWO-PHASE ALLOCATION
  // Phase 0: Pre-assign locked players from existing lineup
  // Phase 1: Assign each player their minimum guaranteed periods
  // Phase 2: Fill remaining bonus slots using priority scoring
  // ============================================================

  const periodAssignments: Set<string>[] = Array.from({ length: numPeriods }, () => new Set());
  const lockedSlots: Map<string, Set<number>> = new Map(); // player_id -> set of period indices

  // --- Phase 0: Preserve locked players from existing lineup ---
  if (existingLineup) {
    for (let pi = 0; pi < Math.min(existingLineup.length, numPeriods); pi++) {
      const period = existingLineup[pi];
      for (const slot of period.players) {
        if (slot.locked && playingPlayers.some(p => p.id === slot.player_id)) {
          periodAssignments[pi].add(slot.player_id);
          if (!lockedSlots.has(slot.player_id)) lockedSlots.set(slot.player_id, new Set());
          lockedSlots.get(slot.player_id)!.add(pi);
        }
      }
    }
  }

  // --- Goalie assignment (counts toward play time) ---
  let currentGoalie: Player | null = null;
  let periodsSinceGoalieChange = 0;
  const goalieByPeriod: (string | null)[] = [];

  for (let period = 1; period <= numPeriods; period++) {
    if (!hasGoalie) {
      goalieByPeriod.push(null);
      continue;
    }

    let goalie: Player;
    if (currentGoalie && periodsSinceGoalieChange < goalieRotation) {
      goalie = currentGoalie;
      periodsSinceGoalieChange++;
    } else {
      const sortedGoalies = [...eligibleGoalies].sort((a, b) => {
        const goalieDiff = goaliePlayCount[a.id] - goaliePlayCount[b.id];
        if (goalieDiff !== 0) return goalieDiff;
        const playDiff = getEffectivePlayCount(a.id) - getEffectivePlayCount(b.id);
        if (playDiff !== 0) return playDiff;
        return (a.goalie_preference + Math.random()) - (b.goalie_preference + Math.random());
      });
      goalie = sortedGoalies.find(g => g.id !== currentGoalie?.id) || sortedGoalies[0];
      currentGoalie = goalie;
      periodsSinceGoalieChange = 1;
    }

    goaliePlayCount[goalie.id]++;
    goalieByPeriod.push(goalie.id);
  }

  // --- Phase 1: Assign minimum periods to every player ---
  const assignedCount: Record<string, number> = {};
  playingPlayers.forEach(p => {
    const goalieCount = countGoalieTime ? goalieByPeriod.filter(g => g === p.id).length : 0;
    const lockedCount = lockedSlots.get(p.id)?.size ?? 0;
    assignedCount[p.id] = goalieCount + lockedCount;
  });

  // Late players get reduced minimum: max(1, effectiveMin - 1)
  const getPlayerMin = (p: Player, baseMin: number) => {
    if (latePlayerIds.has(p.id)) return Math.max(1, baseMin - 1);
    return baseMin;
  };

  // Late players cannot be assigned to the first period (they haven't arrived yet)
  const lateBannedPeriods = new Set<number>();
  const lateBanCount = Math.max(1, Math.ceil(numPeriods / 4)); // ban first ~25% of periods
  for (let i = 0; i < lateBanCount; i++) lateBannedPeriods.add(i);

  const isPeriodAllowed = (playerId: string, pi: number) => {
    if (!latePlayerIds.has(playerId)) return true;
    return !lateBannedPeriods.has(pi);
  };

  // Verify feasibility
  const totalFieldSlots = numPeriods * playersPerPeriod;
  let effectiveMin = minPerPlayer;
  while (effectiveMin > 0) {
    const totalFieldNeeded = playingPlayers.reduce((sum, p) =>
      sum + Math.max(0, getPlayerMin(p, effectiveMin) - assignedCount[p.id]), 0);
    if (totalFieldNeeded <= totalFieldSlots) break;
    effectiveMin--;
  }

  const playersNeedingMin = playingPlayers
    .filter(p => assignedCount[p.id] < getPlayerMin(p, effectiveMin))
    .sort((a, b) => {
      const needA = getPlayerMin(a, effectiveMin) - assignedCount[a.id];
      const needB = getPlayerMin(b, effectiveMin) - assignedCount[b.id];
      if (needA !== needB) return needB - needA;
      return bonusScore(a) - bonusScore(b);
    });

  for (const player of playersNeedingMin) {
    const playerMin = getPlayerMin(player, effectiveMin);
    const periodsNeeded = playerMin - assignedCount[player.id];
    if (periodsNeeded <= 0) continue;

    const availablePeriods = Array.from({ length: numPeriods }, (_, i) => i)
      .filter(pi => {
        if (!isPeriodAllowed(player.id, pi)) return false;
        if (periodAssignments[pi].has(player.id)) return false;
        if (goalieByPeriod[pi] === player.id) return false;
        return periodAssignments[pi].size < playersPerPeriod;
      })
      .sort((a, b) => {
        const slotDiff = periodAssignments[a].size - periodAssignments[b].size;
        if (slotDiff !== 0) return slotDiff;
        return periodScore(player, b + 1) - periodScore(player, a + 1);
      });

    for (let i = 0; i < Math.min(periodsNeeded, availablePeriods.length); i++) {
      const pi = availablePeriods[i];
      periodAssignments[pi].add(player.id);
      assignedCount[player.id]++;
    }
  }

  // --- Phase 2: Fill remaining bonus slots ---
  const bonusEligible = [...playingPlayers]
    .sort((a, b) => bonusScore(b) - bonusScore(a));

  for (let pi = 0; pi < numPeriods; pi++) {
    const remaining = playersPerPeriod - periodAssignments[pi].size;
    if (remaining <= 0) continue;

    const candidates = bonusEligible
      .filter(p => {
        if (!isPeriodAllowed(p.id, pi)) return false;
        if (periodAssignments[pi].has(p.id)) return false;
        if (goalieByPeriod[pi] === p.id) return false;
        return true;
      })
      .sort((a, b) => {
        const playDiff = assignedCount[a.id] - assignedCount[b.id];
        if (playDiff !== 0) return playDiff;
        return periodScore(b, pi + 1) - periodScore(a, pi + 1);
      });

    for (let i = 0; i < Math.min(remaining, candidates.length); i++) {
      periodAssignments[pi].add(candidates[i].id);
      assignedCount[candidates[i].id]++;
    }
  }

  // --- Gender balance pass ---
  if (genderEnabled) {
    const totalFemale = playingPlayers.filter(p => p.gender === 'Female').length;
    const targetFemalePerPeriod = Math.round((totalFemale / totalAttending) * playersPerPeriod);
    const fairPlayIsFirst = strategies[0] === 'playing_time_weighted';

    for (let pi = 0; pi < numPeriods; pi++) {
      const assigned = [...periodAssignments[pi]];
      const playerMap = new Map(playingPlayers.map(p => [p.id, p]));

      const females = assigned.filter(id => playerMap.get(id)?.gender === 'Female');
      const males = assigned.filter(id => playerMap.get(id)?.gender !== 'Female');
      const currentFemale = females.length;

      if (currentFemale === targetFemalePerPeriod) continue;

      const bench = playingPlayers.filter(p =>
        !periodAssignments[pi].has(p.id) && goalieByPeriod[pi] !== p.id
      );

      const canSwapOut = (id: string) => {
        if (lockedSlots.get(id)?.has(pi)) return false; // never swap locked
        if (!fairPlayIsFirst) return true;
        return assignedCount[id] > effectiveMin;
      };

      if (currentFemale > targetFemalePerPeriod) {
        const excess = currentFemale - targetFemalePerPeriod;
        const swappableGirls = females.filter(canSwapOut);
        const benchBoys = bench.filter(p => p.gender !== 'Female');
        for (let i = 0; i < Math.min(excess, swappableGirls.length, benchBoys.length); i++) {
          periodAssignments[pi].delete(swappableGirls[i]);
          periodAssignments[pi].add(benchBoys[i].id);
          assignedCount[swappableGirls[i]]--;
          assignedCount[benchBoys[i].id]++;
        }
      } else {
        const deficit = targetFemalePerPeriod - currentFemale;
        const swappableBoys = males.filter(canSwapOut);
        const benchGirls = bench.filter(p => p.gender === 'Female');
        for (let i = 0; i < Math.min(deficit, swappableBoys.length, benchGirls.length); i++) {
          periodAssignments[pi].delete(swappableBoys[i]);
          periodAssignments[pi].add(benchGirls[i].id);
          assignedCount[swappableBoys[i]]--;
          assignedCount[benchGirls[i].id]++;
        }
      }
    }
  }

  // --- Build final lineup from assignments ---
  const lineup: LineupPeriod[] = [];
  for (let pi = 0; pi < numPeriods; pi++) {
    const goalieId = goalieByPeriod[pi];
    const fieldPlayerIds = [...periodAssignments[pi]].filter(id => id !== goalieId);

    fieldPlayerIds.forEach(id => { fieldPlayCount[id]++; });

    lineup.push({
      period: pi + 1,
      goalie: goalieId ?? '',
      players: fieldPlayerIds.map(id => {
        const player = playingPlayers.find(p => p.id === id);
        const isLocked = lockedSlots.get(id)?.has(pi) ?? false;
        return {
          player_id: id,
          position: player?.position_preference || 'Field',
          locked: isLocked,
        };
      }),
    });
  }

  return lineup;
}
