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
    actualRole: 'Empath',
    chatHistory: [],
    actionHistory: [],
    status: 'alive',
  },
  {
    name: 'Otto',
    actualRole: 'Imp',
    chatHistory: [],
    actionHistory: [],
    status: 'alive',
  },
  {
    name: 'Raph',
    actualRole: 'Investigator',
    chatHistory: [],
    actionHistory: [],
    status: 'alive',
  },
  {
    name: 'Fifi',
    actualRole: 'Artist',
    chatHistory: [],
    actionHistory: [],
    status: 'alive',
  },
  {
    name: 'Hzel',
    actualRole: 'Klutz',
    tokenShown: 'Investigator',
    chatHistory: [],
    actionHistory: [],
    status: 'alive',
  },
  {
    name: 'Fig',
    actualRole: 'Scarlet Woman',
    chatHistory: [],
    actionHistory: [],
    status: 'alive',
  },
];
