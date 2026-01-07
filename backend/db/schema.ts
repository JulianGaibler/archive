import { pgTable, index, foreignKey, unique, integer, text, bigint, uuid, uniqueIndex, varchar, serial, smallint, json, primaryKey, pgMaterializedView, pgSequence, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const taskStatus = pgEnum("TaskStatus", ['DONE', 'QUEUED', 'PROCESSING', 'FAILED'])
export const fileType = pgEnum("file_type", ['VIDEO', 'IMAGE', 'GIF', 'AUDIO', 'PROFILE_PICTURE'])
export const variantType = pgEnum("variant_type", ['ORIGINAL', 'THUMBNAIL', 'THUMBNAIL_POSTER', 'COMPRESSED', 'COMPRESSED_GIF', 'PROFILE_256', 'PROFILE_64', 'UNMODIFIED_COMPRESSED', 'UNMODIFIED_THUMBNAIL_POSTER'])

export const taskIdSeq = pgSequence("Task_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "9223372036854775807", cache: "1", cycle: false })
export const itemIdSeq = pgSequence("item_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "9223372036854775807", cache: "1", cycle: false })
export const keywordIdSeq = pgSequence("keyword_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "9223372036854775807", cache: "1", cycle: false })
export const knexMigrationsIdSeq = pgSequence("knex_migrations_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "9223372036854775807", cache: "1", cycle: false })
export const knexMigrationsLockIndexSeq = pgSequence("knex_migrations_lock_index_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "9223372036854775807", cache: "1", cycle: false })
export const pgmigrationsIdSeq = pgSequence("pgmigrations_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "9223372036854775807", cache: "1", cycle: false })
export const sessionIdSeq = pgSequence("session_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "9223372036854775807", cache: "1", cycle: false })
export const userIdSeq = pgSequence("user_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "9223372036854775807", cache: "1", cycle: false })

export const item = pgTable("item", {
	id: integer().default(sql`nextval('item_id_seq'::regclass)`).primaryKey().notNull(),
	creatorId: integer("creator_id").notNull(),
	caption: text().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	updatedAt: bigint("updated_at", { mode: "number" }).default(sql`get_current_timestamp_ms()`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).default(sql`get_current_timestamp_ms()`).notNull(),
	description: text().notNull(),
	postId: integer("post_id").notNull(),
	position: integer().notNull(),
	fileId: uuid("file_id"),
}, (table) => [
	index("item_caption_trgm_idx").using("gin", table.caption.asc().nullsLast().op("gin_trgm_ops")),
	index("item_description_trgm_idx").using("gin", table.description.asc().nullsLast().op("gin_trgm_ops")),
	foreignKey({
			columns: [table.creatorId],
			foreignColumns: [user.id],
			name: "Post_uploaderId_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [post.id],
			name: "item_post_id_foreign"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.fileId],
			foreignColumns: [file.id],
			name: "item_file_id_fkey"
		}).onDelete("set null"),
	unique("position").on(table.id, table.position),
]);

export const keyword = pgTable("keyword", {
	id: integer().default(sql`nextval('keyword_id_seq'::regclass)`).primaryKey().notNull(),
	name: varchar({ length: 64 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	updatedAt: bigint("updated_at", { mode: "number" }).default(sql`get_current_timestamp_ms()`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).default(sql`get_current_timestamp_ms()`).notNull(),
}, (table) => [
	index("keyword_name_trgm_idx").using("gin", table.name.asc().nullsLast().op("gin_trgm_ops")),
	uniqueIndex("keyword_name_unique").using("btree", table.name.asc().nullsLast().op("text_ops")),
]);

export const post = pgTable("post", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 255 }).notNull(),
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
			name: "post_creator_id_foreign"
		}).onDelete("set null"),
]);

export const session = pgTable("session", {
	id: integer().default(sql`nextval('session_id_seq'::regclass)`).primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	userAgent: varchar("user_agent", { length: 512 }),
	firstIp: varchar("first_ip", { length: 45 }).notNull(),
	latestIp: varchar("latest_ip", { length: 45 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	updatedAt: bigint("updated_at", { mode: "number" }).default(sql`get_current_timestamp_ms()`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).default(sql`get_current_timestamp_ms()`).notNull(),
	tokenHash: varchar("token_hash", { length: 64 }).default('').notNull(),
	secretVersion: integer("secret_version").default(1).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	lastTokenRotation: bigint("last_token_rotation", { mode: "number" }).default(sql`'0'`).notNull(),
	secureSessionId: varchar("secure_session_id", { length: 44 }).default('').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Session_userId_fkey"
		}).onDelete("cascade"),
	unique("session_token_hash_unique").on(table.tokenHash),
	unique("session_secure_session_id_unique").on(table.secureSessionId),
]);

export const file = pgTable("file", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	creatorId: integer("creator_id").notNull(),
	type: fileType().notNull(),
	originalType: fileType("original_type").notNull(),
	processingStatus: taskStatus("processing_status").default('DONE').notNull(),
	processingProgress: smallint("processing_progress"),
	processingNotes: text("processing_notes"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	expireBy: bigint("expire_by", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	updatedAt: bigint("updated_at", { mode: "number" }).default(sql`get_current_timestamp_ms()`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).default(sql`get_current_timestamp_ms()`).notNull(),
	processingMeta: json("processing_meta"),
	modifications: json().default({}).notNull(),
}, (table): any => [
	foreignKey({
			columns: [table.creatorId],
			foreignColumns: [user.id],
			name: "file_creator_id_fkey"
		}).onDelete("cascade"),
]);

export const user = pgTable("user", {
	id: integer().default(sql`nextval('user_id_seq'::regclass)`).primaryKey().notNull(),
	username: varchar({ length: 64 }).notNull(),
	name: varchar({ length: 64 }).notNull(),
	password: varchar({ length: 128 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	updatedAt: bigint("updated_at", { mode: "number" }).default(sql`get_current_timestamp_ms()`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).default(sql`get_current_timestamp_ms()`).notNull(),
	telegramId: varchar("telegram_id", { length: 20 }),
	profilePictureFileId: uuid("profile_picture_file_id"),
}, (table) => [
	uniqueIndex("user_username_lower_idx").using("btree", sql`lower((username)::text)`),
	index("user_username_trgm_idx").using("gin", table.username.asc().nullsLast().op("gin_trgm_ops")),
	uniqueIndex("user_username_unique").using("btree", table.username.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.profilePictureFileId],
			foreignColumns: [file.id],
			name: "user_profile_picture_file_id_fkey"
		}).onDelete("set null"),
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
			name: "keyword_to_post_keyword_id_foreign"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [post.id],
			name: "keyword_to_post_post_id_foreign"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.keywordId, table.postId], name: "keyword_to_post_pk_pair"}),
]);

export const fileVariant = pgTable("file_variant", {
	file: uuid().notNull(),
	variant: variantType().notNull(),
	mimeType: varchar("mime_type", { length: 100 }).notNull(),
	extension: varchar({ length: 10 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sizeBytes: bigint("size_bytes", { mode: "number" }).default(0).notNull(),
	meta: json().default({}).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	updatedAt: bigint("updated_at", { mode: "number" }).default(sql`get_current_timestamp_ms()`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).default(sql`get_current_timestamp_ms()`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.file],
			foreignColumns: [file.id],
			name: "file_variant_file_fkey"
		}).onDelete("restrict"),
	primaryKey({ columns: [table.file, table.variant], name: "file_variant_pkey"}),
]);
export const postSearchView = pgMaterializedView("post_search_view", {	postId: integer("post_id"),
	// TODO: failed to parse database type 'tsvector'
	text: text("text"),
	plainText: text("plain_text"),
}).as(sql`SELECT p.id AS post_id, to_tsvector('english_nostop'::regconfig, (((p.title::text || ' '::text) || COALESCE(string_agg((COALESCE(i.caption, ''::text) || ' '::text) || COALESCE(i.description, ''::text), ' '::text), ''::text)) || ' '::text) || COALESCE(string_agg(k.name::text, ' '::text), ''::text)) AS text, (((p.title::text || ' '::text) || COALESCE(string_agg((COALESCE(i.caption, ''::text) || ' '::text) || COALESCE(i.description, ''::text), ' '::text), ''::text)) || ' '::text) || COALESCE(string_agg(k.name::text, ' '::text), ''::text) AS plain_text FROM post p LEFT JOIN item i ON p.id = i.post_id LEFT JOIN keyword_to_post ktp ON p.id = ktp.post_id LEFT JOIN keyword k ON ktp.keyword_id = k.id GROUP BY p.id, p.title`);

export const itemSearchView = pgMaterializedView("item_search_view", {	itemId: integer("item_id"),
	postId: integer("post_id"),
	// TODO: failed to parse database type 'tsvector'
	text: text("text"),
	plainText: text("plain_text"),
}).as(sql`SELECT i.id AS item_id, i.post_id, to_tsvector('english_nostop'::regconfig, (((((p.title::text || ' '::text) || COALESCE(i.caption, ''::text)) || ' '::text) || COALESCE(i.description, ''::text)) || ' '::text) || COALESCE(string_agg(k.name::text, ' '::text), ''::text)) AS text, (((((p.title::text || ' '::text) || COALESCE(i.caption, ''::text)) || ' '::text) || COALESCE(i.description, ''::text)) || ' '::text) || COALESCE(string_agg(k.name::text, ' '::text), ''::text) AS plain_text FROM item i JOIN post p ON i.post_id = p.id LEFT JOIN keyword_to_post ktp ON p.id = ktp.post_id LEFT JOIN keyword k ON ktp.keyword_id = k.id GROUP BY i.id, i.post_id, p.title, i.caption, i.description`);
