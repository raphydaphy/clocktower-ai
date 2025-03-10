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
    `The night phase is now over. What would you like to say to the town as they wake in the morning: `
  );

  await broadcastMessage(players, userInput);
  await runDiscussionPhase(systemInstruction, rl, players);

  await runDayNightCycle(systemInstruction, rl, players, dayCount + 1);
}
