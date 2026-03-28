import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Cloudflare Pages（Edge Runtime）向け設定
	// Node.js 専用 API（fs・crypto 等）は使用不可
	// Web Crypto API（crypto.randomUUID() 等）を使用すること
};

export default nextConfig;
