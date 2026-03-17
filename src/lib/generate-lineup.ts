import type { Player, Game, LineupPeriod, AttendanceRecord } from './database.types';

export function generateLineup(game: Game, allPlayers: Player[]): LineupPeriod[] {
  const attendance = (game.attendance || []) as AttendanceRecord[];
  const playingPlayers = allPlayers.filter(p => {
    const record = attendance.find(a => a.player_id === p.id);
    return record?.status === 'playing';
  });

  if (playingPlayers.length === 0) throw new Error('No players marked as playing');

  const numPeriods = game.num_periods || 4;
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
    // Higher priority (lower index) = higher weight
    return 3 * (enabledCount - rank) / enabledCount;
  };

  const W_bench = 4;   // always on - prevents consecutive sits
  const W_rand = 1.5;  // always on - variety on each regenerate
  const W_fair = strategyWeight('playing_time_weighted');
  const W_skill = strategyWeight('skill_weighted');
  const W_att = strategyWeight('attendance_weighted');
  const genderEnabled = strategies.includes('gender_weighted');

  // --- Goalie selection ---
  let eligibleGoalies = playingPlayers.filter(p => p.goalie_preference <= 2);
  if (eligibleGoalies.length === 0) eligibleGoalies = [...playingPlayers];

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

  const benchStreak: Record<string, number> = {};
  playingPlayers.forEach(p => { benchStreak[p.id] = 0; });

  let currentGoalie: Player | null = null;
  let periodsSinceGoalieChange = 0;
  const lineup: LineupPeriod[] = [];

  // Pre-generate random values for each player per period (deterministic per call, random across calls)
  const randomValues: Record<string, number[]> = {};
  playingPlayers.forEach(p => {
    randomValues[p.id] = Array.from({ length: numPeriods }, () => Math.random());
  });

  for (let period = 1; period <= numPeriods; period++) {
    // --- Pick goalie ---
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
        // Add randomness to goalie tiebreak
        return (a.goalie_preference + Math.random()) - (b.goalie_preference + Math.random());
      });
      goalie = sortedGoalies.find(g => g.id !== currentGoalie?.id) || sortedGoalies[0];
      currentGoalie = goalie;
      periodsSinceGoalieChange = 1;
    }

    goaliePlayCount[goalie.id]++;

    // --- Score and rank field player candidates ---
    const candidates = playingPlayers.filter(p => p.id !== goalie.id);

    const needToPlay = (p: Player): number => {
      const playCount = getEffectivePlayCount(p.id);

      // Fairness: how underplayed (1 = never played, 0 = played every period so far)
      const fairness = period === 1 ? 1 : 1 - playCount / (period - 1);

      // Bench urgency: consecutive periods sat out, capped at 3
      const bench = Math.min(benchStreak[p.id], 3) / 3;

      // Skill bonus: normalized 0-1 (skill 1=0, 2=0.5, 3=1)
      const skill = ((p.skill_level || 2) - 1) / 2;

      // Attendance rarity: rare attendees get priority when present
      // attendance_pattern 1=always(0), 2=sometimes(0.5), 3=rarely(1)
      const att = ((p.attendance_pattern || 1) - 1) / 2;

      // Random jitter for variety
      const rand = randomValues[p.id][period - 1];

      return (
        W_bench * bench +
        W_fair * fairness +
        W_skill * skill +
        W_att * att +
        W_rand * rand
      );
    };

    // Sort candidates by needToPlay descending (highest need plays)
    const sorted = [...candidates].sort((a, b) => needToPlay(b) - needToPlay(a));
    let periodPlayers = sorted.slice(0, playersPerPeriod);

    // --- Gender balance (soft constraint) ---
    // Spread girls evenly across periods rather than clustering
    if (genderEnabled) {
      const totalFemale = candidates.filter(p => p.gender === 'Female').length;
      const targetFemale = Math.round((totalFemale / candidates.length) * playersPerPeriod);

      const selectedFemale = periodPlayers.filter(p => p.gender === 'Female').length;
      const bench = sorted.slice(playersPerPeriod);

      if (selectedFemale > targetFemale) {
        // Too many girls selected - swap lowest-scored girls with highest-scored bench boys
        const girlsToSwap = selectedFemale - targetFemale;
        const selectedGirls = [...periodPlayers]
          .filter(p => p.gender === 'Female')
          .sort((a, b) => needToPlay(a) - needToPlay(b)); // lowest scored first
        const benchBoys = bench.filter(p => p.gender !== 'Female');

        for (let i = 0; i < Math.min(girlsToSwap, benchBoys.length, selectedGirls.length); i++) {
          const swapOut = selectedGirls[i];
          const swapIn = benchBoys[i];
          periodPlayers = periodPlayers.map(p => p.id === swapOut.id ? swapIn : p);
        }
      } else if (selectedFemale < targetFemale) {
        // Too few girls selected - swap lowest-scored boys with highest-scored bench girls
        const girlsNeeded = targetFemale - selectedFemale;
        const selectedBoys = [...periodPlayers]
          .filter(p => p.gender !== 'Female')
          .sort((a, b) => needToPlay(a) - needToPlay(b)); // lowest scored first
        const benchGirls = bench.filter(p => p.gender === 'Female');

        for (let i = 0; i < Math.min(girlsNeeded, benchGirls.length, selectedBoys.length); i++) {
          const swapOut = selectedBoys[i];
          const swapIn = benchGirls[i];
          periodPlayers = periodPlayers.map(p => p.id === swapOut.id ? swapIn : p);
        }
      }
    }

    // --- Update tracking ---
    const playingIds = new Set(periodPlayers.map(p => p.id));
    periodPlayers.forEach(p => {
      fieldPlayCount[p.id]++;
      benchStreak[p.id] = 0;
    });
    candidates.forEach(p => {
      if (!playingIds.has(p.id)) benchStreak[p.id]++;
    });

    lineup.push({
      period,
      goalie: goalie.id,
      players: periodPlayers.map(p => ({
        player_id: p.id,
        position: p.position_preference || 'Field',
        locked: false,
      })),
    });
  }

  return lineup;
}
