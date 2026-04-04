import { convertBusinessHours, extractArea } from "@/lib/places/area";
import { convertTypes } from "@/lib/places/category";
import { convertPriceLevel } from "@/lib/places/price-level";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { placesDetailsQuerySchema } from "@/lib/validations/shop";
import { NextResponse } from "next/server";

const PLACES_API_BASE = "https://places.googleapis.com/v1";

export type PlaceDetails = {
	placeId: string;
	name: string;
	address: string | null;
	area: string | null;
	phone: string | null;
	category: string | null;
	priceRange: string;
	externalRating: number | null;
	businessHours: string | null;
	websiteUrl: string | null;
	googleMapsUrl: string | null;
	photoUrl: string | null;
};

/**
 * GET /api/shops/places/details?placeId=<ID>
 * Google Place Details から店舗詳細情報を取得する
 * 認証: JWT 必須
 */
export async function GET(request: Request) {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
	}

	const { searchParams } = new URL(request.url);
	const result = placesDetailsQuerySchema.safeParse({ placeId: searchParams.get("placeId") });
	if (!result.success) {
		const firstError = result.error.issues[0];
		return NextResponse.json(
			{ error: firstError?.message ?? "placeId が不正です" },
			{ status: 400 }
		);
	}

	const apiKey = process.env.GOOGLE_PLACES_API_KEY;
	if (!apiKey) {
		return NextResponse.json(
			{ error: "Google Places API キーが設定されていません" },
			{ status: 503 }
		);
	}

	try {
		const res = await fetch(`${PLACES_API_BASE}/places/${result.data.placeId}`, {
			headers: {
				"X-Goog-Api-Key": apiKey,
				"X-Goog-FieldMask":
					"id,displayName,formattedAddress,addressComponents,nationalPhoneNumber,types,priceLevel,rating,regularOpeningHours,websiteUri,googleMapsUri,photos",
			},
		});

		if (!res.ok) {
			if (res.status === 404) {
				return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
			}
			console.error("[GET /api/shops/places/details] Google API error:", res.status);
			return NextResponse.json({ error: "詳細情報の取得に失敗しました" }, { status: 502 });
		}

		const data = (await res.json()) as {
			id: string;
			displayName?: { text: string };
			formattedAddress?: string;
			addressComponents?: { longText: string; types: string[] }[];
			nationalPhoneNumber?: string;
			types?: string[];
			priceLevel?: string;
			rating?: number;
			regularOpeningHours?: { weekdayDescriptions?: string[] };
			websiteUri?: string;
			googleMapsUri?: string;
			photos?: { name: string }[];
		};

		const photoName = data.photos?.[0]?.name;
		const photoUrl = photoName
			? `${PLACES_API_BASE}/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${apiKey}`
			: null;

		const details: PlaceDetails = {
			placeId: data.id,
			name: data.displayName?.text ?? "",
			address: data.formattedAddress ?? null,
			area: data.addressComponents ? extractArea(data.addressComponents) : null,
			phone: data.nationalPhoneNumber ?? null,
			category: convertTypes(data.types),
			priceRange: convertPriceLevel(data.priceLevel),
			externalRating: data.rating ?? null,
			businessHours: convertBusinessHours(data.regularOpeningHours?.weekdayDescriptions),
			websiteUrl: data.websiteUri ?? null,
			googleMapsUrl: data.googleMapsUri ?? null,
			photoUrl,
		};

		return NextResponse.json(details, { status: 200 });
	} catch (err) {
		console.error("[GET /api/shops/places/details] error:", err);
		return NextResponse.json({ error: "内部エラーが発生しました" }, { status: 500 });
	}
}
