const axios = require("axios");
require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
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
      const lifetimeStatsUrl = `https://api.henrikdev.xyz/valorant/v1/lifetime/mmr-history/${region}/${username}/${tag}`;
      const playerCardUrl = `https://api.henrikdev.xyz/valorant/v1/account/${username}/${tag}`;
      const matchesUrl = `https://api.henrikdev.xyz/valorant/v3/matches/${region}/${username}/${tag}`;

      // Fetch all data in parallel
      const [rankResponse, lifetimeResponse, playerCardResponse, matchesResponse] = await Promise.all([
        axios.get(rankUrl, { headers }),
        axios.get(lifetimeStatsUrl, { headers }),
        axios.get(playerCardUrl, { headers }),
        axios.get(matchesUrl, { headers })
      ]);

      if (rankResponse.status !== 200 || lifetimeResponse.status !== 200 || 
          playerCardResponse.status !== 200 || matchesResponse.status !== 200) {
        message.channel.send("Error fetching player data");
        return;
      }

      const rankData = rankResponse.data;
      const lifetimeData = lifetimeResponse.data;
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
          const playerStats = match.players.all_players.find(p => 
            p.name.toLowerCase() === username.toLowerCase() && p.tag === tag
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
        const headshotPercentage = totalBodyshots > 0 ? ((totalHeadshots / totalBodyshots) * 100).toFixed(1) : "N/A";
        const winRate = matchCount > 0 ? ((totalWins / matchCount) * 100).toFixed(1) : "N/A";

        const embed = new EmbedBuilder()
          .setTitle(`${usernameTag}'s Valorant Profile`)
          .setColor('#FF4655')
          .setThumbnail(playerCardData.data.card?.small || currentRankImage)
          .addFields(
            { 
              name: "🏆 Current Rank", 
              value: `${currentRank}\n${currentRankImage ? `[⠀](${currentRankImage})` : ''}`, 
              inline: true 
            },
            {
              name: "⭐ Peak Rank",
              value: `${highestRank}\n${highestRankImage ? `[⠀](${highestRankImage})` : ''}`,
              inline: true
            },
            {
              name: "📊 Rank Progress",
              value: `${nextRankProgress}`,
              inline: true
            }
          )
          .setFooter({ text: `Region: ${region.toUpperCase()}` })
          .setTimestamp();

        if (highestRankImage) {
          embed.setImage(highestRankImage);
        }

        // Create buttons for additional information
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('recent_matches')
              .setLabel('Recent Matches')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('agent_stats')
              .setLabel('Agent Stats')
              .setStyle(ButtonStyle.Secondary)
          );

        message.channel.send({ embeds: [embed], components: [row] });
      }
    } catch (error) {
      message.channel.send("An error occurred while fetching player information");
      console.error(error);
    }
  }
});

// Handle button interactions
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'recent_matches') {
    // TODO: Implement recent matches view
    await interaction.reply({ content: 'Recent matches feature coming soon!', ephemeral: true });
  } else if (interaction.customId === 'agent_stats') {
    // TODO: Implement agent stats view
    await interaction.reply({ content: 'Agent stats feature coming soon!', ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);