import 'dotenv/config';
import {
  GameStatus,
  NominationResult,
  Player,
  PlayerDiscussionResult,
} from '../src/services/clocktower/types';
import * as fs from 'node:fs';
import readline from 'readline';
import { asyncReadline } from '../src/services/readline';
import { joinWithWord, randomSleep } from '../src/services/utils';
import {
  broadcastMessage,
  formatPlayerStatus,
  getRandomActivePlayer,
  initializePlayers,
  selectPlayer,
  sendMessageToPlayer,
} from '../src/services/clocktower/players';
import { startPrivateChat } from '../src/services/clocktower/private-chat';
import {
  runPlayerConversationWithStoryteller,
  selectAndKillPlayer,
} from '../src/services/clocktower/storyteller';
import { startNomination } from '../src/services/clocktower/nomination';

// Players are in clockwise order, starting from the top middle of the circle
const players: Player[] = [
  {
    name: 'Maya',
    actualRole: 'Klutz',
    chatHistory: [],
    actionHistory: [],
    status: 'alive',
  },
  {
    name: 'Joanna',
    actualRole: 'Investigator',
    chatHistory: [],
    actionHistory: [],
    status: 'alive',
  },
  {
    name: 'Anne',
    actualRole: 'Empath',
    chatHistory: [],
    actionHistory: [],
    status: 'alive',
  },
  {
    name: 'Ziggy',
    actualRole: 'Artist',
    chatHistory: [],
    actionHistory: [],
    status: 'alive',
  },
  {
    name: 'Arun',
    actualRole: 'Scarlet Woman',
    chatHistory: [],
    actionHistory: [],
    status: 'alive',
  },
  {
    name: 'Harper',
    actualRole: 'Imp',
    chatHistory: [],
    actionHistory: [],
    status: 'alive',
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
      `Would you like to [W]ake a player, [K]ill a player or [E]nd the night: `
    )
  ).toUpperCase();

  if (userInput === 'E') {
    return;
  } else if (userInput === 'K') {
    await selectAndKillPlayer(rl, players);

    const gameStatus = getGameStatus();
    if (gameStatus !== 'ongoing') {
      finishGame(gameStatus);
      return;
    }
    return runNightPhase();
  } else if (userInput !== 'W') {
    console.warn(`You must choose [W], [K] or [E]!`);
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

async function usePublicAbility(
  player: Player,
  message: string,
  selectedPlayer?: string
) {
  console.info(`${player.name} wants to use a public ability: ${message}`);

  await broadcastMessage(
    players,
    `${player.name} has used a public ability: ${message}`,
    [player.name]
  );

  const userInput = (
    await asyncReadline(
      rl,
      `${player.name} has tried to use a public ability. Would you like to [S]end a message, [K]ill a player or [E]nd the game?`
    )
  ).toUpperCase();

  if (userInput === 'K') {
    await selectAndKillPlayer(rl, players);

    const gameStatus = getGameStatus();
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
    return usePublicAbility(player, message, selectedPlayer);
  }

  const messageForTown = await asyncReadline(
    rl,
    `How would you respond to to the town: `
  );
  await broadcastMessage(players, messageForTown);
}

/**
 * Gets player input and returns the action taken
 *
 * @param selectedPlayer The player who should take an input
 * @param nominationsOpen Are nominations open yet?
 * @param existingNomination The current player who is on the block, if any
 */
async function getPlayerInputForDiscussionPhase(
  selectedPlayer: Player,
  nominationsOpen: boolean,
  existingNomination?: NominationResult
): Promise<PlayerDiscussionResult> {
  const playerResponse = await sendMessageToPlayer(
    systemInstruction,
    selectedPlayer,
    `${[
      !nominationsOpen && `It's currently the discussion phase`,
      nominationsOpen &&
        !existingNomination &&
        `It's currently the nomination phase. You can nominate a player for execution, or make a public announcement. You can no longer talk to the storyteller in private (e.g. to use character abilities) - you'll need to wait until the next day if you want to do this.`,
      nominationsOpen &&
        existingNomination &&
        `It's currently the nomination phase and ${existingNomination.nominee} is on the block for execution with ${existingNomination.votes} votes. You can still nominate a different player if you think they should die instead, or you can do nothing and the ${existingNomination.nominee.name} will be executed shortly.`,
    ]
      .filter(Boolean)
      .join(' ')}. You can make any of the following actions: \n${[
      ` - 'announcement': Publicly announce some information to all players. You must put your announcement in the 'announcement' property`,
      !nominationsOpen &&
        ` - 'public_ability': Use a character ability that functions in public, such as the Slayer or the Klutz. If you are targeting a player with your ability, you need to specify the player you are targeting in the 'player' property. You must also include a message to the storyteller and the town which explains what you are doing in the 'message' property. You can attempt to use a public ability even if you don't actually have the ability, and if it doesn't work you can always claim that you might be drunk or poisoned, etc`,
      !nominationsOpen &&
        ` - 'request_private_chat': Request a private chat with one or more players. You will need to include a message to publicly ask those players to chat using the 'message' property `,
      !nominationsOpen &&
        ` - 'talk_to_storyteller': Privately ask the storyteller a question. You will need to include your message for the storyteller in the 'message' property`,
      nominationsOpen &&
        ` - 'nominate': Make a nomination for a specific player. You can only nominate once per day, and each player can only be nominated once per day. You need to include a message to share with the town in the 'message' property as well as the name of the player you want to nominate as a single entry in the 'players' array.`,
      ` - 'idle': Do nothing, and listen to what other members of the town do first. Don't be afraid to idle and listen for other input before jumping in, often it is better to stay quiet than to over-share, even if you are good.`,
    ]
      .filter(Boolean)
      .join(
        '\n'
      )}\n\nPlease respond with a JSON object including your 'reasoning', 'action' and the 'message' that you would like to share, if applicable to the action you are taking. If you need to list one or more players as part of your action, include a string array with the property 'players' in your response`,
    [
      'announcement',
      !nominationsOpen && 'public_ability',
      !nominationsOpen && 'request_private_chat',
      !nominationsOpen && 'talk_to_storyteller',
      nominationsOpen && 'nominate',
      'idle',
    ].filter(Boolean) as string[]
  );

  if (playerResponse.action === 'idle') {
    return { action: 'idle' };
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
    return { action: 'announcement' };
  } else if (playerResponse.action === 'public_ability') {
    if (!playerResponse.message) {
      console.error(`Public ability use is missing message`, {
        selectedPlayer,
        playerResponse,
      });
      throw new Error(`Public ability use was missing message!`);
    }

    await usePublicAbility(
      selectedPlayer,
      playerResponse.message,
      playerResponse.players?.length ? playerResponse.players[0] : undefined
    );
    return { action: 'public_ability' };
  } else if (playerResponse.action === 'talk_to_storyteller') {
    if (nominationsOpen) {
      throw new Error(`Cannot talk to storyteller during nominations!`);
    } else if (!playerResponse.message) {
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
    return { action: 'talk_to_storyteller' };
  } else if (playerResponse.action === 'request_private_chat') {
    if (nominationsOpen) {
      throw new Error(`Cannot begin a private chat during nominations!`);
    } else if (!playerResponse.players?.length) {
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
    return { action: 'request_private_chat' };
  } else if (playerResponse.action === 'nominate') {
    if (!nominationsOpen) {
      throw new Error(
        `${selectedPlayer.name} made a nomination before Nominations were opened!`
      );
    } else if (!playerResponse.players?.length) {
      throw new Error(
        `${selectedPlayer.name} made a nomination without specifying any players!`
      );
    } else if (playerResponse.players.length > 1) {
      throw new Error(
        `${selectedPlayer.name} nominated more than one player at once!`
      );
    } else if (!playerResponse.message) {
      throw new Error(
        `${selectedPlayer.name} made a nomination without a message!`
      );
    }

    const nominatedPlayer = players.find(
      otherPlayer => otherPlayer.name === playerResponse.players![0]
    );

    if (!nominatedPlayer) {
      throw new Error(
        `Invalid player name "${playerResponse.players[0]}" for nomination`
      );
    }

    const nominationResult = await startNomination(
      systemInstruction,
      rl,
      players,
      selectedPlayer,
      nominatedPlayer,
      playerResponse.message
    );

    return {
      action: 'nomination',
      nomination: nominationResult,
    };
  }

  throw new Error(
    `Invalid action '${playerResponse.action}' during the discussion phase from ${selectedPlayer.name}`
  );
}

async function completeDiscussionPhase(nomination?: NominationResult) {
  if (!nomination) {
    const message = `The day is now over and no one made any nominations! Good night!`;
    await broadcastMessage(players, message);
    return;
  }

  const userInput = (
    await asyncReadline(
      rl,
      `Nominations are now closed. ${nomination.nominee.name} was nominated by ${nomination.nominator.name} and received ${nomination.votes} votes, which is enough for execution. Does ${nomination.nominee.name} die [Y/n]? `
    )
  ).toUpperCase();

  if (userInput === 'Y') {
    const message = `${nomination.nominee.name} is executed and dies! Goodnight!`;
    if (nomination.nominee.status === 'alive') {
      nomination.nominee.status = 'dead-with-vote';

      const gameStatus = getGameStatus();
      if (gameStatus !== 'ongoing') {
        return finishGame(gameStatus);
      }
    }
    console.info(message);
    await broadcastMessage(players, `Nominations are now closed. ${message}`);
    return;
  } else if (userInput === 'N') {
    const message = `${nomination.nominee.name} is executed, but does not die! Goodnight!`;
    console.info(message);
    await broadcastMessage(players, `Nominations are now closed. ${message}`);
    return;
  }

  console.warn(`You must choose [Y] or [N]!`);
  return completeDiscussionPhase(nomination);
}

function getGameStatus(): GameStatus {
  let aliveDemons = 0;
  let alivePlayers = 0;

  for (const player of players) {
    if (player.status !== 'alive') {
      continue;
    }

    alivePlayers++;

    // TODO: Check the role type rather than the role name
    if (player.actualRole === 'Imp') {
      aliveDemons++;
    }
  }

  if (!aliveDemons) {
    return 'good-wins';
  } else if (alivePlayers <= 2) {
    return 'evil-wins';
  }

  return 'ongoing';
}

function finishGame(status: GameStatus) {
  if (status === 'good-wins') {
    console.info(`The good team wins! Congratulations!`);
    return;
  }

  console.info(`The evil team wins! Congratulations!`);
  return;
}

async function runDiscussionPhase(
  messageCount = 0,
  nominationsOpen = false,
  existingNomination?: NominationResult
) {
  // Every 6 messages, check if the storyteller wants to continue the discussion
  if (!nominationsOpen && messageCount >= 6 && messageCount % 6 === 0) {
    const userInput = (
      await asyncReadline(
        rl,
        `Would you like to [C]ontinue discussion or [O]pen nominations: `
      )
    ).toUpperCase();

    if (userInput === 'O') {
      console.info(`Nominations are now open!`);
      await broadcastMessage(
        players,
        `The storyteller has opened nominations! Does anyone have a player that they wish to nominate for execution?`
      );
      return runDiscussionPhase(messageCount + 1, true);
    } else if (userInput !== 'C') {
      console.error(`You must respond with either [C] or [O]!`);
      return runDiscussionPhase(
        messageCount + 1,
        nominationsOpen,
        existingNomination
      );
    }
  } else if (
    nominationsOpen &&
    (existingNomination || messageCount % 2 === 0)
  ) {
    const userInput = (
      await asyncReadline(
        rl,
        `Would you like to [C]ontinue nominations or [E]nd the day: `
      )
    ).toUpperCase();

    if (userInput === 'E') {
      return completeDiscussionPhase(existingNomination);
    } else if (userInput !== 'C') {
      console.error(`You must respond with either [C] or [E]!`);
      return runDiscussionPhase(
        messageCount + 1,
        nominationsOpen,
        existingNomination
      );
    }
  }

  await randomSleep();

  const selectedPlayer = getRandomActivePlayer(players);

  if (!selectedPlayer) {
    return completeDiscussionPhase(existingNomination);
  }

  const result = await getPlayerInputForDiscussionPhase(
    selectedPlayer,
    nominationsOpen,
    existingNomination
  );

  if (result.nomination && result.nomination.result !== 'insufficient-votes') {
    return runDiscussionPhase(
      messageCount + 1,
      nominationsOpen,
      result.nomination.result === 'tie' ? undefined : result.nomination
    );
  }

  return runDiscussionPhase(
    result.action === 'idle' ? messageCount : messageCount + 1,
    nominationsOpen,
    existingNomination
  );
}

async function runDayNightCycle(dayCount = 1) {
  const gameStatus = getGameStatus();
  if (gameStatus !== 'ongoing') {
    return finishGame(gameStatus);
  }

  console.info(`It is now the night. All players close their eyes.`);

  console.info(
    `These are the players in the game in clockwise order, starting ta the top of the circle:`
  );

  for (const player of players) {
    if (player.tokenShown) {
      console.info(
        ` - ${player.name} (${formatPlayerStatus(player.status)}: ${
          player.actualRole
        } (Shown ${player.tokenShown})]`
      );
      continue;
    }
    console.info(` - ${player.name}: ${player.actualRole}`);
  }

  await runNightPhase();

  const userInput = await asyncReadline(
    rl,
    `The night phase is now over. What would you like to say to the town as they wake in the morning: `
  );

  await broadcastMessage(players, userInput);
  await runDiscussionPhase();

  await runDayNightCycle(dayCount + 1);
}

async function runTestGame() {
  await initializePlayers(systemInstruction, players);
  await runDayNightCycle();
}

runTestGame()
  .then(() => console.info(`Done!`))
  .catch(err => console.error(`It failed`, err));
