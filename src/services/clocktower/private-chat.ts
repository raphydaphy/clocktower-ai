import readline from 'readline';

import { joinWithWord, randomSleep } from '../utils';
import {
  broadcastMessage,
  getRandomActivePlayer,
  sendMessageToPlayer,
} from './players';
import { Player } from './types';

export const getPlayerInputInPrivateChat = async (
  systemInstruction: string,
  rl: readline.Interface,
  player: Player,
  otherPlayers: Player[],
  messageCount = 0
): Promise<void> => {
  const otherPlayerNames = joinWithWord(otherPlayers.map(p => p.name));
  const playerResponse = await sendMessageToPlayer(
    systemInstruction,
    player,
    `Would you like to say ${
      messageCount ? 'anything else' : 'anything'
    } in the private chat with ${otherPlayerNames} ? You must respond with a JSON object with three properties. The 'reasoning' property should include a string of your current train of thought, the 'action' property should either be 'idle' (to listen and wait for others to say something) or 'private_message' (to say something in the private chat). If you choose 'private_message', you must also include a 'message' property with the message you want to share in the private chat.`,
    ['idle', 'private_message'],
    rl
  );

  if (playerResponse.action === 'idle') {
    return;
  } else if (playerResponse.action !== 'private_message') {
    throw new Error(
      `Invalid player action in private chat '${playerResponse.action}'`
    );
  }

  console.info(
    `${player.name} -> ${otherPlayerNames}: ${playerResponse.message}`
  );

  await broadcastMessage(
    otherPlayers,
    `In your private chat, ${player.name} says: ${playerResponse.message}`
  );
};

export const runPrivateChat = async (
  systemInstruction: string,
  rl: readline.Interface,
  playersInChat: Player[],
  messageCount = 0
): Promise<void> => {
  await randomSleep();

  const randomPlayerInChat = getRandomActivePlayer(playersInChat);
  if (!randomPlayerInChat) {
    console.info(`The private chat is now over!`);
    return;
  }

  await getPlayerInputInPrivateChat(
    systemInstruction,
    rl,
    randomPlayerInChat,
    playersInChat.filter(
      otherPlayer => otherPlayer.name !== randomPlayerInChat.name
    ),
    messageCount
  );

  return runPrivateChat(systemInstruction, rl, playersInChat, messageCount + 1);
};

export const startPrivateChat = async (
  systemInstruction: string,
  rl: readline.Interface,
  requesterPlayer: Player,
  otherPlayerNames: string[],
  allPlayers: Player[]
): Promise<void> => {
  const otherPlayerNamesLowercase = otherPlayerNames.map(otherPlayerName =>
    otherPlayerName.toLowerCase()
  );
  const otherPlayers = allPlayers.filter(otherPlayer =>
    otherPlayerNamesLowercase.includes(otherPlayer.name.toLowerCase())
  );

  if (otherPlayers.length !== otherPlayerNames.length) {
    throw new Error(
      `Player ${
        requesterPlayer.name
      } tried to request a private chat with one or more invalid player name(s): [${otherPlayerNames.join(
        ', '
      )}]`
    );
  }

  const playersInChat = [requesterPlayer, ...otherPlayers];

  for (const playerInChat of playersInChat) {
    const otherPlayersInChat = joinWithWord(
      playersInChat
        .filter(player => player.name !== playerInChat.name)
        .map(player => player.name)
    );

    await broadcastMessage(
      [playerInChat],
      `You are now in a private chat with ${otherPlayersInChat}`
    );
  }

  await getPlayerInputInPrivateChat(
    systemInstruction,
    rl,
    requesterPlayer,
    otherPlayers
  );
  await runPrivateChat(systemInstruction, rl, playersInChat, 1);

  for (const playerInChat of playersInChat) {
    const otherPlayersInChat = joinWithWord(
      playersInChat
        .filter(player => player.name !== playerInChat.name)
        .map(player => player.name)
    );

    await broadcastMessage(
      [playerInChat],
      `You have now finished the private chat with ${otherPlayersInChat} and rejoined the other players`
    );
  }
};
