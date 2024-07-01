const axios = require("axios");
require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log("Bot is ready!");
});

client.on("messageCreate", async (message) => {
  if (message.content.startsWith("!rank")) {
    const args = message.content.split(" ");
    if (args.length !== 2) {
      message.channel.send("Please use the format !rank username#tag");
      return;
    }

    const usernameTag = args[1];
    console.log(`Fetching rank for: ${usernameTag}`);

    try {
      if (!usernameTag.includes("#")) {
        message.channel.send("Invalid format. Use 'username#tag'");
        return;
      }

      const [username, tag] = usernameTag.split("#");
      const accountUrl = `https://api.henrikdev.xyz/valorant/v1/account/${username}/${tag}`;
      const headers = {
        accept: "application/json",
        Authorization: "HDEV-0fe3cd31-144b-48b3-9841-02c1183ccbe1",
      };

      let response = await axios.get(accountUrl, { headers });
      if (response.status !== 200) {
        message.channel.send("HTTP error occurred while fetching account info");
        console.error(`HTTP Status Code: ${response.status}`);
        return;
      }

      const accountData = response.data;
      if (!accountData.data || !accountData.data.region) {
        message.channel.send("Region not found in account data");
        return;
      }

      const region = accountData.data.region;
      const rankUrl = `https://api.henrikdev.xyz/valorant/v2/mmr/${region}/${username}/${tag}`;

      response = await axios.get(rankUrl, { headers });
      if (response.status !== 200) {
        message.channel.send("HTTP error occurred while fetching rank info");
        console.error(`HTTP Status Code: ${response.status}`);
        return;
      }

      const data = response.data;
      if (
        data.data &&
        data.data.current_data &&
        data.data.current_data.currenttierpatched
      ) {
        const currentRank = data.data.current_data.currenttierpatched;
        const currentRankImage = data.data.current_data.images.large;
        const currentElo = data.data.current_data.elo;

        const highestRank = data.data.highest_rank.patched_tier || "N/A";
        const highestRankImage = data.data.highest_rank.tier
          ? `https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/${data.data.highest_rank.tier}/largeicon.png`
          : "";

        const rankInfo = {
          current_rank: currentRank,
          current_rank_image: currentRankImage,
          current_elo: currentElo,
          highest_rank: highestRank,
          highest_rank_image: highestRankImage,
        };

        message.channel.send(
          `Current Rank: ${rankInfo.current_rank}\nCurrent ELO: ${rankInfo.current_elo}\nHighest Rank: ${rankInfo.highest_rank}`
        );
        // You can also send the images if the Discord bot has permissions to embed images.
      } else {
        message.channel.send("Rank data not found in API response");
      }
    } catch (error) {
      message.channel.send("An error occurred while fetching rank information");
      console.error(error);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
