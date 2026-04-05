import { getShopById } from "@/lib/db/queries/shops";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ShopDetailPage } from "./_components/ShopDetailPage";

type PageProps = {
	params: Promise<{ id: string }>;
};

export default async function ShopPage({ params }: PageProps) {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	const { id } = await params;
	const shop = await getShopById(user.id, id);

	if (!shop) {
		notFound();
	}

	return (
		<div className="max-w-xl mx-auto">
			{/* ページヘッダー */}
			<div className="flex items-center gap-3 mb-6">
				<Link
					href="/home"
					className="p-2 rounded-md hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					aria-label="マイリストへ戻る"
				>
					<ArrowLeft size={20} aria-hidden="true" />
				</Link>
				<h1 className="text-xl font-bold truncate">{shop.name}</h1>
			</div>

			<ShopDetailPage shop={shop} />
		</div>
	);
}
