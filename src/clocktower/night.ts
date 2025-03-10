import readline from 'readline';
import { Player } from './types';
import { asyncReadline } from '../services/readline';
import {
  runPlayerConversationWithStoryteller,
  selectAndKillPlayer,
} from './storyteller';
import { finishGame, getGameStatus } from './status';
import { selectPlayer } from './players';

export const runNightPhase = async (
  systemInstruction: string,
  rl: readline.Interface,
  players: Player[]
): Promise<void> => {
  const userInput = (
    await asyncReadline(
      rl,
      `Would you like to [W]ake a player, [K]ill a player or [E]nd the night? `
    )
  ).toUpperCase();

  if (userInput === 'E') {
    return;
  } else if (userInput === 'K') {
    await selectAndKillPlayer(rl, players);

    const gameStatus = getGameStatus(players);
    if (gameStatus !== 'ongoing') {
      finishGame(gameStatus);
      return;
    }
    return runNightPhase(systemInstruction, rl, players);
  } else if (userInput !== 'W') {
    console.warn(`You must choose [W], [K] or [E]!`);
    return runNightPhase(systemInstruction, rl, players);
  }

  const player = await selectPlayer(
    rl,
    players,
    `Enter the name of the player that you want to wake up`
  );
  const messageForPlayer = await asyncReadline(
    rl,
    `What do you want to say to the player? `
  );

  await runPlayerConversationWithStoryteller(
    systemInstruction,
    rl,
    player,
    `The storyteller wakes you in the night to tell you: "${messageForPlayer}"`
  );
  return runNightPhase(systemInstruction, rl, players);
};
