/**
 * Google マップ URL から Place ID またはキーワードを抽出する
 * SHOP-03 対応
 */
export async function extractPlaceIdFromUrl(
	url: string,
	_depth = 0
): Promise<{ placeId: string } | { keyword: string } | null> {
	let parsedUrl: URL;
	try {
		parsedUrl = new URL(url);
	} catch {
		return null;
	}

	// パターン1: place_id クエリパラメータ
	const placeId = parsedUrl.searchParams.get("place_id");
	if (placeId) return { placeId };

	// パターン2: /maps/place/<name>/ から name を抽出
	const placeMatch = parsedUrl.pathname.match(/\/maps\/place\/([^/]+)/);
	if (placeMatch?.[1]) {
		const keyword = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
		return { keyword };
	}

	// パターン3: Short URL の展開（Edge Runtime で fetch を使用・再帰は最大1回）
	if (_depth === 0 && (url.includes("goo.gl") || url.includes("maps.app.goo.gl"))) {
		try {
			const response = await fetch(url, { method: "HEAD", redirect: "follow" });
			return extractPlaceIdFromUrl(response.url, 1);
		} catch {
			return null;
		}
	}

	return null;
}
