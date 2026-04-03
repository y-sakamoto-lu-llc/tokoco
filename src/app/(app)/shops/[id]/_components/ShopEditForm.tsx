"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PRICE_RANGE_VALUES } from "@/db/schema";
import { updateShopSchema } from "@/lib/validations/shop";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

type UpdateShopValues = z.infer<typeof updateShopSchema>;

type Shop = {
	id: string;
	name: string;
	area: string | null;
	address: string | null;
	phone: string | null;
	category: string | null;
	priceRange: string | null;
	externalRating: number | null;
	businessHours: string | null;
	websiteUrl: string | null;
	googleMapsUrl: string | null;
	note: string | null;
};

type ShopEditFormProps = {
	shop: Shop;
	onSuccess: (updatedShop: Partial<Shop>) => void;
	onCancel: () => void;
};

export function ShopEditForm({ shop, onSuccess, onCancel }: ShopEditFormProps) {
	const [serverError, setServerError] = useState<string | null>(null);

	const form = useForm<UpdateShopValues>({
		resolver: zodResolver(updateShopSchema),
		defaultValues: {
			name: shop.name,
			area: shop.area ?? "",
			address: shop.address ?? "",
			phone: shop.phone ?? "",
			category: shop.category ?? "",
			priceRange: (shop.priceRange as UpdateShopValues["priceRange"]) ?? undefined,
			externalRating: shop.externalRating ?? undefined,
			businessHours: shop.businessHours ?? "",
			websiteUrl: shop.websiteUrl ?? "",
			googleMapsUrl: shop.googleMapsUrl ?? "",
			note: shop.note ?? "",
		},
	});

	async function onSubmit(values: UpdateShopValues) {
		setServerError(null);

		const res = await fetch(`/api/shops/${shop.id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				...values,
				area: (values.area as string) || undefined,
				address: (values.address as string) || undefined,
				phone: (values.phone as string) || undefined,
				category: (values.category as string) || undefined,
				note: (values.note as string) || undefined,
				websiteUrl: (values.websiteUrl as string) || undefined,
				googleMapsUrl: (values.googleMapsUrl as string) || undefined,
			}),
		});

		if (!res.ok) {
			const data = (await res.json()) as { error?: string };
			setServerError(data.error ?? "更新に失敗しました");
			return;
		}

		toast.success("店舗情報を更新しました");
		onSuccess({
			name: values.name ?? shop.name,
			area: (values.area as string) || null,
			address: (values.address as string) || null,
			phone: (values.phone as string) || null,
			category: (values.category as string) || null,
			priceRange: values.priceRange ?? null,
			note: (values.note as string) || null,
		});
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				{serverError && (
					<Alert variant="destructive">
						<AlertDescription>{serverError}</AlertDescription>
					</Alert>
				)}

				{/* 店名 */}
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								店舗名 <span className="text-destructive">（必須）</span>
							</FormLabel>
							<FormControl>
								<Input placeholder="店舗名" {...field} value={field.value ?? ""} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* カテゴリ */}
				<FormField
					control={form.control}
					name="category"
					render={({ field }) => (
						<FormItem>
							<FormLabel>ジャンル</FormLabel>
							<FormControl>
								<Input placeholder="例：和食、イタリアン" {...field} value={field.value ?? ""} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* 価格帯 */}
				<FormField
					control={form.control}
					name="priceRange"
					render={({ field }) => (
						<FormItem>
							<FormLabel>価格帯</FormLabel>
							<Select
								value={field.value ?? "all"}
								onValueChange={(v) => field.onChange(v === "all" ? undefined : v)}
							>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder="価格帯を選択" />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									<SelectItem value="all">選択しない</SelectItem>
									{PRICE_RANGE_VALUES.map((price) => (
										<SelectItem key={price} value={price}>
											{price}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* エリア */}
				<FormField
					control={form.control}
					name="area"
					render={({ field }) => (
						<FormItem>
							<FormLabel>エリア</FormLabel>
							<FormControl>
								<Input placeholder="例：渋谷、新宿" {...field} value={field.value ?? ""} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* 住所 */}
				<FormField
					control={form.control}
					name="address"
					render={({ field }) => (
						<FormItem>
							<FormLabel>住所</FormLabel>
							<FormControl>
								<Input placeholder="住所を入力" {...field} value={field.value ?? ""} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* 電話番号 */}
				<FormField
					control={form.control}
					name="phone"
					render={({ field }) => (
						<FormItem>
							<FormLabel>電話番号</FormLabel>
							<FormControl>
								<Input
									type="tel"
									placeholder="例：03-1234-5678"
									{...field}
									value={field.value ?? ""}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Webサイト */}
				<FormField
					control={form.control}
					name="websiteUrl"
					render={({ field }) => (
						<FormItem>
							<FormLabel>WebサイトURL</FormLabel>
							<FormControl>
								<Input
									type="url"
									placeholder="https://..."
									{...field}
									value={(field.value as string) ?? ""}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Google マップ URL */}
				<FormField
					control={form.control}
					name="googleMapsUrl"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Google マップURL</FormLabel>
							<FormControl>
								<Input
									type="url"
									placeholder="https://maps.google.com/..."
									{...field}
									value={(field.value as string) ?? ""}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* メモ */}
				<FormField
					control={form.control}
					name="note"
					render={({ field }) => (
						<FormItem>
							<FormLabel>メモ</FormLabel>
							<FormControl>
								<Textarea
									placeholder="お店のメモを入力（500文字以下）"
									className="min-h-[100px] resize-none"
									{...field}
									value={field.value ?? ""}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="flex gap-3 pt-2">
					<Button type="button" variant="outline" onClick={onCancel} className="flex-1">
						キャンセル
					</Button>
					<Button type="submit" disabled={form.formState.isSubmitting} className="flex-1">
						{form.formState.isSubmitting ? (
							<>
								<Loader2 size={16} className="animate-spin" aria-hidden="true" />
								保存中...
							</>
						) : (
							"保存する"
						)}
					</Button>
				</div>
			</form>
		</Form>
	);
}
