import readline from 'readline';

import { asyncReadline } from '../services/readline';
import { broadcastMessage } from './players';
import { finishGame, getGameStatus } from './status';
import { selectAndKillPlayer } from './storyteller';
import { Player } from './types';

export const usePublicAbility = async (
  rl: readline.Interface,
  players: Player[],
  player: Player,
  message: string,
  selectedPlayer?: string
): Promise<void> => {
  console.info(`${player.name} wants to use a public ability: ${message}`);

  await broadcastMessage(
    players,
    `${player.name} has used a public ability: ${message}`,
    [player.name]
  );

  const userInput = (
    await asyncReadline(
      rl,
      `${player.name} has tried to use a public ability. Would you like to [S]end a message, [K]ill a player or [E]nd the game? `
    )
  ).toUpperCase();

  if (userInput === 'K') {
    await selectAndKillPlayer(rl, players);

    const gameStatus = getGameStatus(players);
    if (gameStatus !== 'ongoing') {
      return finishGame(gameStatus);
    }
  } else if (userInput === 'E') {
    const winningTeam = (
      await asyncReadline(
        rl,
        `What team should win the game? [G]ood or [Evil]? `
      )
    ).toUpperCase();

    return finishGame(winningTeam === 'G' ? 'good-wins' : 'evil-wins');
  } else if (userInput !== 'S') {
    console.warn(`You must choose [S], [K] or [E]!`);
    return usePublicAbility(rl, players, player, message, selectedPlayer);
  }

  const messageForTown = await asyncReadline(
    rl,
    `How would you respond to to the town: `
  );
  await broadcastMessage(players, messageForTown);
};
