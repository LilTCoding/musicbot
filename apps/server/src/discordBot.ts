import {
	AudioPlayerStatus,
	VoiceConnectionStatus,
	createAudioPlayer,
	createAudioResource,
	entersState,
	joinVoiceChannel,
} from "@discordjs/voice";
import {
	ChannelType,
	Client,
	CommandInteraction,
	GatewayIntentBits,
	Guild,
	type GuildMember,
	TextChannel,
} from "discord.js";
import ytdl from "ytdl-core";

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
const GUILD_ID = process.env.DISCORD_GUILD_ID!; // Set this to your server's ID

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once("ready", () => {
	console.log(`Discord bot logged in as ${client.user?.tag}`);
});

export async function createCategoriesAndChannels(structure: {
	categories: Array<{
		name: string;
		channels: Array<{ name: string; type: "text" | "voice" }>;
	}>;
}) {
	const guild = await client.guilds.fetch(GUILD_ID);
	for (const category of structure.categories) {
		// Create category
		const cat = await guild.channels.create({
			name: category.name,
			type: ChannelType.GuildCategory,
		});
		// Create channels under category
		for (const channel of category.channels) {
			await guild.channels.create({
				name: channel.name,
				type:
					channel.type === "text"
						? ChannelType.GuildText
						: ChannelType.GuildVoice,
				parent: cat.id,
			});
		}
	}
}

// Helper: play YouTube audio in a user's current voice channel
export async function playYouTubeInVoiceChannel(
	discordId: string,
	youtubeUrl: string,
) {
	const guild = await client.guilds.fetch(GUILD_ID);
	const member = await guild.members.fetch(discordId);
	const role = guild.roles.cache.find(
		(r) => r.name === "chrome green verified",
	);
	if (!member || !role || !member.roles.cache.has(role.id)) {
		throw new Error(
			"User does not have the verified role or is not in the server",
		);
	}
	const voiceChannel = member.voice.channel;
	if (!voiceChannel) {
		throw new Error("User is not in a voice channel");
	}
	// Join the voice channel
	const connection = joinVoiceChannel({
		channelId: voiceChannel.id,
		guildId: guild.id,
		adapterCreator: guild.voiceAdapterCreator as any,
		selfDeaf: false,
	});
	// Wait for connection
	await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
	// Stream audio
	const stream = ytdl(youtubeUrl, {
		filter: "audioonly",
		highWaterMark: 1 << 25,
	});
	const resource = createAudioResource(stream);
	const player = createAudioPlayer();
	connection.subscribe(player);
	player.play(resource);
	// Leave when finished
	player.on(AudioPlayerStatus.Idle, () => {
		connection.destroy();
	});
}

// Register /play command
client.on("interactionCreate", async (interaction) => {
	if (!interaction.isChatInputCommand()) return;
	if (interaction.commandName === "play") {
		const youtubeUrl = interaction.options.getString("url");
		const member = interaction.member as GuildMember;
		const role = member.roles.cache.find(
			(r) => r.name === "chrome green verified",
		);
		if (!role) {
			await interaction.reply({
				content: "You need the chrome green verified role to use this command.",
				ephemeral: true,
			});
			return;
		}
		if (!member.voice.channel) {
			await interaction.reply({
				content: "You must be in a voice channel to use this command.",
				ephemeral: true,
			});
			return;
		}
		try {
			await playYouTubeInVoiceChannel(member.id, youtubeUrl!);
			await interaction.reply({
				content: `Playing your song in ${member.voice.channel.name}!`,
			});
		} catch (e: any) {
			await interaction.reply({
				content: `Error: ${e.message}`,
				ephemeral: true,
			});
		}
	}
});

// Register the /play command on startup
export async function registerSlashCommands() {
	const guild = await client.guilds.fetch(GUILD_ID);
	await guild.commands.create({
		name: "play",
		description: "Play a YouTube song in your current voice channel",
		options: [
			{
				name: "url",
				type: 3, // STRING
				description: "YouTube link",
				required: true,
			},
		],
	});
}

// Update startDiscordBot to register commands
export async function startDiscordBot() {
	if (!client.isReady()) {
		await client.login(DISCORD_BOT_TOKEN);
		await registerSlashCommands();
	}
}

export async function assignVerifiedRole(discordId: string) {
	const guild = await client.guilds.fetch(GUILD_ID);
	// Check if the role exists
	let role = guild.roles.cache.find((r) => r.name === "chrome green verified");
	if (!role) {
		// Create the role with a green color
		role = await guild.roles.create({
			name: "chrome green verified",
			color: 0x00ff00, // green
			reason: "Verified users from the site",
		});
	}
	// Find the member and assign the role
	const member = await guild.members.fetch(discordId);
	if (member && role) {
		await member.roles.add(role);
	}
}

export { client, GUILD_ID };
