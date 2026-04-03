"use client";

import type { PlaceDetails } from "@/app/api/shops/places/details/route";
import type { PlaceCandidate } from "@/app/api/shops/places/search/route";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import type { PriceRange } from "@/db/schema";
import { createShopSchema } from "@/lib/validations/shop";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { ManualInput } from "./ManualInput";
import { PlacesSearch } from "./PlacesSearch";
import { TagInput } from "./TagInput";

export type ShopFormValues = z.infer<typeof createShopSchema> & {
	name: string;
	area?: string;
	address?: string;
	phone?: string;
	category?: string;
	priceRange?: string;
	externalRating?: number;
	businessHours?: string;
	websiteUrl?: string | null;
	googleMapsUrl?: string | null;
	sourceUrl?: string | null;
	photoUrl?: string | null;
	note?: string;
};

type SelectedTag = { id?: string; name: string };

type InputMode = "search" | "url" | "manual";

export function ShopForm() {
	const router = useRouter();
	const [mode, setMode] = useState<InputMode>("search");
	const [serverError, setServerError] = useState<string | null>(null);
	const [selectedTags, setSelectedTags] = useState<SelectedTag[]>([]);
	const [placeFetching, setPlaceFetching] = useState(false);
	const [placeSelected, setPlaceSelected] = useState(false);
	const [urlInput, setUrlInput] = useState("");

	const form = useForm<ShopFormValues>({
		resolver: zodResolver(createShopSchema),
		defaultValues: {
			name: "",
			area: "",
			address: "",
			phone: "",
			category: "",
			note: "",
		},
	});

	// Google Places 候補選択後に詳細を取得してフォームを補完
	async function handlePlaceSelect(candidate: PlaceCandidate) {
		setPlaceFetching(true);
		setServerError(null);
		try {
			const res = await fetch(
				`/api/shops/places/details?placeId=${encodeURIComponent(candidate.placeId)}`
			);
			if (!res.ok) {
				const data = (await res.json()) as { error?: string };
				setServerError(data.error ?? "店舗詳細の取得に失敗しました");
				setMode("manual");
				return;
			}
			const details = (await res.json()) as PlaceDetails;
			fillFormWithDetails(details);
			setPlaceSelected(true);
			setMode("manual");
		} catch {
			setServerError("通信エラーが発生しました。手動で入力してください。");
			setMode("manual");
		} finally {
			setPlaceFetching(false);
		}
	}

	// URL 入力から店舗情報を取得
	async function handleUrlFetch() {
		if (!urlInput.trim()) return;
		setPlaceFetching(true);
		setServerError(null);
		try {
			const res = await fetch(`/api/shops/places/from-url?url=${encodeURIComponent(urlInput)}`);
			if (!res.ok) {
				const data = (await res.json()) as { error?: string };
				setServerError(data.error ?? "URLからの情報取得に失敗しました");
				setMode("manual");
				return;
			}
			const details = (await res.json()) as PlaceDetails;
			fillFormWithDetails(details);
			setPlaceSelected(true);
			setMode("manual");
		} catch {
			setServerError("通信エラーが発生しました。手動で入力してください。");
			setMode("manual");
		} finally {
			setPlaceFetching(false);
		}
	}

	function fillFormWithDetails(details: PlaceDetails) {
		form.reset({
			name: details.name,
			area: details.area ?? "",
			address: details.address ?? "",
			phone: details.phone ?? "",
			category: details.category ?? "",
			priceRange: details.priceRange as PriceRange | undefined,
			externalRating: details.externalRating ?? undefined,
			businessHours: details.businessHours ?? "",
			websiteUrl: details.websiteUrl ?? "",
			googleMapsUrl: details.googleMapsUrl ?? "",
			photoUrl: details.photoUrl ?? "",
			note: "",
		});
	}

	async function onSubmit(values: ShopFormValues) {
		setServerError(null);

		// タグの処理: 既存タグはIDを渡す、新規タグは先に作成
		const tagIds: string[] = [];
		for (const tag of selectedTags) {
			if (tag.id) {
				tagIds.push(tag.id);
			} else {
				// 新規タグを作成
				const tagRes = await fetch("/api/tags", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ name: tag.name }),
				});
				if (tagRes.ok || tagRes.status === 409) {
					// 409 は既存タグ（同名が作成済み）
					if (tagRes.status === 409) {
						// 既存タグのIDを取得
						const existing = (await tagRes.json()) as { id?: string; existingId?: string };
						const existingId = existing.existingId ?? existing.id;
						if (existingId) tagIds.push(existingId);
					} else {
						const created = (await tagRes.json()) as { id: string };
						tagIds.push(created.id);
					}
				}
			}
		}

		// 店舗を作成
		const shopRes = await fetch("/api/shops", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				...values,
				tagIds,
				// 空文字列を undefined に変換
				area: values.area || undefined,
				address: values.address || undefined,
				phone: values.phone || undefined,
				category: values.category || undefined,
				note: values.note || undefined,
				websiteUrl: values.websiteUrl || undefined,
				googleMapsUrl: values.googleMapsUrl || undefined,
				sourceUrl: values.sourceUrl || undefined,
				photoUrl: values.photoUrl || undefined,
			}),
		});

		if (!shopRes.ok) {
			const data = (await shopRes.json()) as { error?: string };
			setServerError(data.error ?? "店舗の登録に失敗しました");
			return;
		}

		toast.success("店舗を登録しました");
		router.push("/home");
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				{/* サーバーエラー */}
				{serverError && (
					<Alert variant="destructive">
						<AlertDescription>{serverError}</AlertDescription>
					</Alert>
				)}

				{/* 入力モード切り替え */}
				{!placeSelected && (
					<div className="space-y-4">
						<div className="flex gap-2 text-sm border-b pb-3">
							<button
								type="button"
								className={`pb-1 border-b-2 transition-colors ${
									mode === "search"
										? "border-primary text-primary font-medium"
										: "border-transparent text-muted-foreground hover:text-foreground"
								}`}
								onClick={() => setMode("search")}
							>
								店名で検索
							</button>
							<button
								type="button"
								className={`pb-1 border-b-2 transition-colors ${
									mode === "url"
										? "border-primary text-primary font-medium"
										: "border-transparent text-muted-foreground hover:text-foreground"
								}`}
								onClick={() => setMode("url")}
							>
								URLで取得
							</button>
							<button
								type="button"
								className={`pb-1 border-b-2 transition-colors ${
									mode === "manual"
										? "border-primary text-primary font-medium"
										: "border-transparent text-muted-foreground hover:text-foreground"
								}`}
								onClick={() => setMode("manual")}
							>
								手動入力
							</button>
						</div>

						{/* 店名検索モード */}
						{mode === "search" && (
							<div>
								{placeFetching ? (
									<div className="flex items-center justify-center py-6 text-muted-foreground">
										<Loader2 size={16} className="animate-spin mr-2" aria-hidden="true" />
										店舗情報を取得中...
									</div>
								) : (
									<PlacesSearch
										onSelect={handlePlaceSelect}
										onManualMode={() => setMode("manual")}
									/>
								)}
							</div>
						)}

						{/* URL 入力モード */}
						{mode === "url" && (
							<div className="space-y-3">
								<div className="flex gap-2">
									<input
										type="url"
										placeholder="Google マップの URL を貼り付け"
										value={urlInput}
										onChange={(e) => setUrlInput(e.target.value)}
										className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
										aria-label="Google マップの URL を入力"
									/>
									<Button
										type="button"
										onClick={handleUrlFetch}
										disabled={placeFetching || !urlInput.trim()}
									>
										{placeFetching ? (
											<Loader2 size={16} className="animate-spin" aria-hidden="true" />
										) : (
											"取得"
										)}
									</Button>
								</div>
								<button
									type="button"
									className="text-sm text-muted-foreground underline-offset-4 hover:underline"
									onClick={() => setMode("manual")}
								>
									手動で入力する
								</button>
							</div>
						)}
					</div>
				)}

				{/* Places から情報取得済みの表示 */}
				{placeSelected && (
					<div className="flex items-center gap-2 p-3 bg-muted rounded-md text-sm">
						<Check size={16} className="text-primary" aria-hidden="true" />
						<span>Google Places から店舗情報を取得しました。確認・編集できます。</span>
						<button
							type="button"
							className="ml-auto text-muted-foreground hover:text-foreground"
							onClick={() => {
								setPlaceSelected(false);
								setMode("search");
								form.reset();
							}}
							aria-label="選択をリセット"
						>
							<ArrowLeft size={14} aria-hidden="true" />
							やり直す
						</button>
					</div>
				)}

				{/* 手動入力フォーム（manual モードまたは Places 取得後） */}
				{(mode === "manual" || placeSelected) && (
					<>
						<Separator />
						<ManualInput form={form} />
					</>
				)}

				{/* タグ入力 */}
				{(mode === "manual" || placeSelected) && (
					<>
						<Separator />
						<div className="space-y-2">
							<h3 className="text-sm font-medium">タグ</h3>
							<TagInput selectedTags={selectedTags} onChange={setSelectedTags} />
						</div>
					</>
				)}

				{/* 保存ボタン */}
				{(mode === "manual" || placeSelected) && (
					<div className="flex gap-3">
						<Button
							type="button"
							variant="outline"
							onClick={() => router.back()}
							className="flex-1"
						>
							キャンセル
						</Button>
						<Button type="submit" disabled={form.formState.isSubmitting} className="flex-1">
							{form.formState.isSubmitting ? (
								<>
									<Loader2 size={16} className="animate-spin" aria-hidden="true" />
									登録中...
								</>
							) : (
								"保存する"
							)}
						</Button>
					</div>
				)}
			</form>
		</Form>
	);
}
