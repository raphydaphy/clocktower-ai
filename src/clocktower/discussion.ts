import readline from 'readline';

import { asyncReadline } from '../services/readline';
import { joinWithWord, randomSleep } from '../services/utils';
import { startNomination } from './nomination';
import {
  broadcastMessage,
  getRandomActivePlayer,
  sendMessageToPlayer,
} from './players';
import { startPrivateChat } from './private-chat';
import { usePublicAbility } from './public-ability';
import { finishGame, getGameStatus } from './status';
import {
  makeStorytellerAnnouncement,
  runPlayerConversationWithStoryteller,
} from './storyteller';
import { NominationResult, Player, PlayerDiscussionResult } from './types';

/**
 * Gets player input and returns the action taken
 *
 * @param systemInstruction
 * @param rl
 * @param players All players in the game
 * @param selectedPlayer The player who should take an input
 * @param nominationsOpen Are nominations open yet?
 * @param existingNomination The current player who is on the block, if any
 */
export const getPlayerInputForDiscussionPhase = async (
  systemInstruction: string,
  rl: readline.Interface,
  players: Player[],
  selectedPlayer: Player,
  nominationsOpen: boolean,
  existingNomination?: NominationResult
): Promise<PlayerDiscussionResult> => {
  const playerResponse = await sendMessageToPlayer(
    systemInstruction,
    selectedPlayer,
    `${[
      !nominationsOpen && `It's currently the discussion phase`,
      nominationsOpen &&
        !existingNomination &&
        selectedPlayer.status === 'alive' &&
        `It's currently the nomination phase. You can nominate a player for execution, or make a public announcement. You can no longer talk to the storyteller in private (e.g. to use character abilities) - you'll need to wait until the next day if you want to do this.`,
      nominationsOpen &&
        existingNomination &&
        selectedPlayer.status === 'alive' &&
        `It's currently the nomination phase and ${existingNomination.nominee} is on the block for execution with ${existingNomination.votes} votes. You can still nominate a different player if you think they should die instead, or you can do nothing and the ${existingNomination.nominee.name} will be executed shortly.`,
      nominationsOpen &&
        selectedPlayer.status !== 'alive' &&
        `It's currently the nomination phase. You can't nominate anyone because you are dead, but you can still participate in the discussion.`,
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
        selectedPlayer.status === 'alive' &&
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
      nominationsOpen && selectedPlayer.status === 'alive' && 'nominate',
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
      rl,
      players,
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
      rl,
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
    } else if (selectedPlayer.status !== 'alive') {
      throw new Error(
        `${selectedPlayer.name} tried to nominate when they were dead!`
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
};

export const completeDiscussionPhase = async (
  rl: readline.Interface,
  players: Player[],
  nomination?: NominationResult
): Promise<void> => {
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

      const gameStatus = getGameStatus(players);
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
  return completeDiscussionPhase(rl, players, nomination);
};

export const runDiscussionPhase = async (
  systemInstruction: string,
  rl: readline.Interface,
  players: Player[],
  messageCount = 0,
  nominationsOpen = false,
  existingNomination?: NominationResult
): Promise<void> => {
  // Every 6 messages, check if the storyteller wants to continue the discussion
  if (!nominationsOpen && messageCount >= 6 && messageCount % 6 === 0) {
    const userInput = (
      await asyncReadline(
        rl,
        `Would you like to [C]ontinue discussion, [M]ake an announcement or [O]pen nominations: `
      )
    ).toUpperCase();

    if (userInput === 'O') {
      console.info(`Nominations are now open!`);
      await broadcastMessage(
        players,
        `The storyteller has opened nominations! Does anyone have a player that they wish to nominate for execution?`
      );
      return runDiscussionPhase(
        systemInstruction,
        rl,
        players,
        messageCount + 1,
        true
      );
    } else if (userInput === 'M') {
      await makeStorytellerAnnouncement(rl, players);
      return runDiscussionPhase(
        systemInstruction,
        rl,
        players,
        messageCount + 1,
        nominationsOpen
      );
    } else if (userInput !== 'C') {
      console.error(`You must respond with either [C], [M] or [O]!`);
      return runDiscussionPhase(
        systemInstruction,
        rl,
        players,
        messageCount + 1,
        nominationsOpen,
        existingNomination
      );
    }
  } else if (nominationsOpen && messageCount % 4 === 0) {
    const userInput = (
      await asyncReadline(
        rl,
        `Would you like to [C]ontinue nominations, [M]ake an announcement or [E]nd the day: `
      )
    ).toUpperCase();

    if (userInput === 'E') {
      return completeDiscussionPhase(rl, players, existingNomination);
    } else if (userInput === 'M') {
      await makeStorytellerAnnouncement(rl, players);
      return runDiscussionPhase(
        systemInstruction,
        rl,
        players,
        messageCount + 1,
        nominationsOpen,
        existingNomination
      );
    } else if (userInput !== 'C') {
      console.error(`You must respond with either [C], [M] or [E]!`);
      return runDiscussionPhase(
        systemInstruction,
        rl,
        players,
        messageCount + 1,
        nominationsOpen,
        existingNomination
      );
    }
  }

  await randomSleep();

  const selectedPlayer = getRandomActivePlayer(players);

  if (!selectedPlayer) {
    return completeDiscussionPhase(rl, players, existingNomination);
  }

  const result = await getPlayerInputForDiscussionPhase(
    systemInstruction,
    rl,
    players,
    selectedPlayer,
    nominationsOpen,
    existingNomination
  );

  if (result.nomination && result.nomination.result !== 'insufficient-votes') {
    return runDiscussionPhase(
      systemInstruction,
      rl,
      players,
      messageCount + 1,
      nominationsOpen,
      result.nomination.result === 'tie' ? undefined : result.nomination
    );
  }

  return runDiscussionPhase(
    systemInstruction,
    rl,
    players,
    result.action === 'idle' ? messageCount : messageCount + 1,
    nominationsOpen,
    existingNomination
  );
};
