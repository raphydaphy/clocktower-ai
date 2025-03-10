# Clocktower AI

It's blood on the clocktower with AI! A separate LLM context is created for each player so that they don't know other characters roles or thoughts, and the program is run by a real user who acts as the storyteller.

## Installing Dependencies

To run Clocktower AI, you first need to install the dependencies using `yarn install`.

Once you've installed the dependencies, create a `.env` file in the root directory of the project with a single line that specifies your Gemini API key, like the example below:

```
GEMINI_API_KEY={YOUR GEMINI API KEY}
```

You can generate a Gemini API key using the [Google AI Studio](https://aistudio.google.com/prompts/new_chat). It's free and you just need to log in with a Google account. Once you've logged into the Google AI Studio, click the blue "Get API Key" button in the top-left and create an API key, then copy the key value into the `.env` file that you created.

Once you've added your Gemini API key to the `.env` file, you are ready to continue.

## Running Clocktower AI

Once you've installed the dependencies, you can proceed to configure the script and player setup before running the game.

To adjust the script and player setup, open the `src/setup.ts` file. Currently on the No Greater Joy script is supported, but you can add more characters by creating JSON files in the `./data/roles` directory. Simply copy an existing JSON file from the directory and repurpose it for the character that you want to add.

Once you are happy with the script and player setup, you can run the game using the `yarn dev` command. The game runs in the command line and prompts you for input whenever you need to make a decision as the storyteller.

You will still need to keep track of the game using a grimoire. This tool only simulates the players actions - the storyteller still needs to play as normal. The easiest way to run the game is to open a command line with the tool in one window while opening [Pocket Grimoire](https://www.pocketgrimoire.co.uk/) in another window so that you can track them side-by-side.