import { convertBusinessHours, extractArea } from "@/lib/places/area";
import { convertTypes } from "@/lib/places/category";
import { extractPlaceIdFromUrl } from "@/lib/places/parse-maps-url";
import { convertPriceLevel } from "@/lib/places/price-level";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { placesFromUrlSchema } from "@/lib/validations/shop";
import { NextResponse } from "next/server";

const PLACES_API_BASE = "https://places.googleapis.com/v1";

/**
 * GET /api/shops/places/from-url?url=<Google マップ URL>
 * Google マップ URL から店舗詳細情報を取得する
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
	const result = placesFromUrlSchema.safeParse({ url: searchParams.get("url") });
	if (!result.success) {
		const firstError = result.error.issues[0];
		return NextResponse.json({ error: firstError?.message ?? "URLが不正です" }, { status: 400 });
	}

	const apiKey = process.env.GOOGLE_PLACES_API_KEY;
	if (!apiKey) {
		return NextResponse.json(
			{ error: "Google Places API キーが設定されていません" },
			{ status: 503 }
		);
	}

	try {
		const extracted = await extractPlaceIdFromUrl(result.data.url);
		if (!extracted) {
			return NextResponse.json({ error: "このURLからは店舗情報を取得できません" }, { status: 422 });
		}

		let placeId: string;

		if ("placeId" in extracted) {
			placeId = extracted.placeId;
		} else {
			// キーワードから Text Search でトップ1件を取得
			const searchRes = await fetch(`${PLACES_API_BASE}/places:searchText`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Goog-Api-Key": apiKey,
					"X-Goog-FieldMask": "places.id",
				},
				body: JSON.stringify({
					textQuery: extracted.keyword,
					maxResultCount: 1,
					languageCode: "ja",
				}),
			});

			if (!searchRes.ok) {
				return NextResponse.json({ error: "店舗の検索に失敗しました" }, { status: 502 });
			}

			const searchData = (await searchRes.json()) as { places?: { id: string }[] };
			const topPlace = searchData.places?.[0];
			if (!topPlace) {
				return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
			}
			placeId = topPlace.id;
		}

		// Place Details を取得
		const detailsRes = await fetch(`${PLACES_API_BASE}/places/${placeId}`, {
			headers: {
				"X-Goog-Api-Key": apiKey,
				"X-Goog-FieldMask":
					"id,displayName,formattedAddress,addressComponents,nationalPhoneNumber,types,priceLevel,rating,regularOpeningHours,websiteUri,googleMapsUri,photos",
			},
		});

		if (!detailsRes.ok) {
			return NextResponse.json({ error: "店舗詳細の取得に失敗しました" }, { status: 502 });
		}

		const data = (await detailsRes.json()) as {
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

		return NextResponse.json(
			{
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
			},
			{ status: 200 }
		);
	} catch (err) {
		console.error("[GET /api/shops/places/from-url] error:", err);
		return NextResponse.json({ error: "内部エラーが発生しました" }, { status: 500 });
	}
}
