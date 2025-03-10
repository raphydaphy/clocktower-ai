import 'dotenv/config';

import readline from 'readline';

import { runDayNightCycle } from './clocktower/cycle';
import { initializePlayers } from './clocktower/players';
import { createSystemPrompt } from './clocktower/script';
import { PLAYERS, SCRIPT } from './setup';

async function runGame(): Promise<void> {
  const systemInstruction = createSystemPrompt(SCRIPT);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.info(`Setting up the game...`);

  await initializePlayers(systemInstruction, PLAYERS);
  await runDayNightCycle(systemInstruction, rl, PLAYERS);
}

runGame()
  .then(() => console.info(`Done!`))
  .catch(err => console.error(`It failed`, err));
