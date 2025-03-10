import * as fs from 'node:fs';
import path from 'node:path';

import { PROMPTS_DIRECTORY, ROLES_DIRECTORY } from '../services/constants';
import { Role } from './types';

export const getRoleJson = (role: string): Role => {
  return JSON.parse(
    fs.readFileSync(
      path.resolve(
        ROLES_DIRECTORY,
        `./${role.toLowerCase().replace(/\s/g, '-')}.json`
      ),
      'utf-8'
    )
  );
};

export const createSystemPrompt = (roles: string[]): string => {
  const introductionPrompt = fs.readFileSync(
    path.resolve(PROMPTS_DIRECTORY, './introduction.txt'),
    'utf-8'
  );

  const scriptPromptParts: string[] = [
    introductionPrompt,
    `\n\nBelow is a detailed description of each character that is on the script:`,
  ];

  for (const role of roles) {
    const roleJson = getRoleJson(role);

    scriptPromptParts.push(
      `\n\n${roleJson.name} (${roleJson.type}): ${roleJson.ability}`
    );

    scriptPromptParts.push(
      `\nThis is the detailed description for the ${roleJson.name}:`,
      roleJson.detailed_description
    );

    scriptPromptParts.push(
      `\nBelow are some tips for playing as the ${roleJson.name}:`
    );
    for (const playerTip of roleJson.player_tips) {
      scriptPromptParts.push(` - ${playerTip}`);
    }

    if (roleJson.bluffing_tips) {
      scriptPromptParts.push(
        `\nBelow are some tips for bluffing as the ${roleJson.name}:`
      );
      for (const playerTip of roleJson.bluffing_tips) {
        scriptPromptParts.push(` - ${playerTip}`);
      }
    }

    if (roleJson.fighting_tips) {
      scriptPromptParts.push(
        `\nBelow are some tips for fighting against the ${roleJson.name}:`
      );
      for (const playerTip of roleJson.fighting_tips) {
        scriptPromptParts.push(` - ${playerTip}`);
      }
    }

    if (roleJson.examples) {
      scriptPromptParts.push(
        `\nBelow are some examples of how the ${roleJson.name} role is used:`
      );
      for (const playerTip of roleJson.examples) {
        scriptPromptParts.push(` - ${playerTip}`);
      }
    }
  }

  scriptPromptParts.push(
    `\n\nNow that you understand how each of these roles work in detail, below is a recap of the specific roles that are on the script.:`
  );

  for (const role of roles) {
    const roleJson = getRoleJson(role);
    scriptPromptParts.push(
      ` - ${roleJson.name} (${roleJson.type}): ${roleJson.ability}`
    );
  }

  const conclusionPrompt = fs.readFileSync(
    path.resolve(PROMPTS_DIRECTORY, './conclusion.txt'),
    'utf-8'
  );
  scriptPromptParts.push(`\n\n${conclusionPrompt}`);

  return scriptPromptParts.join('\n');
};
