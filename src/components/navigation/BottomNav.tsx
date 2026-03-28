"use client";

import { CalendarDays, Home, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
	{ href: "/home", label: "ホーム", icon: Home },
	{ href: "/events", label: "イベント", icon: CalendarDays },
	{ href: "/account", label: "アカウント", icon: User },
];

export function BottomNav() {
	const pathname = usePathname();

	return (
		<nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card md:hidden">
			<ul className="flex h-16 items-center justify-around">
				{navItems.map(({ href, label, icon: Icon }) => {
					const isActive = pathname === href || pathname.startsWith(`${href}/`);
					return (
						<li key={href} className="flex-1">
							<Link
								href={href}
								className={`flex min-h-[44px] flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
									isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
								}`}
								aria-current={isActive ? "page" : undefined}
							>
								<Icon size={22} aria-hidden="true" strokeWidth={isActive ? 2.5 : 2} />
								<span>{label}</span>
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
