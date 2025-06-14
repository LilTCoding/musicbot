import "dotenv/config";
import { trpcServer } from "@hono/trpc-server";
import { Client } from "discord.js";
import express from "express";
import session from "express-session";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import passport from "passport";
import { Strategy as DiscordStrategy } from "passport-discord";
import {
	GUILD_ID,
	assignVerifiedRole,
	client,
	createCategoriesAndChannels,
	playYouTubeInVoiceChannel,
	registerSlashCommands,
	startDiscordBot,
} from "./discordBot";
import { auth } from "./lib/auth";
import { createContext } from "./lib/context";
import { appRouter } from "./routers/index";

const app = new Hono();

app.use(logger());
app.use(
	"/*",
	cors({
		origin: process.env.CORS_ORIGIN || "",
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

// Discord OAuth config (use environment variables for secrets)
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;
const DISCORD_CALLBACK_URL = `${process.env.SERVER_URL}/api/auth/discord/callback`;

passport.serializeUser((user: any, done: (err: any, user?: any) => void) => {
	done(null, user);
});
passport.deserializeUser((obj: any, done: (err: any, user?: any) => void) => {
	done(null, obj);
});

passport.use(
	new DiscordStrategy(
		{
			clientID: DISCORD_CLIENT_ID,
			clientSecret: DISCORD_CLIENT_SECRET,
			callbackURL: DISCORD_CALLBACK_URL,
			scope: ["identify", "email", "guilds"],
		},
		(
			accessToken: string,
			refreshToken: string,
			profile: any,
			done: (err: any, user?: any) => void,
		) => {
			// Store Discord profile (including id) in session
			return done(null, profile);
		},
	),
);

const expressApp = express();
expressApp.use(
	session({
		secret: process.env.SESSION_SECRET || "supersecret",
		resave: false,
		saveUninitialized: false,
	}),
);
expressApp.use(passport.initialize());
expressApp.use(passport.session());

// Discord OAuth endpoints
expressApp.get("/api/auth/discord", passport.authenticate("discord"));

expressApp.get(
	"/api/auth/discord/callback",
	passport.authenticate("discord", {
		failureRedirect: "/login",
		session: true,
	}),
	(req, res) => {
		// On success, redirect to the web dashboard
		res.redirect(process.env.WEB_DASHBOARD_URL || "/dashboard");
	},
);

// Expose session info for the frontend
expressApp.get("/api/auth/session", (req, res) => {
	const user = req.user as any;
	if (req.isAuthenticated() && user) {
		res.json({
			discordId: (user as any).id,
			username: (user as any).username,
			avatar: (user as any).avatar,
			email: (user as any).email,
		});
	} else {
		res.json({ discordId: null });
	}
});

// Mount Express app on Hono
app.use("/api/auth/*", async (c, next) => {
	// @ts-ignore
	return await expressApp(c.req.raw, c.res.raw);
});

app.use(
	"/trpc/*",
	trpcServer({
		router: appRouter,
		createContext: (_opts, context) => {
			return createContext({ context });
		},
	}),
);

app.get("/", (c) => {
	return c.text("OK");
});

// Start Discord bot
startDiscordBot();

// Helper: check if Discord ID is admin
const adminDiscordUserIds = [
	"1302678535831289891",
	"304789212224552972",
	"1368087024401252393",
	"567186324591738882",
];

// API endpoint to create categories/channels
app.post("/api/discord/create-structure", async (c) => {
	try {
		// Get Discord session from express session (mounted at /api/auth/session)
		// We'll use the session cookie, so this endpoint should be called with credentials
		const req = c.req.raw;
		// @ts-ignore
		const session = req.session as any;
		const discordId = session?.passport?.user?.id;
		if (!discordId || !adminDiscordUserIds.includes(discordId)) {
			return c.json({ error: "Unauthorized" }, 401);
		}
		const body = await c.req.json();
		await createCategoriesAndChannels(body);
		return c.json({ success: true });
	} catch (err) {
		return c.json({ error: (err as Error).message }, 500);
	}
});

app.post("/api/discord/play", async (c) => {
	try {
		const req = c.req.raw;
		// @ts-ignore
		const session = req.session as any;
		const discordId = session?.passport?.user?.id;
		if (!discordId) {
			return c.json({ error: "Unauthorized" }, 401);
		}
		const body = await c.req.json();
		const youtubeUrl = body.youtubeUrl;
		if (!youtubeUrl) {
			return c.json({ error: "Missing YouTube URL" }, 400);
		}
		await playYouTubeInVoiceChannel(discordId, youtubeUrl);
		return c.json({ success: true });
	} catch (err) {
		return c.json({ error: (err as Error).message }, 500);
	}
});

app.get("/api/discord/roles", async (c) => {
	try {
		const req = c.req.raw;
		// @ts-ignore
		const session = req.session as any;
		const discordId = session?.passport?.user?.id;
		if (!discordId) {
			return c.json({ roles: [] });
		}
		const guild = await client.guilds.fetch(GUILD_ID);
		const member = await guild.members.fetch(discordId);
		const roles = member.roles.cache.map((r: any) => r.name);
		return c.json({ roles });
	} catch (err) {
		return c.json({ roles: [] });
	}
});

export default app;
