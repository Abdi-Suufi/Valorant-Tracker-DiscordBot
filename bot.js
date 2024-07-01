require("dotenv").config();
const { Client, Intents } = require("discord.js");
const axios = require("axios");

const BOT_TOKEN = process.env.BOT_TOKEN;
const HENRIK_API_KEY = process.env.HENRIK_API_KEY;

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

client.once("ready", () => {
  console.log("Bot is ready.");
});

client.on("messageCreate", async (message) => {
  if (message.content.startsWith("!rank")) {
    const args = message.content.split(" ");
    if (args.length !== 2) {
      return message.channel.send("Usage: !rank <username#tag>");
    }

    const usernameTag = args[1];
    if (!usernameTag.includes("#")) {
      return message.channel.send("Invalid format. Use 'username#tag'");
    }

    const [username, tag] = usernameTag.split("#");

    try {
      const accountResponse = await axios.get(
        `https://api.henrikdev.xyz/valorant/v1/account/${username}/${tag}`,
        {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${HENRIK_API_KEY}`,
          },
        }
      );

      const accountData = accountResponse.data;
      if (!accountData.data || !accountData.data.region) {
        return message.channel.send("Region not found in account data");
      }

      const region = accountData.data.region;

      const rankResponse = await axios.get(
        `https://api.henrikdev.xyz/valorant/v2/mmr/${region}/${username}/${tag}`,
        {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${HENRIK_API_KEY}`,
          },
        }
      );

      const rankData = rankResponse.data;

      if (
        rankData.data &&
        rankData.data.current_data &&
        rankData.data.current_data.currenttierpatched
      ) {
        const currentRank = rankData.data.current_data.currenttierpatched;
        const currentRankImage = rankData.data.current_data.images.large;
        const currentElo = rankData.data.current_data.elo;

        const highestRank = rankData.data.highest_rank.patched_tier || "N/A";
        const highestRankImage = rankData.data.highest_rank.tier
          ? `https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/${rankData.data.highest_rank.tier}/largeicon.png`
          : "";

        const responseMessage = `
                **Current Rank**: ${currentRank} (${currentElo} Elo)
                ![Current Rank](${currentRankImage})
                **Highest Rank**: ${highestRank}
                ![Highest Rank](${highestRankImage})
                `;

        message.channel.send(responseMessage);
      } else {
        message.channel.send("Rank data not found in API response");
      }
    } catch (error) {
      console.error(error);
      message.channel.send("An error occurred while retrieving the rank.");
    }
  }
});

client.login(BOT_TOKEN);
