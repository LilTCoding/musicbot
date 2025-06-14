import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: import.meta.env.VITE_SERVER_URL,
});

// Fetch Discord session info
export async function fetchDiscordSession(): Promise<{
	discordId: string | null;
	username?: string;
	avatar?: string;
	email?: string;
}> {
	const res = await fetch(
		`${import.meta.env.VITE_SERVER_URL}/api/auth/session`,
		{
			credentials: "include",
		},
	);
	return res.json();
}
