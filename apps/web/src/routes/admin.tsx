import { fetchDiscordSession } from "@/lib/auth-client";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const adminDiscordUserIds = [
	"1302678535831289891",
	"304789212224552972",
	"1368087024401252393",
	"567186324591738882",
];

export const Route = createFileRoute("/admin")({
	component: AdminPanel,
});

function AdminPanel() {
	const [discordId, setDiscordId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchDiscordSession().then((session) => {
			setDiscordId(session.discordId);
			setLoading(false);
		});
	}, []);

	if (loading) return <div>Loading...</div>;
	if (!discordId || !adminDiscordUserIds.includes(discordId)) {
		return (
			<div>Access Denied: You do not have permission to view this page.</div>
		);
	}

	return (
		<div>
			<h1>Admin Panel</h1>
			<p>Welcome, Discord Admin!</p>
			{/* Add admin features here */}
		</div>
	);
}
