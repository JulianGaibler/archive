-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."format" AS ENUM('VIDEO', 'IMAGE', 'GIF', 'AUDIO', 'TEXT', 'PROCESSING');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('DONE', 'QUEUED', 'PROCESSING', 'FAILED');--> statement-breakpoint
CREATE TABLE "pgmigrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"run_on" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(64) NOT NULL,
	"name" varchar(64) NOT NULL,
	"password" varchar(128) NOT NULL,
	"profile_picture" varchar,
	"telegram_id" varchar(20),
	"dark_mode" boolean DEFAULT false NOT NULL,
	"updated_at" bigint NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "post" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"language" varchar(32) NOT NULL,
	"creator_id" integer,
	"updated_at" bigint NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "format" NOT NULL,
	"original_path" varchar,
	"compressed_path" varchar,
	"thumbnail_path" varchar,
	"relative_height" varchar,
	"creator_id" integer,
	"post_id" integer,
	"caption" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"position" integer NOT NULL,
	"task_notes" text,
	"task_status" "task_status" DEFAULT 'DONE' NOT NULL,
	"task_progress" smallint,
	"audio_amp_thumbnail" smallint[],
	"updated_at" bigint NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "position" UNIQUE("id","position")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"user_agent" varchar(512),
	"first_ip" varchar(45) NOT NULL,
	"latest_ip" varchar(45) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"secret_version" integer DEFAULT 1 NOT NULL,
	"last_token_rotation" bigint DEFAULT 0 NOT NULL,
	"secure_session_id" varchar(44) NOT NULL,
	"updated_at" bigint NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "session_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "session_secure_session_id_unique" UNIQUE("secure_session_id")
);
--> statement-breakpoint
CREATE TABLE "keyword" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(64) NOT NULL,
	"updated_at" bigint NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "keyword_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "keyword_to_post" (
	"keyword_id" integer NOT NULL,
	"post_id" integer NOT NULL,
	"added_at" bigint NOT NULL,
	CONSTRAINT "keyword_to_post_pk_pair" PRIMARY KEY("keyword_id","post_id")
);
--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_to_post" ADD CONSTRAINT "keyword_to_post_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "public"."keyword"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_to_post" ADD CONSTRAINT "keyword_to_post_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_username_lower_idx" ON "user" USING btree (lower((username)::text) text_ops);--> statement-breakpoint
CREATE INDEX "user_username_trgm_idx" ON "user" USING gin ("username" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "post_title_trgm_idx" ON "post" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "item_caption_trgm_idx" ON "item" USING gin ("caption" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "item_description_trgm_idx" ON "item" USING gin ("description" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "keyword_name_trgm_idx" ON "keyword" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE MATERIALIZED VIEW "public"."item_search_view" AS (SELECT p.id AS post_id, to_tsvector('english_nostop'::regconfig, (((p.title::text || ' '::text) || COALESCE(string_agg((COALESCE(i.caption, ''::text) || ' '::text) || COALESCE(i.description, ''::text), ' '::text), ''::text)) || ' '::text) || COALESCE(string_agg(k.name::text, ' '::text), ''::text)) AS text, (((p.title::text || ' '::text) || COALESCE(string_agg((COALESCE(i.caption, ''::text) || ' '::text) || COALESCE(i.description, ''::text), ' '::text), ''::text)) || ' '::text) || COALESCE(string_agg(k.name::text, ' '::text), ''::text) AS plain_text FROM post p LEFT JOIN item i ON p.id = i.post_id LEFT JOIN keyword_to_post ktp ON p.id = ktp.post_id LEFT JOIN keyword k ON ktp.keyword_id = k.id GROUP BY p.id, p.title);
*/