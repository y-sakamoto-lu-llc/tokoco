"use client";

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
import type { UseFormReturn } from "react-hook-form";
import type { ShopFormValues } from "./ShopForm";

type ManualInputProps = {
	form: UseFormReturn<ShopFormValues>;
};

export function ManualInput({ form }: ManualInputProps) {
	return (
		<div className="space-y-4">
			{/* 店名（必須） */}
			<FormField
				control={form.control}
				name="name"
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							店舗名 <span className="text-destructive">（必須）</span>
						</FormLabel>
						<FormControl>
							<Input placeholder="店舗名を入力" {...field} />
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

			{/* Webサイト URL */}
			<FormField
				control={form.control}
				name="websiteUrl"
				render={({ field }) => (
					<FormItem>
						<FormLabel>WebサイトURL</FormLabel>
						<FormControl>
							<Input type="url" placeholder="https://..." {...field} value={field.value ?? ""} />
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
								value={field.value ?? ""}
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
		</div>
	);
}
