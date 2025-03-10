// The min and max delay between messages
import path from 'node:path';

export const MINIMUM_DELAY = 2000;
export const MAXIMUM_DELAY = 8000;

export const ROLES_DIRECTORY = path.resolve(process.cwd(), './data/roles/');
export const PROMPTS_DIRECTORY = path.resolve(process.cwd(), './data/prompts/');
export const GENERATED_DATA_DIRECTORY = path.resolve(
  process.cwd(),
  './data/generated/'
);
