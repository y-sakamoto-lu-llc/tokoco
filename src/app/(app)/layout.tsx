import { BottomNav } from "@/components/navigation/BottomNav";
import { SideNav } from "@/components/navigation/SideNav";

export default function AppLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-full">
			{/* デスクトップ: サイドバーナビゲーション */}
			<SideNav />

			{/* メインコンテンツ */}
			<main className="pb-16 md:ml-56 md:pb-0">
				<div className="px-4 py-6 md:px-8 md:py-10">{children}</div>
			</main>

			{/* モバイル: ボトムナビゲーション */}
			<BottomNav />
		</div>
	);
}
