import 'dotenv/config';
import { Player, PlayerResponse } from '../src/services/types';
import * as fs from 'node:fs';
import { generateResponse } from '../src/services/vertex-ai';
import readline from 'readline';
import { asyncReadline } from '../src/services/readline';
import { joinWithWord, sleep } from '../src/services/utils';

// The min and max delay between messages
const MINIMUM_DELAY = 2000;
const MAXIMUM_DELAY = 8000;

// Players are in clockwise order, starting from the top middle of the circle
const players: Player[] = [
  {
    name: 'Maya',
    actualRole: 'Clockmaker',
    chatHistory: [],
    actionHistory: [],
  },
  {
    name: 'Joanna',
    actualRole: 'Sage',
    chatHistory: [],
    actionHistory: [],
  },
  {
    name: 'Anne',
    actualRole: 'Imp',
    chatHistory: [],
    actionHistory: [],
  },
  {
    name: 'Ziggy',
    actualRole: 'Drunk',
    tokenShown: 'Empath',
    chatHistory: [],
    actionHistory: [],
  },
  {
    name: 'Arun',
    actualRole: 'Artist',
    chatHistory: [],
    actionHistory: [],
  },
  {
    name: 'Harper',
    actualRole: 'Baron',
    chatHistory: [],
    actionHistory: [],
  },
];

const systemInstruction = fs.readFileSync('./no-greater-joy.txt', 'utf-8');

async function sendMessageToPlayer(
  player: Player,
  message: string,
  allowedActions: string[]
): Promise<PlayerResponse> {
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
    `./generated/${player.name}.csv`,
    `"Storyteller","${message}","",""\n`,
    'utf-8'
  );
  fs.appendFileSync(
    `./generated/${player.name}.csv`,
    `"Action","${res.message || ''}","${res.action}","${res.reasoning}"\n`,
    'utf-8'
  );

  return res;
}

async function initializePlayers() {
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
      `./generated/${player.name}.csv`,
      '"Type","Message","Action","Reasoning"\n',
      'utf-8'
    );
    await sendMessageToPlayer(player, initialMessage, ['idle']);
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function selectPlayer(message?: string): Promise<Player> {
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
  return selectPlayer();
}

async function runPlayerConversationWithStoryteller(
  player: Player,
  message: string
) {
  const playerResponse = await sendMessageToPlayer(
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

  return runPlayerConversationWithStoryteller(player, messageForPlayer);
}

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
    `Enter the name of the player that you want to wake up`
  );
  const messageForPlayer = await asyncReadline(
    rl,
    `What do you want to say to the player? `
  );

  await runPlayerConversationWithStoryteller(player, messageForPlayer);
  return runNightPhase();
}

/**
 * Shares an announcement with all other players
 */
function broadcastAnnouncement(player: Player, announcement: string) {
  for (const otherPlayer of players) {
    if (player.name === otherPlayer.name) {
      continue;
    }

    const message = `${player.name} has made the announcement: ${announcement}`;

    otherPlayer.chatHistory.push({
      role: 'user',
      parts: [
        {
          text: message,
        },
      ],
    });
    otherPlayer.actionHistory.push('hear_announcement');
    fs.appendFileSync(
      `./generated/${otherPlayer.name}.csv`,
      `"Announcement","${message}","",""\n`
    );
  }
}

function getRandomActivePlayer(availablePlayers: Player[]): Player | null {
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
}

async function getPlayerInputInPrivateChat(
  player: Player,
  otherPlayers: Player[]
) {
  const otherPlayerNames = joinWithWord(otherPlayers.map(p => p.name));
  const playerResponse = await sendMessageToPlayer(
    player,
    `Would you like to say anything in the private chat with ${otherPlayerNames} ? You must respond with a JSON object with three properties. The 'reasoning' property should include a string of your current train of thought, the 'action' property should either be 'idle' (to listen and wait for others to say something) or 'private_message' (to say something in the private chat). If you choose 'private_message', you must also include a 'message' property with the message you want to share in the private chat.`,
    ['idle', 'private_message']
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

  for (const otherPlayer of otherPlayers) {
    otherPlayer.actionHistory.push('hear_private_message');
    otherPlayer.chatHistory.push({
      role: 'user',
      parts: [
        {
          text: `In your private chat, ${player.name} says: ${playerResponse.message}`,
        },
      ],
    });
    fs.appendFileSync(
      `./generated/${otherPlayer.name}.csv`,
      `"Private Chat","${player.name} says ${playerResponse.message}","",""\n`
    );
  }
}

async function runPrivateChat(playersInChat: Player[]) {
  await sleep(
    Math.floor(MINIMUM_DELAY + Math.random() * (MAXIMUM_DELAY - MINIMUM_DELAY))
  );

  const randomPlayerInChat = getRandomActivePlayer(playersInChat);
  if (!randomPlayerInChat) {
    console.info(`The private chat is now over!`);
    return;
  }

  await getPlayerInputInPrivateChat(
    randomPlayerInChat,
    playersInChat.filter(
      otherPlayer => otherPlayer.name !== randomPlayerInChat.name
    )
  );

  return runPrivateChat(playersInChat);
}

async function startPrivateChat(
  requesterPlayer: Player,
  otherPlayerNames: string[]
) {
  const otherPlayerNamesLowercase = otherPlayerNames.map(otherPlayerName =>
    otherPlayerName.toLowerCase()
  );
  const otherPlayers = players.filter(otherPlayer =>
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

    playerInChat.actionHistory.push('join_private_chat');
    playerInChat.chatHistory.push({
      role: 'user',
      parts: [
        {
          text: `You are now in a private chat with ${otherPlayersInChat}`,
        },
      ],
    });
    fs.appendFileSync(
      `./generated/${playerInChat.name}.csv`,
      `"Private Chat","Started a private chat with ${otherPlayersInChat}","",""\n`
    );
  }

  await getPlayerInputInPrivateChat(requesterPlayer, otherPlayers);
  await runPrivateChat(playersInChat);

  for (const playerInChat of playersInChat) {
    const otherPlayersInChat = joinWithWord(
      playersInChat
        .filter(player => player.name !== playerInChat.name)
        .map(player => player.name)
    );

    playerInChat.actionHistory.push('leave_private_chat');
    playerInChat.chatHistory.push({
      role: 'user',
      parts: [
        {
          text: `You have now finished the private chat with ${otherPlayersInChat} and rejoined the other players`,
        },
      ],
    });
    fs.appendFileSync(
      `./generated/${playerInChat.name}.csv`,
      `"Private Chat","Finished private chat with ${otherPlayersInChat}","",""\n`
    );
  }
}

async function getPlayerInputForDiscussionPhase(
  selectedPlayer: Player
): Promise<void> {
  const playerResponse = await sendMessageToPlayer(
    selectedPlayer,
    `It's currently the discussion phase. You can make any of the following actions: \n${[
      ` - 'announcement': Publicly announce some information to all players. You must put your announcement in the 'announcement' property`,
      ` - 'request_private_chat': Request a private chat with one or more players. You will need to include a message to publicly ask those players to chat using the 'message' property `,
      ` - 'talk_to_storyteller': Privately ask the storyteller a question. You will need to include your message for the storyteller in the 'message' property`,
      ` - 'idle': Do nothing, and listen to what other members of the town do first`,
    ].join(
      '\n'
    )}\n\nPlease respond with a JSON object including your 'reasoning', 'action' and the 'message' that you would like to share, if applicable to the action you are taking. If you need to list one or more players as part of your action, include a string array with the property 'players' in your response`,
    ['announcement', 'request_private_chat', 'talk_to_storyteller', 'idle']
  );

  if (playerResponse.action === 'idle') {
    return;
  } else if (playerResponse.action === 'announcement') {
    if (!playerResponse.message) {
      console.error(`Player announcement is missing message`, {
        selectedPlayer,
        playerResponse,
      });
      throw new Error(`Player announcement was missing message!`);
    }
    console.info(`${selectedPlayer.name}: ${playerResponse.message}`);
    return broadcastAnnouncement(selectedPlayer, playerResponse.message);
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

    return runPlayerConversationWithStoryteller(
      selectedPlayer,
      `The storyteller has answered: ${storytellerResponse}`
    );
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

    broadcastAnnouncement(selectedPlayer, playerResponse.message);
    return startPrivateChat(selectedPlayer, playerResponse.players);
  }

  throw new Error(
    `Invalid action '${playerResponse.action}' during the discussion phase from ${selectedPlayer.name}`
  );
}

async function runDiscussionPhase(nominationsOpen = false) {
  const userInput = (
    await asyncReadline(
      `Would you like to [C]ontinue discussion or [O]pen nominations`
    )
  ).toUpperCase();

  if (userInput === 'O') {
  } else if (userInput !== 'C') {
    console.error(`You must respond with either [C] or [O]!`);
    return runDiscussionPhase(nominationsOpen);
  }

  await sleep(
    Math.floor(MINIMUM_DELAY + Math.random() * (MAXIMUM_DELAY - MINIMUM_DELAY))
  );

  const selectedPlayer = getRandomActivePlayer(players);

  if (!selectedPlayer) {
    console.info(`The discussion phase is now over!`);
    return;
  }

  await getPlayerInputForDiscussionPhase(selectedPlayer);
  return runDiscussionPhase(nominationsOpen);
}

async function runTestGame() {
  await initializePlayers();

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
