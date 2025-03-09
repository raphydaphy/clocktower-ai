import readline from 'readline';

export const asyncReadline = (
  rl: readline.Interface,
  query: string
): Promise<string> => {
  return new Promise(resolve => {
    rl.question(query, response => {
      resolve(response);
    });
  });
};
