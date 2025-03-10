import fs from 'node:fs';
import path from 'node:path';

import readline from 'readline';

import { GENERATED_DATA_DIRECTORY } from '../services/constants';
import { asyncReadline } from '../services/readline';
import { joinWithWord } from '../services/utils';
import { generateResponse } from '../services/vertex-ai';
import { Player, PlayerResponse, PlayerStatus } from './types';

export const sendMessageToPlayer = async (
  systemInstruction: string,
  player: Player,
  message: string,
  allowedActions: string[],
  _rl?: readline.Interface
): Promise<PlayerResponse> => {
  const res = await generateResponse(
    systemInstruction,
    player.chatHistory,
    message,
    allowedActions
  );

  player.chatHistory.push(
    {
      role: 'user',
      parts: [{ text: message }],
    },
    {
      role: 'model',
      parts: [{ text: JSON.stringify(res) }],
    }
  );
  player.actionHistory.push(res.action);

  fs.appendFileSync(
    path.resolve(GENERATED_DATA_DIRECTORY, `./${player.name}.csv`),
    `"Storyteller","${message}","",""\n`,
    'utf-8'
  );
  fs.appendFileSync(
    path.resolve(GENERATED_DATA_DIRECTORY, `./${player.name}.csv`),
    `"Action","${res.message || ''}","${res.action}","${res.reasoning}"\n`,
    'utf-8'
  );

  return res;
};

export const selectPlayer = async (
  rl: readline.Interface,
  players: Player[],
  message?: string
): Promise<Player> => {
  const userInput = await asyncReadline(
    rl,
    `${message || `Enter the players name`} (${joinWithWord(
      players.map(p => p.name),
      'or'
    )}): `
  );

  for (const player of players) {
    if (player.name.toUpperCase() === userInput.toUpperCase()) {
      return player;
    }
  }

  console.error(`Invalid player name "${userInput}"! Please try again...`);
  return selectPlayer(rl, players, message);
};

export const getRandomActivePlayer = (
  availablePlayers: Player[]
): Player | null => {
  const selectedPlayer =
    availablePlayers[Math.floor(Math.random() * availablePlayers.length)];

  if (selectedPlayer.actionHistory.length) {
    const latestAction =
      selectedPlayer.actionHistory[selectedPlayer.actionHistory.length - 1];
    if (latestAction === 'idle') {
      const eligiblePlayer = availablePlayers.find(
        player =>
          !player.actionHistory.length ||
          player.actionHistory[player.actionHistory.length - 1] !== 'idle'
      );
      if (!eligiblePlayer) {
        return null;
      }

      return getRandomActivePlayer(availablePlayers);
    }
  }

  return selectedPlayer;
};

export const initializePlayers = async (
  systemInstruction: string,
  players: Player[]
): Promise<void> => {
  for (let playerIdx = 0; playerIdx < players.length; playerIdx++) {
    const player = players[playerIdx];
    const initialMessage = [
      `These are the following players in the game, in clockwise order around the circle: \n`,
      players
        .map((otherPlayer, otherPlayerIdx) => {
          if (player.name === otherPlayer.name) {
            return ` - ${otherPlayer.name} (You)`;
          } else if (
            playerIdx === otherPlayerIdx - 1 ||
            (playerIdx === 0 && otherPlayerIdx === players.length - 1)
          ) {
            return ` - ${otherPlayer.name} (Your neighbor to your left)`;
          } else if (
            playerIdx === otherPlayerIdx + 1 ||
            (playerIdx === players.length - 1 && otherPlayerIdx === 0)
          ) {
            return ` - ${otherPlayer.name} (Your neighbor to your right)`;
          }
          return ` - ${otherPlayer.name} `;
        })
        .join('\n'),
      `\nYou have been given the ${
        player.tokenShown || player.actualRole
      } token. The storyteller puts you to sleep.`,
      `You must respond with a JSON object that includes a 'reasoning' property that shows your thought process, as well as an 'action' property that shows what action you would like to take.`,
      `For now, the only action you can take is 'idle'. In the future, there may be other actions that you can take which will be communicated to you.`,
    ].join(' ');

    player.chatHistory = [];
    fs.writeFileSync(
      path.resolve(GENERATED_DATA_DIRECTORY, `./${player.name}.csv`),
      '"Type","Message","Action","Reasoning"\n',
      'utf-8'
    );
    await sendMessageToPlayer(systemInstruction, player, initialMessage, [
      'idle',
    ]);
  }
};

/**
 * Shares a message with a group of players
 *
 * @param players The players that should hear the message
 * @param message The message to share
 * @param excludedPlayerNames These players should not hear the message, if any
 */
export const broadcastMessage = async (
  players: Player[],
  message: string,
  excludedPlayerNames?: string[]
): Promise<void> => {
  for (const player of players) {
    if (excludedPlayerNames?.includes(player.name)) {
      continue;
    }

    player.chatHistory.push({
      role: 'user',
      parts: [
        {
          text: message,
        },
      ],
    });
    player.actionHistory.push('hear_message');
    fs.appendFileSync(
      path.resolve(GENERATED_DATA_DIRECTORY, `./${player.name}.csv`),
      `"Message","${message}","",""\n`
    );
  }
};

export const formatPlayerStatus = (status: PlayerStatus): string => {
  switch (status) {
    case 'alive':
      return 'Alive';
    case 'dead-without-vote':
      return 'Dead without Ghost Vote';
    case 'dead-with-vote':
      return 'Dead with Ghost Vote)';
  }
};
