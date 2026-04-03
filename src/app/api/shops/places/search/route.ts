import { convertPriceLevel } from "@/lib/places/price-level";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { placesSearchQuerySchema } from "@/lib/validations/shop";
import { NextResponse } from "next/server";

const PLACES_API_BASE = "https://places.googleapis.com/v1";

export type PlaceCandidate = {
	placeId: string;
	name: string;
	address: string | null;
	priceRange: string | null;
	rating: number | null;
	photoUrl: string | null;
};

/**
 * GET /api/shops/places/search?q=<キーワード>
 * Google Text Search で店舗候補を検索する（最大10件）
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
	const result = placesSearchQuerySchema.safeParse({ query: searchParams.get("q") });
	if (!result.success) {
		const firstError = result.error.issues[0];
		return NextResponse.json(
			{ error: firstError?.message ?? "検索キーワードが不正です" },
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
		const res = await fetch(`${PLACES_API_BASE}/places:searchText`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Goog-Api-Key": apiKey,
				"X-Goog-FieldMask":
					"places.id,places.displayName,places.formattedAddress,places.types,places.priceLevel,places.rating,places.photos",
			},
			body: JSON.stringify({
				textQuery: result.data.query,
				maxResultCount: 10,
				languageCode: "ja",
			}),
		});

		if (!res.ok) {
			console.error("[GET /api/shops/places/search] Google API error:", res.status);
			return NextResponse.json({ error: "検索に失敗しました" }, { status: 502 });
		}

		const data = (await res.json()) as {
			places?: {
				id: string;
				displayName?: { text: string };
				formattedAddress?: string;
				priceLevel?: string;
				rating?: number;
				photos?: { name: string }[];
			}[];
		};

		const candidates: PlaceCandidate[] = (data.places ?? []).map((place) => {
			const photoName = place.photos?.[0]?.name;
			const photoUrl = photoName
				? `${PLACES_API_BASE}/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${apiKey}`
				: null;

			return {
				placeId: place.id,
				name: place.displayName?.text ?? "",
				address: place.formattedAddress ?? null,
				priceRange: convertPriceLevel(place.priceLevel),
				rating: place.rating ?? null,
				photoUrl,
			};
		});

		return NextResponse.json(candidates, { status: 200 });
	} catch (err) {
		console.error("[GET /api/shops/places/search] error:", err);
		return NextResponse.json({ error: "内部エラーが発生しました" }, { status: 500 });
	}
}
