import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
	it("単一クラスをそのまま返す", () => {
		expect(cn("foo")).toBe("foo");
	});

	it("複数のクラスをスペース区切りで結合する", () => {
		expect(cn("foo", "bar")).toBe("foo bar");
	});

	it("falsy な値を無視する", () => {
		expect(cn("foo", undefined, null, false, "bar")).toBe("foo bar");
	});

	it("条件付きクラスを適用する", () => {
		expect(cn("base", { active: true, disabled: false })).toBe("base active");
	});

	it("Tailwind の競合クラスを後者で上書きする", () => {
		expect(cn("p-4", "p-2")).toBe("p-2");
	});

	it("Tailwind の競合クラスを条件付きで上書きする", () => {
		expect(cn("text-red-500", { "text-blue-500": true })).toBe("text-blue-500");
	});

	it("引数なしで空文字を返す", () => {
		expect(cn()).toBe("");
	});
});
