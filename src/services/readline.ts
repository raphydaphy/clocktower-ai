import readline from 'readline';

export const asyncReadline = (
  rl: readline.Interface,
  query: string
): Promise<string> => {
  console.info(query);
  return new Promise(resolve => {
    rl.question(`> `, response => {
      resolve(response);
    });
  });
};
