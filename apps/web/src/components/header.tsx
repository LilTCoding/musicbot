import { fetchDiscordSession } from "@/lib/auth-client";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

// Allowed Discord admin IDs
const adminDiscordUserIds = [
	"1302678535831289891",
	"304789212224552972",
	"1368087024401252393",
	"567186324591738882",
];

export default function Header() {
	const [discordId, setDiscordId] = useState<string | null>(null);

	useEffect(() => {
		fetchDiscordSession().then((session) => {
			setDiscordId(session.discordId);
		});
	}, []);

	const links = [
		{ to: "/", label: "Home" },
		{ to: "/dashboard", label: "Dashboard" },
		{ to: "/todos", label: "Todos" },
	];

	// Show Admin Panel link if Discord ID is allowed
	if (discordId && adminDiscordUserIds.includes(discordId)) {
		links.push({ to: "/admin", label: "Admin Panel" });
	}

	return (
		<div>
			<div className="flex flex-row items-center justify-between px-2 py-1">
				<nav className="flex gap-4 text-lg">
					{links.map(({ to, label }) => {
						return (
							<Link key={to} to={to}>
								{label}
							</Link>
						);
					})}
				</nav>
				<div className="flex items-center gap-2">
					<ModeToggle />
					<UserMenu />
				</div>
			</div>
			<hr />
		</div>
	);
}
