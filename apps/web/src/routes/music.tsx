import { fetchDiscordSession } from "@/lib/auth-client";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/music")({
	component: MusicPlayer,
});

function MusicPlayer() {
	const [discordId, setDiscordId] = useState<string | null>(null);
	const [hasVerifiedRole, setHasVerifiedRole] = useState(false);
	const [loading, setLoading] = useState(true);
	const [youtubeUrl, setYoutubeUrl] = useState("");
	const [status, setStatus] = useState<string | null>(null);

	useEffect(() => {
		fetchDiscordSession().then(async (session) => {
			setDiscordId(session.discordId);
			if (session.discordId) {
				// Fetch roles from backend
				const res = await fetch(
					`${import.meta.env.VITE_SERVER_URL}/api/discord/roles`,
					{
						credentials: "include",
					},
				);
				const data = await res.json();
				setHasVerifiedRole(
					Array.isArray(data.roles) &&
						data.roles.includes("chrome green verified"),
				);
			} else {
				setHasVerifiedRole(false);
			}
			setLoading(false);
		});
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setStatus(null);
		try {
			const res = await fetch(
				`${import.meta.env.VITE_SERVER_URL}/api/discord/play`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({ youtubeUrl }),
				},
			);
			const data = await res.json();
			if (data.success) {
				setStatus("Playing your song! Make sure you're in a voice channel.");
			} else {
				setStatus(data.error || "Error playing song.");
			}
		} catch (err: any) {
			setStatus(err.message || "Error playing song.");
		}
	};

	if (loading) return <div>Loading...</div>;
	if (!discordId || !hasVerifiedRole) {
		return (
			<div>
				Access Denied: You do not have permission to use the Music Player.
			</div>
		);
	}

	return (
		<div>
			<h1>Music Player</h1>
			<form onSubmit={handleSubmit} className="space-y-4">
				<input
					type="text"
					placeholder="YouTube link"
					value={youtubeUrl}
					onChange={(e) => setYoutubeUrl(e.target.value)}
					className="w-96 rounded border px-2 py-1"
					required
				/>
				<button
					type="submit"
					className="rounded bg-green-600 px-4 py-2 text-white"
				>
					Play
				</button>
			</form>
			{status && <div className="mt-4">{status}</div>}
		</div>
	);
}
