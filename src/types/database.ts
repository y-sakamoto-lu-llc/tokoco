/**
 * Supabase Database 型定義
 * Drizzle スキーマ（src/db/schema.ts）と同期させること
 */

export type Database = {
	public: {
		Tables: {
			profiles: {
				Row: {
					id: string;
					display_name: string;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					display_name: string;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					display_name?: string;
					created_at?: string;
					updated_at?: string;
				};
			};
			shops: {
				Row: {
					id: string;
					user_id: string;
					name: string;
					area: string | null;
					address: string | null;
					phone: string | null;
					category: string | null;
					price_range: string | null;
					external_rating: string | null;
					business_hours: string | null;
					website_url: string | null;
					google_maps_url: string | null;
					source_url: string | null;
					photo_url: string | null;
					note: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					name: string;
					area?: string | null;
					address?: string | null;
					phone?: string | null;
					category?: string | null;
					price_range?: string | null;
					external_rating?: string | null;
					business_hours?: string | null;
					website_url?: string | null;
					google_maps_url?: string | null;
					source_url?: string | null;
					photo_url?: string | null;
					note?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					name?: string;
					area?: string | null;
					address?: string | null;
					phone?: string | null;
					category?: string | null;
					price_range?: string | null;
					external_rating?: string | null;
					business_hours?: string | null;
					website_url?: string | null;
					google_maps_url?: string | null;
					source_url?: string | null;
					photo_url?: string | null;
					note?: string | null;
					created_at?: string;
					updated_at?: string;
				};
			};
			tags: {
				Row: {
					id: string;
					user_id: string;
					name: string;
					created_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					name: string;
					created_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					name?: string;
					created_at?: string;
				};
			};
			shop_tags: {
				Row: {
					id: string;
					shop_id: string;
					tag_id: string;
				};
				Insert: {
					id?: string;
					shop_id: string;
					tag_id: string;
				};
				Update: {
					id?: string;
					shop_id?: string;
					tag_id?: string;
				};
			};
			events: {
				Row: {
					id: string;
					owner_user_id: string;
					title: string;
					description: string | null;
					share_token: string;
					closed_at: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					owner_user_id: string;
					title: string;
					description?: string | null;
					share_token: string;
					closed_at?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					owner_user_id?: string;
					title?: string;
					description?: string | null;
					share_token?: string;
					closed_at?: string | null;
					created_at?: string;
					updated_at?: string;
				};
			};
			event_shops: {
				Row: {
					id: string;
					event_id: string;
					shop_id: string;
				};
				Insert: {
					id?: string;
					event_id: string;
					shop_id: string;
				};
				Update: {
					id?: string;
					event_id?: string;
					shop_id?: string;
				};
			};
			votes: {
				Row: {
					id: string;
					event_id: string;
					voter_name: string;
					user_id: string | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					event_id: string;
					voter_name: string;
					user_id?: string | null;
					created_at?: string;
				};
				Update: {
					id?: string;
					event_id?: string;
					voter_name?: string;
					user_id?: string | null;
					created_at?: string;
				};
			};
			vote_choices: {
				Row: {
					id: string;
					vote_id: string;
					event_shop_id: string;
				};
				Insert: {
					id?: string;
					vote_id: string;
					event_shop_id: string;
				};
				Update: {
					id?: string;
					vote_id?: string;
					event_shop_id?: string;
				};
			};
		};
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: Record<string, never>;
		CompositeTypes: Record<string, never>;
	};
};
