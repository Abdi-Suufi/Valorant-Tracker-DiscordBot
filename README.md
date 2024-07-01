# Valorant Tracker Discord Bot

This is a Discord bot that allows users to track their Valorant rank and highest rank by entering their username and tag. The bot uses the Henrik-3rd party API to fetch the data.

## Features

- Retrieve current rank and highest rank for a given Valorant username and tag.
- Display rank images and elo score.

## Requirements

- Node.js (v20 or later)
- Discord.js (v14 or later)
- Axios

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/Abdi-Suufi/Valorant-Tracker-DiscordBot.git
    cd Valorant-Tracker-DiscordBot
    ```

2. Install dependencies:
    ```sh
    npm install
    npm install discord.js
    npm install axios
    npm install dotenv
    ```

3. Create a `.env` file in the root directory and add your Discord bot token and Henrik-3rd party API key:
    ```env
    DISCORD_TOKEN=your-discord-bot-token
    API_KEY=your-henrikdev-api-key
    ```

## Usage

1. Start the bot:
    ```sh
    node index.js
    ```

2. Invite the bot to your Discord server.

3. Use the `!rank username#tag` command in your Discord server to fetch your Valorant rank information.

## Example

In a Discord channel, type:
```sh
!rank Aybd1gh#3759
```
![image](https://github.com/Abdi-Suufi/Valorant-Tracker-DiscordBot/assets/93520190/c9d26406-a399-42a7-b758-143589927737)


