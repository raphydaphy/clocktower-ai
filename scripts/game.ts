import 'dotenv/config';
import { Player } from '../src/services/types';
import * as fs from 'node:fs';
import readline from 'readline';
import { asyncReadline } from '../src/services/readline';
import { joinWithWord, randomSleep } from '../src/services/utils';
import {
  broadcastMessage,
  getRandomActivePlayer,
  initializePlayers,
  selectPlayer,
  sendMessageToPlayer,
} from '../src/services/clocktower/players';
import { startPrivateChat } from '../src/services/clocktower/private-chat';
import { runPlayerConversationWithStoryteller } from '../src/services/clocktower/storyteller';

// Players are in clockwise order, starting from the top middle of the circle
const players: Player[] = [
  {
    name: 'Maya',
    actualRole: 'Klutz',
    chatHistory: [],
    actionHistory: [],
  },
  {
    name: 'Joanna',
    actualRole: 'Investigator',
    chatHistory: [],
    actionHistory: [],
  },
  {
    name: 'Anne',
    actualRole: 'Empath',
    chatHistory: [],
    actionHistory: [],
  },
  {
    name: 'Ziggy',
    actualRole: 'Artist',
    chatHistory: [],
    actionHistory: [],
  },
  {
    name: 'Arun',
    actualRole: 'Scarlet Woman',
    chatHistory: [],
    actionHistory: [],
  },
  {
    name: 'Harper',
    actualRole: 'Imp',
    chatHistory: [],
    actionHistory: [],
  },
];

const systemInstruction = fs.readFileSync('./prompts/generated.txt', 'utf-8');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function runNightPhase() {
  const userInput = (
    await asyncReadline(
      rl,
      `Would you like to [W]ake a player or [E]nd the night: `
    )
  ).toUpperCase();

  if (userInput === 'E') {
    console.info(`You have ended the night!`);
    return;
  } else if (userInput !== 'W') {
    console.warn(`You must choose [W] or [E]!`);
    return runNightPhase();
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
    messageForPlayer
  );
  return runNightPhase();
}

/**
 * Gets player input and returns the action taken
 *
 * @param selectedPlayer The player who should take an input
 */
async function getPlayerInputForDiscussionPhase(
  selectedPlayer: Player
): Promise<string> {
  const playerResponse = await sendMessageToPlayer(
    systemInstruction,
    selectedPlayer,
    `It's currently the discussion phase. You can make any of the following actions: \n${[
      ` - 'announcement': Publicly announce some information to all players. You must put your announcement in the 'announcement' property`,
      ` - 'request_private_chat': Request a private chat with one or more players. You will need to include a message to publicly ask those players to chat using the 'message' property `,
      ` - 'talk_to_storyteller': Privately ask the storyteller a question. You will need to include your message for the storyteller in the 'message' property`,
      ` - 'idle': Do nothing, and listen to what other members of the town do first. Don't be afraid to idle and listen for other input before jumping in, often it is better to stay quiet than to over-share, even if you are good.`,
    ].join(
      '\n'
    )}\n\nPlease respond with a JSON object including your 'reasoning', 'action' and the 'message' that you would like to share, if applicable to the action you are taking. If you need to list one or more players as part of your action, include a string array with the property 'players' in your response`,
    ['announcement', 'request_private_chat', 'talk_to_storyteller', 'idle']
  );

  if (playerResponse.action === 'idle') {
    return 'idle';
  } else if (playerResponse.action === 'announcement') {
    if (!playerResponse.message) {
      console.error(`Player announcement is missing message`, {
        selectedPlayer,
        playerResponse,
      });
      throw new Error(`Player announcement was missing message!`);
    }
    console.info(`${selectedPlayer.name}: ${playerResponse.message}`);
    await broadcastMessage(
      players,
      `${selectedPlayer.name} has made the announcement: ${playerResponse.message}`,
      [selectedPlayer.name]
    );
    return 'announcement';
  } else if (playerResponse.action === 'talk_to_storyteller') {
    if (!playerResponse.message) {
      console.error(
        `Player ${selectedPlayer.name} has requested to talk to the storyteller but is missing a message`,
        {
          selectedPlayer,
          playerResponse,
        }
      );
      throw new Error(`Storyteller chat was missing message!`);
    }

    console.info(
      `${selectedPlayer.name} has requested to talk to the storyteller: ${playerResponse.message}`
    );

    const storytellerResponse = await asyncReadline(
      rl,
      `How would you like to respond to ${selectedPlayer.name}: `
    );

    await runPlayerConversationWithStoryteller(
      systemInstruction,
      rl,
      selectedPlayer,
      `The storyteller has answered: ${storytellerResponse}`
    );
    return 'talk_to_storyteller';
  } else if (playerResponse.action === 'request_private_chat') {
    if (!playerResponse.players?.length) {
      throw new Error(
        `${selectedPlayer.name} requested a private chat but didnt list any players: ${playerResponse.message}`
      );
    } else if (!playerResponse.message) {
      throw new Error(
        `${selectedPlayer.name} requested a private chat but didn't include a message`
      );
    }

    const playerNames = joinWithWord(playerResponse.players);
    console.info(
      `${selectedPlayer.name} has requested a private chat with ${playerNames}: ${playerResponse.message}`
    );

    await broadcastMessage(
      players,
      `${selectedPlayer.name} has made the announcement: ${playerResponse.message}`,
      [selectedPlayer.name]
    );
    await startPrivateChat(
      systemInstruction,
      selectedPlayer,
      playerResponse.players,
      players
    );
    return 'request_private_chat';
  }

  throw new Error(
    `Invalid action '${playerResponse.action}' during the discussion phase from ${selectedPlayer.name}`
  );
}

async function runDiscussionPhase(messageCount = 0, nominationsOpen = false) {
  // Every 6 messages, check if the storyteller wants to continue the discussion
  if (!nominationsOpen && messageCount >= 6 && messageCount % 6 === 0) {
    console.info(`Msg count ${messageCount} ... ${messageCount % 6}`);
    const userInput = (
      await asyncReadline(
        rl,
        `Would you like to [C]ontinue discussion or [O]pen nominations: `
      )
    ).toUpperCase();

    if (userInput === 'O') {
    } else if (userInput !== 'C') {
      console.error(`You must respond with either [C] or [O]!`);
      return runDiscussionPhase(messageCount, nominationsOpen);
    }
  }

  await randomSleep();

  const selectedPlayer = getRandomActivePlayer(players);

  if (!selectedPlayer) {
    console.info(`The discussion phase is now over!`);
    return;
  }

  const action = await getPlayerInputForDiscussionPhase(selectedPlayer);
  return runDiscussionPhase(
    action === 'idle' ? messageCount : messageCount + 1,
    nominationsOpen
  );
}

async function runTestGame() {
  await initializePlayers(systemInstruction, players);

  console.info(
    `These are the players in the game in clockwise order, starting ta the top of the circle:`
  );

  for (const player of players) {
    if (player.tokenShown) {
      console.info(
        ` - ${player.name}: ${player.actualRole} (Shown ${player.tokenShown})`
      );
      continue;
    }
    console.info(` - ${player.name}: ${player.actualRole}`);
  }

  console.info(`It is now the first night. All players close their eyes.`);
  await runNightPhase();

  for (const player of players) {
    player.actionHistory.push('begin_discussion');
  }

  console.info(`The first night is over! Players are now free to discuss`);
  await runDiscussionPhase();
}

runTestGame()
  .then(() => console.info(`Done!`))
  .catch(err => console.error(`It failed`, err));
