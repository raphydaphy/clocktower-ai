import readline from 'readline';

import { asyncReadline } from '../readline';
import { Player } from '../types';
import { sendMessageToPlayer } from './players';

export const runPlayerConversationWithStoryteller = async (
  systemInstruction: string,
  rl: readline.Interface,
  player: Player,
  message: string
): Promise<void> => {
  const playerResponse = await sendMessageToPlayer(
    systemInstruction,
    player,
    `${message}\n\nPlease respond with a JSON object that contains a 'reasoning' property which includes your train of thought, as well as an 'action' property and a 'message' property. The action should be either 'talk_to_storyteller' to provide a respond to the storyteller, or 'idle' to end the conversation. If you choose to talk to the storyteller, please include the message in the 'message' property.`,
    ['talk_to_storyteller', 'idle']
  );

  if (playerResponse.action === 'idle') {
    console.info(`${player.name} has chosen not to respond.`);
    return;
  } else if (playerResponse.action !== 'talk_to_storyteller') {
    throw new Error(
      `Invalid player action ${playerResponse.action} in night phase!`
    );
  }

  console.info(`${player.name}: ${playerResponse.message}`);
  const messageForPlayer = await asyncReadline(
    rl,
    `How would you like to respond to ${player.name}? `
  );

  return runPlayerConversationWithStoryteller(
    systemInstruction,
    rl,
    player,
    messageForPlayer
  );
};
