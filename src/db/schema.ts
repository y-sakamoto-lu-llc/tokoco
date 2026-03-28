/**
 * Drizzle ORM schema definitions
 * Synchronized with docs/basic-design/04_database.md
 */
import { index, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

// ---------------------------------------------------------------
// profiles
// ---------------------------------------------------------------
export const profiles = pgTable("profiles", {
	id: uuid("id").primaryKey(),
	displayName: text("display_name").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------
// shops
// ---------------------------------------------------------------
export const shops = pgTable(
	"shops",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.notNull()
			.references(() => profiles.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		area: text("area"),
		address: text("address"),
		phone: text("phone"),
		category: text("category"),
		priceRange: text("price_range"),
		externalRating: numeric("external_rating", { precision: 3, scale: 1 }),
		businessHours: text("business_hours"),
		websiteUrl: text("website_url"),
		googleMapsUrl: text("google_maps_url"),
		sourceUrl: text("source_url"),
		photoUrl: text("photo_url"),
		note: text("note"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		index("idx_shops_user_id").on(t.userId),
		index("idx_shops_user_category").on(t.userId, t.category),
		index("idx_shops_user_price").on(t.userId, t.priceRange),
		index("idx_shops_user_area").on(t.userId, t.area),
	]
);

// ---------------------------------------------------------------
// tags
// ---------------------------------------------------------------
export const tags = pgTable(
	"tags",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.notNull()
			.references(() => profiles.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		unique("tags_user_id_name_unique").on(t.userId, t.name),
		index("idx_tags_user_id").on(t.userId),
	]
);

// ---------------------------------------------------------------
// shop_tags
// ---------------------------------------------------------------
export const shopTags = pgTable(
	"shop_tags",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		shopId: uuid("shop_id")
			.notNull()
			.references(() => shops.id, { onDelete: "cascade" }),
		tagId: uuid("tag_id")
			.notNull()
			.references(() => tags.id, { onDelete: "cascade" }),
	},
	(t) => [
		unique("shop_tags_shop_id_tag_id_unique").on(t.shopId, t.tagId),
		index("idx_shop_tags_shop_id").on(t.shopId),
		index("idx_shop_tags_tag_id").on(t.tagId),
	]
);

// ---------------------------------------------------------------
// events
// ---------------------------------------------------------------
export const events = pgTable(
	"events",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		ownerUserId: uuid("owner_user_id")
			.notNull()
			.references(() => profiles.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		description: text("description"),
		shareToken: text("share_token").notNull().unique(),
		closedAt: timestamp("closed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		index("idx_events_owner_user_id").on(t.ownerUserId),
		index("idx_events_share_token").on(t.shareToken),
	]
);

// ---------------------------------------------------------------
// event_shops
// ---------------------------------------------------------------
export const eventShops = pgTable(
	"event_shops",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		eventId: uuid("event_id")
			.notNull()
			.references(() => events.id, { onDelete: "cascade" }),
		shopId: uuid("shop_id")
			.notNull()
			.references(() => shops.id, { onDelete: "cascade" }),
	},
	(t) => [
		unique("event_shops_event_id_shop_id_unique").on(t.eventId, t.shopId),
		index("idx_event_shops_event_id").on(t.eventId),
	]
);

// ---------------------------------------------------------------
// votes
// ---------------------------------------------------------------
export const votes = pgTable(
	"votes",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		eventId: uuid("event_id")
			.notNull()
			.references(() => events.id, { onDelete: "cascade" }),
		voterName: text("voter_name").notNull(),
		userId: uuid("user_id").references(() => profiles.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [index("idx_votes_event_id").on(t.eventId)]
);

// ---------------------------------------------------------------
// vote_choices
// ---------------------------------------------------------------
export const voteChoices = pgTable(
	"vote_choices",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		voteId: uuid("vote_id")
			.notNull()
			.references(() => votes.id, { onDelete: "cascade" }),
		eventShopId: uuid("event_shop_id")
			.notNull()
			.references(() => eventShops.id, { onDelete: "cascade" }),
	},
	(t) => [
		unique("vote_choices_vote_id_event_shop_id_unique").on(t.voteId, t.eventShopId),
		index("idx_vote_choices_vote_id").on(t.voteId),
		index("idx_vote_choices_event_shop_id").on(t.eventShopId),
	]
);
