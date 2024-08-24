const axios = require("axios");
require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
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
        Authorization: process.env.API_KEY,
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
        const currentRankImage = data.data.current_data.images.small;
        const currentElo = data.data.current_data.elo;

        const highestRank = data.data.highest_rank.patched_tier || "N/A";
        const highestRankImage = data.data.highest_rank.tier
          ? `https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/${data.data.highest_rank.tier}/smallicon.png`
          : "";

        const embed = new EmbedBuilder()
          .setTitle(`${usernameTag}'s Rank Info`)
          .addFields(
            { name: "Current Rank", value: currentRank, inline: false },
            { name: "Current ELO", value: currentElo.toString(), inline: false }
          )
          .setThumbnail(currentRankImage);

        if (highestRank !== "N/A") {
          embed
            .addFields({
              name: "Highest Rank",
              value: highestRank,
              inline: false,
            })
            .setImage(highestRankImage);
        } else {
          embed.addFields({
            name: "Highest Rank",
            value: highestRank,
            inline: false,
          });
        }

        message.channel.send({ embeds: [embed] });
      }
    } catch (error) {
      message.channel.send("An error occurred while fetching rank information");
      console.error(error);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);