import { pgTable, uniqueIndex, index, foreignKey, serial, varchar, integer, bigint, unique, text, smallint, primaryKey, pgMaterializedView, pgSequence, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const format = pgEnum("format", ['VIDEO', 'IMAGE', 'GIF', 'AUDIO', 'TEXT', 'PROCESSING'])
export const taskStatus = pgEnum("task_status", ['DONE', 'QUEUED', 'PROCESSING', 'FAILED'])

export const pgmigrationsIdSeq = pgSequence("pgmigrations_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })

export const post = pgTable("post", {
	id: serial().primaryKey().notNull(),
	title: varchar().notNull(),
	language: varchar({ length: 32 }).notNull(),
	creatorId: integer("creator_id").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	updatedAt: bigint("updated_at", { mode: "number" }).default(sql`get_current_timestamp_ms()`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).default(sql`get_current_timestamp_ms()`).notNull(),
}, (table) => [
	uniqueIndex("post_title_lower_unique").using("btree", sql`lower((title)::text)`),
	index("post_title_trgm_idx").using("gin", table.title.asc().nullsLast().op("gin_trgm_ops")),
	foreignKey({
			columns: [table.creatorId],
			foreignColumns: [user.id],
			name: "post_creator_id_fkey"
		}).onDelete("set null"),
]);

export const item = pgTable("item", {
	id: serial().primaryKey().notNull(),
	type: format().notNull(),
	originalPath: varchar("original_path"),
	compressedPath: varchar("compressed_path"),
	thumbnailPath: varchar("thumbnail_path"),
	relativeHeight: varchar("relative_height"),
	creatorId: integer("creator_id").notNull(),
	postId: integer("post_id").notNull(),
	caption: text().default('').notNull(),
	description: text().default('').notNull(),
	position: integer().notNull(),
	taskNotes: text("task_notes"),
	taskStatus: taskStatus("task_status").default('DONE').notNull(),
	taskProgress: smallint("task_progress"),
	audioAmpThumbnail: smallint("audio_amp_thumbnail").array(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	updatedAt: bigint("updated_at", { mode: "number" }).default(sql`get_current_timestamp_ms()`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).default(sql`get_current_timestamp_ms()`).notNull(),
}, (table) => [
	index("item_caption_trgm_idx").using("gin", table.caption.asc().nullsLast().op("gin_trgm_ops")),
	index("item_description_trgm_idx").using("gin", table.description.asc().nullsLast().op("gin_trgm_ops")),
	foreignKey({
			columns: [table.creatorId],
			foreignColumns: [user.id],
			name: "item_creator_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [post.id],
			name: "item_post_id_fkey"
		}).onDelete("cascade"),
	unique("position").on(table.id, table.position),
]);

export const user = pgTable("user", {
	id: serial().primaryKey().notNull(),
	username: varchar({ length: 64 }).notNull(),
	name: varchar({ length: 64 }).notNull(),
	password: varchar({ length: 128 }).notNull(),
	profilePicture: varchar("profile_picture"),
	telegramId: varchar("telegram_id", { length: 20 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	updatedAt: bigint("updated_at", { mode: "number" }).default(sql`get_current_timestamp_ms()`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).default(sql`get_current_timestamp_ms()`).notNull(),
}, (table) => [
	uniqueIndex("user_username_lower_idx").using("btree", sql`lower((username)::text)`),
	index("user_username_trgm_idx").using("gin", table.username.asc().nullsLast().op("gin_trgm_ops")),
	unique("user_username_unique").on(table.username),
]);

export const session = pgTable("session", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	userAgent: varchar("user_agent", { length: 512 }),
	firstIp: varchar("first_ip", { length: 45 }).notNull(),
	latestIp: varchar("latest_ip", { length: 45 }).notNull(),
	tokenHash: varchar("token_hash", { length: 64 }).notNull(),
	secretVersion: integer("secret_version").default(1).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	lastTokenRotation: bigint("last_token_rotation", { mode: "number" }).default(0).notNull(),
	secureSessionId: varchar("secure_session_id", { length: 44 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	updatedAt: bigint("updated_at", { mode: "number" }).default(sql`get_current_timestamp_ms()`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).default(sql`get_current_timestamp_ms()`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_user_id_fkey"
		}).onDelete("cascade"),
	unique("session_token_hash_unique").on(table.tokenHash),
	unique("session_secure_session_id_unique").on(table.secureSessionId),
]);

export const keyword = pgTable("keyword", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 64 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	updatedAt: bigint("updated_at", { mode: "number" }).default(sql`get_current_timestamp_ms()`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).default(sql`get_current_timestamp_ms()`).notNull(),
}, (table) => [
	index("keyword_name_trgm_idx").using("gin", table.name.asc().nullsLast().op("gin_trgm_ops")),
	unique("keyword_name_unique").on(table.name),
]);

export const keywordToPost = pgTable("keyword_to_post", {
	keywordId: integer("keyword_id").notNull(),
	postId: integer("post_id").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	addedAt: bigint("added_at", { mode: "number" }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.keywordId],
			foreignColumns: [keyword.id],
			name: "keyword_to_post_keyword_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [post.id],
			name: "keyword_to_post_post_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.keywordId, table.postId], name: "keyword_to_post_pk_pair"}),
]);
export const postSearchView = pgMaterializedView("post_search_view", {	postId: integer("post_id"),
	text: text("text"),
	plainText: text("plain_text"),
}).as(sql`SELECT p.id AS post_id, to_tsvector('english_nostop'::regconfig, (((p.title::text || ' '::text) || COALESCE(string_agg((COALESCE(i.caption, ''::text) || ' '::text) || COALESCE(i.description, ''::text), ' '::text), ''::text)) || ' '::text) || COALESCE(string_agg(k.name::text, ' '::text), ''::text)) AS text, (((p.title::text || ' '::text) || COALESCE(string_agg((COALESCE(i.caption, ''::text) || ' '::text) || COALESCE(i.description, ''::text), ' '::text), ''::text)) || ' '::text) || COALESCE(string_agg(k.name::text, ' '::text), ''::text) AS plain_text FROM post p LEFT JOIN item i ON p.id = i.post_id LEFT JOIN keyword_to_post ktp ON p.id = ktp.post_id LEFT JOIN keyword k ON ktp.keyword_id = k.id GROUP BY p.id, p.title`);

export const itemSearchView = pgMaterializedView("item_search_view", {	itemId: integer("item_id"),
	postId: integer("post_id"),
	text: text("text"),
	plainText: text("plain_text"),
}).as(sql`SELECT i.id AS item_id, i.post_id, to_tsvector('english_nostop'::regconfig, (((((p.title::text || ' '::text) || COALESCE(i.caption, ''::text)) || ' '::text) || COALESCE(i.description, ''::text)) || ' '::text) || COALESCE(string_agg(k.name::text, ' '::text), ''::text)) AS text, (((((p.title::text || ' '::text) || COALESCE(i.caption, ''::text)) || ' '::text) || COALESCE(i.description, ''::text)) || ' '::text) || COALESCE(string_agg(k.name::text, ' '::text), ''::text) AS plain_text FROM item i JOIN post p ON i.post_id = p.id LEFT JOIN keyword_to_post ktp ON p.id = ktp.post_id LEFT JOIN keyword k ON ktp.keyword_id = k.id GROUP BY i.id, i.post_id, p.title, i.caption, i.description`);
