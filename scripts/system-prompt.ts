import * as fs from 'node:fs';

type Role = {
  name: string;
  type: 'townsfolk' | 'outsider' | 'minion' | 'demon';
  ability: string;
  detailed_description: string;
  player_tips: string[];
  bluffing_tips?: string[];
  fighting_tips?: string[];
};

const getRoleJson = (role: string): Role => {
  return JSON.parse(
    fs.readFileSync(
      `./roles/${role.toLowerCase().replace(/\s/g, '-')}.json`,
      'utf-8'
    )
  );
};

const createSystemPrompt = (roles: string[]) => {
  const introductionPrompt = fs.readFileSync(
    './prompts/introduction.txt',
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

  const conclusionPrompt = fs.readFileSync('./prompts/conclusion.txt', 'utf-8');
  scriptPromptParts.push(`\n\n${conclusionPrompt}`);

  return scriptPromptParts.join('\n');
};

fs.writeFileSync(
  './prompts/generated.txt',
  createSystemPrompt(['clockmaker', 'empath', 'investigator'])
);
