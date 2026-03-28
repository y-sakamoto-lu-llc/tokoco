import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
	display: "swap",
});

const notoSansJP = Noto_Sans_JP({
	subsets: ["latin"],
	variable: "--font-noto-sans-jp",
	display: "swap",
	weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
	title: "Tokoco",
	description: "レストランを記録・管理し、グループでの食事イベント調整を行うWebアプリ",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="ja" className={`${inter.variable} ${notoSansJP.variable} h-full`}>
			<body className="font-sans min-h-full bg-background text-foreground antialiased">
				{children}
			</body>
		</html>
	);
}
