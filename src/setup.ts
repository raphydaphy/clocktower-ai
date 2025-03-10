import { Player } from './clocktower/types';

// Only the characters below are currently supported.
// If you want to add new characters, you can create JSON files for each character
// in the ./data/roles directory. Just copy one of the existing files and edit
// it for the character that you want to add.
export const SCRIPT = [
  'investigator',
  'clockmaker',
  'empath',
  'chambermaid',
  'artist',
  'sage',
  'drunk',
  'klutz',
  'baron',
  'scarlet-woman',
  'imp',
];

// You can change the player list below to adjust the setup.
// Players are in clockwise order, starting from the top middle of the circle
export const PLAYERS: Player[] = [
  {
    name: 'Maya',
    actualRole: 'Chambermaid',
    chatHistory: [],
    actionHistory: [],
    status: 'alive',
  },
  {
    name: 'Harper',
    actualRole: 'Baron',
    chatHistory: [],
    actionHistory: [],
    status: 'alive',
  },
  {
    name: 'Arun',
    actualRole: 'Klutz',
    chatHistory: [],
    actionHistory: [],
    status: 'alive',
  },
  {
    name: 'Anne',
    actualRole: 'Imp',
    chatHistory: [],
    actionHistory: [],
    status: 'alive',
  },
  {
    name: 'Ziggy',
    actualRole: 'Drunk',
    tokenShown: 'Investigator',
    chatHistory: [],
    actionHistory: [],
    status: 'alive',
  },
  {
    name: 'Joanna',
    actualRole: 'Artist',
    chatHistory: [],
    actionHistory: [],
    status: 'alive',
  },
];
