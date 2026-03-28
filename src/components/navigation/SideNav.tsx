"use client";

import { CalendarDays, Home, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
	{ href: "/home", label: "ホーム", icon: Home },
	{ href: "/events", label: "イベント", icon: CalendarDays },
	{ href: "/account", label: "アカウント", icon: User },
];

export function SideNav() {
	const pathname = usePathname();

	return (
		<nav className="fixed left-0 top-0 hidden h-full w-56 flex-col border-r border-border bg-card md:flex">
			<div className="flex h-16 items-center border-b border-border px-6">
				<Link href="/home" className="text-xl font-bold text-primary" aria-label="Tokoco ホームへ">
					Tokoco
				</Link>
			</div>
			<ul className="flex flex-col gap-1 p-3">
				{navItems.map(({ href, label, icon: Icon }) => {
					const isActive = pathname === href || pathname.startsWith(`${href}/`);
					return (
						<li key={href}>
							<Link
								href={href}
								className={`flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
									isActive
										? "bg-accent text-accent-foreground"
										: "text-muted-foreground hover:bg-muted hover:text-foreground"
								}`}
								aria-current={isActive ? "page" : undefined}
							>
								<Icon size={20} aria-hidden="true" strokeWidth={isActive ? 2.5 : 2} />
								<span>{label}</span>
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
