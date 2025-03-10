import readline from 'readline';

import { asyncReadline } from '../services/readline';
import { runDiscussionPhase } from './discussion';
import { runNightPhase } from './night';
import { broadcastMessage } from './players';
import { finishGame, getGameStatus, listPlayers } from './status';
import { Player } from './types';

export async function runDayNightCycle(
  systemInstruction: string,
  rl: readline.Interface,
  players: Player[],
  dayCount = 1
): Promise<void> {
  const gameStatus = getGameStatus(players);
  if (gameStatus !== 'ongoing') {
    return finishGame(gameStatus);
  }

  console.info(`It is now the night. All players close their eyes.`);

  listPlayers(players);

  await runNightPhase(systemInstruction, rl, players);

  const userInput = await asyncReadline(
    rl,
    `The night phase is now over. What would you like to say to the town as they wake in the morning? `
  );

  await broadcastMessage(
    players,
    `${userInput}. ${
      dayCount > 1
        ? `If you died and you are the Klutz or claiming to be the Klutz, then you need to announce this now and choose a player soon. If your role gained information during the night, or if you are bluffing a role that gains information during the night, you can share that now if you wish. Remember to maintain a consistent alibi and avoid contradicting yourself. `
        : ''
    } `
  );
  await runDiscussionPhase(systemInstruction, rl, players);

  await runDayNightCycle(systemInstruction, rl, players, dayCount + 1);
}
