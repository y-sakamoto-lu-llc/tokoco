import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShopForm } from "./_components/ShopForm";

export default async function NewShopPage() {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
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
				<h1 className="text-xl font-bold">店舗を追加</h1>
			</div>

			<ShopForm />
		</div>
	);
}
