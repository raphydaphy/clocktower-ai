import { Content } from '@google/generative-ai';

export type Player = {
  name: string;
  actualRole: string;
  // The token shown to the player, if it is different to their actual role
  tokenShown?: string;
  chatHistory: Content[];
  actionHistory: string[];
};

export type PlayerResponse = {
  reasoning: string;
  action: string;
  message?: string;
  players?: string[];
};

export type PlayerResponseWithPlayer = PlayerResponse & { player: Player };
