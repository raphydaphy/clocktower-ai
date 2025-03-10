import readline from 'readline';

import { asyncReadline } from '../readline';
import { randomSleep } from '../utils';
import {
  broadcastMessage,
  getRandomActivePlayer,
  sendMessageToPlayer,
} from './players';
import { NominationResult, Player } from './types';

/**
 * Get a players opinion on a nomination and returns their action
 *
 * @param systemInstruction The system instruction
 * @param players All the players in the game
 * @param player The player who's input we are getting
 * @param nominator The nominator
 * @param nominee The nominee
 * @returns The action that the player took (idle or announcement)
 */
export const getPlayerInputInNomination = async (
  systemInstruction: string,
  players: Player[],
  player: Player,
  nominator: Player,
  nominee: Player
): Promise<string> => {
  const playerResponse = await sendMessageToPlayer(
    systemInstruction,
    player,
    `Would you like to say anything about ${
      nominator.name === player.name ? 'your' : `${nominator.name}'s`
    } nomination for ${
      nominee.name === player.name ? 'yourself' : nominee.name
    } ? You must respond with a JSON object with three properties. The 'reasoning' property should include a string of your current train of thought, the 'action' property should either be 'idle' (to listen and wait for others to say something) or 'announcement' (to say something publicly). If you choose 'announcement', you must also include a 'message' property with the message you want to share publicly about the nomination. Try to keep on topic and avoid discussing unrelated topics during the nomination. ${
      nominee.name === player.name || nominee.name === player.name
        ? `Make sure to put your best foot forward and try to convince the town of your viewpoint.`
        : `It's OK to stay quiet if you don't have anything important to add to the nomination. You'll get another chance to speak afterwards if you want to discuss something else.`
    }`,
    ['idle', 'announcement']
  );

  if (playerResponse.action === 'idle') {
    return 'idle';
  } else if (playerResponse.action !== 'announcement') {
    throw new Error(
      `Invalid player action in nomination '${playerResponse.action}'`
    );
  }

  console.info(`${player.name}: ${playerResponse.message}`);

  await broadcastMessage(
    players,
    `During the nomination for ${nominee.name}, ${player.name} says: ${playerResponse.message}`
  );
  return 'announcement';
};

export const runNominationDiscussion = async (
  systemInstruction: string,
  rl: readline.Interface,
  players: Player[],
  nominator: Player,
  nominee: Player,
  messageCount = 0
): Promise<void> => {
  // After every 3rd, check if the storyteller wants to continue
  if (messageCount >= 3 && messageCount % 3 === 0) {
    const userInput = (
      await asyncReadline(
        rl,
        `Would you like to [C]ontinue discussion or [P]roceed to voting: `
      )
    ).toUpperCase();

    if (userInput === 'P') {
      return;
    } else if (userInput !== 'C') {
      console.error(`You must respond with either [C] or [P]!`);
      return runNominationDiscussion(
        systemInstruction,
        rl,
        players,
        nominator,
        nominee,
        messageCount + 1
      );
    }
  }

  await randomSleep();

  const randomPlayer = getRandomActivePlayer(players);
  if (!randomPlayer) {
    console.info(`All players have chosen to idle`);
    return;
  }

  const action = await getPlayerInputInNomination(
    systemInstruction,
    players,
    randomPlayer,
    nominator,
    nominee
  );

  return runNominationDiscussion(
    systemInstruction,
    rl,
    players,
    nominator,
    nominee,
    action === 'idle' ? messageCount : messageCount + 1
  );
};

export const startNomination = async (
  systemInstruction: string,
  rl: readline.Interface,
  players: Player[],
  nominator: Player,
  nominee: Player,
  message: string,
  existingNomination?: NominationResult
): Promise<NominationResult> => {
  const nominationAnnouncement = `${nominator.name} has nominated ${nominee.name} for execution: ${message}`;
  console.info(nominationAnnouncement);

  await broadcastMessage(players, nominationAnnouncement, [nominator.name]);

  for (const player of players) {
    player.actionHistory.push('start_nomination');
  }

  console.info(
    `${nominator.name}, please give your reasoning for the nomination.`
  );
  await broadcastMessage(
    players,
    `The storyteller has requested ${nominator.name} to explain the reason for the nomination..`
  );

  await getPlayerInputInNomination(
    systemInstruction,
    players,
    nominator,
    nominator,
    nominee
  );

  console.info(`${nominee.name}, please give your defence for the nomination.`);
  await broadcastMessage(
    players,
    `The storyteller has requested ${nominee.name} to defend themselves..`
  );

  await getPlayerInputInNomination(
    systemInstruction,
    players,
    nominee,
    nominator,
    nominee
  );

  await runNominationDiscussion(
    systemInstruction,
    rl,
    players,
    nominator,
    nominee
  );

  // Votes are taken from the player to the left of the nominee clockwise until reaching the nominee last
  const nomineeIdx = players.findIndex(p => p.name === nominee.name);
  const voteOrder = [
    ...players.filter((_p, idx) => idx > nomineeIdx),
    ...players.filter((_p, idx) => idx <= nomineeIdx),
  ];

  const alivePlayerCount = players.filter(p => p.status === 'alive').length;
  const minVotes = existingNomination
    ? existingNomination.votes + 1
    : Math.ceil(alivePlayerCount / 2);

  const votePrompt = [
    `Votes for ${nominee.name} will begin with ${voteOrder[0].name} and end with ${nominee.name}, going clockwise around the circle`,
    `You don't have to vote if you don't want to, and sometimes it's beneficial to ensure that not too many people vote so that you still can overturn the nomination later in the day if you find a better candidate or learn new information.`,
    !existingNomination &&
      `If at least the majority of alive players vote, then ${nominee.name} will be put on the block for execution.`,
    !existingNomination &&
      `There are currently ${alivePlayerCount} alive players, so at least ${minVotes} vote are required for the nomination to go through.`,
    existingNomination &&
      `The previous nomination for ${existingNomination.nominee.name} got ${existingNomination.votes}, so at least ${minVotes} votes are required to put ${nominee.name} on the block instead.`,
    existingNomination &&
      `If ${nominee.name} receives the same number of votes as ${existingNomination.nominee.name} received, the nomination will result in a tie and neither player will be executed.`,
    `Remember that if you are dead, you only get one more vote for the rest of the game.`,
    `If you have already used your ghost vote, you cannot vote again`,
  ]
    .filter(Boolean)
    .join(' ');

  console.info(
    `Votes will begin with ${voteOrder[0].name} and end with ${nominee.name}. At least ${minVotes} are required.`
  );

  await broadcastMessage(players, votePrompt);
  let totalVotes = 0;

  for (const player of voteOrder) {
    if (player.status === 'dead-without-vote') {
      continue;
    }

    const playerResponse = await sendMessageToPlayer(
      systemInstruction,
      player,
      [
        `Would you like to vote for ${nominee.name}?`,
        player.status === 'dead-with-vote' &&
          `Don't forget that you are dead, so if you choose to vote now, you won't be able to vote again for the rest of the game.`,
        `Respond with a JSON object containing a 'reasoning' key that includes your train of thought, and a 'action' key which either has the value 'idle' (if you don't want to vote) or 'vote' (if you want to cast your vote).`,
      ]
        .filter(Boolean)
        .join(' '),
      ['idle', 'vote']
    );

    const hasVoted = Boolean(playerResponse.action === 'vote');
    if (hasVoted) {
      totalVotes++;
    }

    console.info(
      `${player.name} is ${
        hasVoted ? 'voting' : 'not voting'
      } (${totalVotes}/${minVotes})`
    );

    await broadcastMessage(
      players,
      `${player.name} has chosen ${
        hasVoted ? 'to vote' : 'not to vote'
      } towards the execution of ${nominee.name}. ${
        totalVotes < minVotes
          ? `That's ${totalVotes} out of ${minVotes} required votes so far`
          : `That's ${totalVotes} so far`
      }`
    );
  }

  if (existingNomination && existingNomination.votes === totalVotes) {
    const tieMessage = `${totalVotes} players voted to execute ${nominee.name}, which is a tie against the existing nomination for ${existingNomination.nominee.name}! Therefore, no one is on the block for execution now.`;

    console.info(tieMessage);
    await broadcastMessage(players, tieMessage);

    return {
      result: 'tie',
      votes: totalVotes,
      nominator,
      nominee,
    };
  } else if (totalVotes < minVotes) {
    const insufficientVotesMessage = [
      `Only ${totalVotes} players voted to execute ${nominee.name}, which is not enough!`,
      !existingNomination && `The nomination is now over.`,
      existingNomination &&
        `The nomination is now over and ${existingNomination.nominator} is still on the block for execution.`,
    ]
      .filter(Boolean)
      .join(' ');

    console.info(insufficientVotesMessage);
    await broadcastMessage(players, insufficientVotesMessage);

    return {
      result: 'insufficient-votes',
      votes: totalVotes,
      nominator,
      nominee,
    };
  }

  const successMessage = [
    `${totalVotes} players voted to execute ${nominee.name}, which is enough!`,
    !existingNomination && `${nominee.name} is now on the block for execution.`,
    existingNomination &&
      `${nominee.name} is now on the block for execution instead of ${existingNomination.nominee.name}`,
  ]
    .filter(Boolean)
    .join(' ');

  console.info(successMessage);
  await broadcastMessage(players, successMessage);

  return {
    result: 'on-the-block',
    votes: totalVotes,
    nominator,
    nominee,
  };
};
