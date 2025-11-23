const axios = require("axios");
require("dotenv").config();
const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  SlashCommandBuilder, 
  Routes, 
  REST, 
  ApplicationCommandOptionType, 
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Setup Express server for web hosting platforms like Render
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Basic route for health checks
app.get('/', (req, res) => {
  res.send('Bot is alive!');
});

// Start the web server
app.listen(port, () => {
  console.log(`Web server listening on port ${port}`);
});

/**
 * Fetches Valorant player data and constructs an Embed for response.
 * @param {string} usernameTag The Valorant username#tag string.
 * @returns {Promise<EmbedBuilder | string>} A promise that resolves to an EmbedBuilder or an error message string.
 */
async function getValorantRankEmbed(usernameTag) {
  if (!usernameTag.includes("#")) {
    return "Invalid format. Use 'username#tag'";
  }

  const [username, tag] = usernameTag.split("#");
  
  const lowerUsername = username.toLowerCase();
  const lowerTag = tag.toLowerCase();

  try {
    const accountUrl = `https://api.henrikdev.xyz/valorant/v1/account/${lowerUsername}/${lowerTag}`;
    const headers = {
      accept: "application/json",
      Authorization: process.env.API_KEY,
    };

    let response = await axios.get(accountUrl, { headers });
    if (response.status !== 200) {
      return `HTTP error occurred while fetching account info. Status: ${response.status}`;
    }

    const accountData = response.data;
    if (!accountData.data || !accountData.data.region) {
      return "Region not found in account data. Check if the player exists.";
    }

    const region = accountData.data.region;
    const rankUrl = `https://api.henrikdev.xyz/valorant/v2/mmr/${region}/${lowerUsername}/${lowerTag}`;
    const lifetimeStatsUrl = `https://api.henrikdev.xyz/valorant/v1/lifetime/mmr-history/${region}/${lowerUsername}/${lowerTag}`;
    const playerCardUrl = `https://api.henrikdev.xyz/valorant/v1/account/${lowerUsername}/${lowerTag}`;
    const matchesUrl = `https://api.henrikdev.xyz/valorant/v3/matches/${region}/${lowerUsername}/${lowerTag}`;

    // Fetch all required data in parallel
    const [rankResponse, lifetimeResponse, playerCardResponse, matchesResponse] = await Promise.all([
      axios.get(rankUrl, { headers }),
      axios.get(lifetimeStatsUrl, { headers }),
      axios.get(playerCardUrl, { headers }),
      axios.get(matchesUrl, { headers })
    ]);

    if (rankResponse.status !== 200 || lifetimeResponse.status !== 200 || 
        playerCardResponse.status !== 200 || matchesResponse.status !== 200) {
      return "Error fetching player data";
    }

    const rankData = rankResponse.data;
    const playerCardData = playerCardResponse.data;
    const matchesData = matchesResponse.data;

    if (rankData.data && rankData.data.current_data) {
      const currentRank = rankData.data.current_data.currenttierpatched;
      const currentRankImage = rankData.data.current_data.images.small;
      const currentElo = rankData.data.current_data.elo;
      const highestRank = rankData.data.highest_rank.patched_tier || "N/A";
      const highestRankImage = rankData.data.highest_rank.tier
        ? `https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/${rankData.data.highest_rank.tier}/smallicon.png`
        : "";

      // Calculate ELO progress
      const eloProgress = currentElo % 100;
      const nextRankProgress = `${eloProgress}/100`;

      // Calculate stats from recent matches
      const matches = matchesData.data || [];
      let totalKills = 0;
      let totalDeaths = 0;
      let totalAssists = 0;
      let totalHeadshots = 0;
      let totalBodyshots = 0;
      let totalWins = 0;

      matches.forEach(match => {
        if (!match.players || !match.players.all_players) return;

        const playerStats = match.players.all_players.find(p => 
          p.name.toLowerCase() === lowerUsername && p.tag.toLowerCase() === lowerTag
        );
        
        if (playerStats) {
          totalKills += playerStats.stats.kills || 0;
          totalDeaths += playerStats.stats.deaths || 0;
          totalAssists += playerStats.stats.assists || 0;
          totalHeadshots += playerStats.stats.headshots || 0;
          totalBodyshots += playerStats.stats.bodyshots || 0;
          
          const playerTeam = playerStats.team;
          if (match.teams && match.teams[playerTeam] && match.teams[playerTeam].has_won) {
            totalWins++;
          }
        }
      });

      const matchCount = matches.length;
      const kd = totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : "N/A";
      const totalShots = totalHeadshots + totalBodyshots + (matches.length > 0 ? (matches[0].players.all_players.find(p => p.name.toLowerCase() === lowerUsername && p.tag.toLowerCase() === lowerTag)?.stats.legshots || 0) : 0);
      const headshotPercentage = totalShots > 0 ? ((totalHeadshots / totalShots) * 100).toFixed(1) : "N/A";
      const winRate = matchCount > 0 ? ((totalWins / matchCount) * 100).toFixed(1) : "N/A";

      const embed = new EmbedBuilder()
        .setTitle(`${usernameTag}'s Valorant Profile`)
        .setColor('#FF4655')
        .setThumbnail(playerCardData.data.card?.small || currentRankImage)
        .addFields(
          { 
            name: "🏆 Current Rank", 
            value: `${currentRank}`, 
            inline: true 
          },
          {
            name: "⭐ Peak Rank",
            value: `${highestRank}`,
            inline: true
          },
          {
            name: "📊 Rank Progress",
            value: `${nextRankProgress}`,
            inline: true
          },
          {
            name: "\u200B",
            value: "\u200B",
            inline: false
          },
          {
            name: "🔥 K/D (Recent)",
            value: `${kd}`,
            inline: true
          },
          {
            name: "🎯 Headshot % (Recent)",
            value: `${headshotPercentage}%`,
            inline: true
          },
          {
            name: "📈 Win Rate (Recent)",
            value: `${winRate}%`,
            inline: true
          }
        )
        .setFooter({ text: `Region: ${region.toUpperCase()}` })
        .setTimestamp();

      if (currentRankImage) {
        embed.setImage(currentRankImage);
      }

      return embed;
    } else {
        return "Could not retrieve current rank data for this player.";
    }
  } catch (error) {
    console.error("Error in getValorantRankEmbed:", error);
    return "An unknown error occurred while communicating with the Valorant API.";
  }
}

// Slash Command Setup
const commands = [
    new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Retrieves the current Valorant rank and stats for a player.')
        .addStringOption(option =>
            option.setName('username_tag')
                .setDescription('The Valorant username and tagline (e.g., playername#tag)')
                .setRequired(true)
        )
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function deployCommands(client) {
    const clientId = process.env.CLIENT_ID;

    if (!clientId) {
        console.error("CLIENT_ID is not set in the environment variables. Slash commands will not be deployed.");
        return;
    }

    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);
        
        // Register the commands globally
        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands globally.`);
    } catch (error) {
        console.error(error);
    }
}

// Client Listeners

client.once("ready", async () => {
  await deployCommands(client);
  console.log("Bot is ready!");
});

// Slash Command Handler
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand() || interaction.commandName !== 'rank') return;

    // Acknowledge interaction quickly to prevent timeout
    await interaction.deferReply();

    const usernameTag = interaction.options.getString('username_tag');
    const result = await getValorantRankEmbed(usernameTag);

    if (result instanceof EmbedBuilder) {
        await interaction.editReply({ embeds: [result] });
    } else {
        await interaction.editReply(result);
    }
});


// Prefix Command Handler 
client.on("messageCreate", async (message) => {
  if (message.content.startsWith("!rank")) {
    const args = message.content.split(" ");
    if (args.length !== 2) {
      message.channel.send("Please use the format !rank username#tag");
      return;
    }

    const usernameTag = args[1];
    console.log(`Fetching rank for: ${usernameTag}`);

    const result = await getValorantRankEmbed(usernameTag);

    if (result instanceof EmbedBuilder) {
        message.channel.send({ embeds: [result] });
    } else {
        message.channel.send(result);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);