import { formatPlayerStatus } from './players';
import { getRoleJson } from './script';
import { GameStatus, Player } from './types';

export const listPlayers = (players: Player[]): void => {
  console.info(
    `These are the players in the game in clockwise order, starting ta the top of the circle:`
  );

  for (const player of players) {
    if (player.status !== 'alive') {
      if (player.tokenShown) {
        console.info(
          ` - ${player.name} (${formatPlayerStatus(player.status)}): ${
            player.actualRole
          } (Shown ${player.tokenShown})`
        );
        continue;
      }
      console.info(
        ` - ${player.name} (${formatPlayerStatus(player.status)}): ${
          player.actualRole
        }`
      );
      continue;
    }
    if (player.tokenShown) {
      console.info(
        ` - ${player.name}: ${player.actualRole} (Shown ${player.tokenShown})`
      );
      continue;
    }
    console.info(` - ${player.name}: ${player.actualRole}`);
  }
};

export const getGameStatus = (players: Player[]): GameStatus => {
  let aliveDemons = 0;
  let alivePlayers = 0;

  for (const player of players) {
    if (player.status !== 'alive') {
      continue;
    }

    alivePlayers++;

    const roleInfo = getRoleJson(player.actualRole);

    if (roleInfo.type === 'demon') {
      aliveDemons++;
    }
  }

  if (!aliveDemons) {
    return 'good-wins';
  } else if (alivePlayers <= 2) {
    return 'evil-wins';
  }

  return 'ongoing';
};

export const finishGame = (status: GameStatus): void => {
  if (status === 'good-wins') {
    console.info(`The good team wins! Congratulations!`);
    return;
  }

  console.info(`The evil team wins! Congratulations!`);
  return;
};
