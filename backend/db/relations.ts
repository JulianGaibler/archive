import { relations } from "drizzle-orm/relations";
import { user, item, post, file, session, fileMigrationLog, fileVariant, keyword, keywordToPost } from "./schema";

export const itemRelations = relations(item, ({one}) => ({
	user: one(user, {
		fields: [item.creatorId],
		references: [user.id]
	}),
	post: one(post, {
		fields: [item.postId],
		references: [post.id]
	}),
	file: one(file, {
		fields: [item.fileId],
		references: [file.id]
	}),
}));

export const userRelations = relations(user, ({one, many}) => ({
	items: many(item),
	posts: many(post),
	sessions: many(session),
	files: many(file, {
		relationName: "file_creatorId_user_id"
	}),
	file: one(file, {
		fields: [user.profilePictureFileId],
		references: [file.id],
		relationName: "user_profilePictureFileId_file_id"
	}),
}));

export const postRelations = relations(post, ({one, many}) => ({
	items: many(item),
	user: one(user, {
		fields: [post.creatorId],
		references: [user.id]
	}),
	keywordToPosts: many(keywordToPost),
}));

export const fileRelations = relations(file, ({one, many}) => ({
	items: many(item),
	user: one(user, {
		fields: [file.creatorId],
		references: [user.id],
		relationName: "file_creatorId_user_id"
	}),
	fileMigrationLogs: many(fileMigrationLog),
	users: many(user, {
		relationName: "user_profilePictureFileId_file_id"
	}),
	fileVariants: many(fileVariant),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const fileMigrationLogRelations = relations(fileMigrationLog, ({one}) => ({
	file: one(file, {
		fields: [fileMigrationLog.fileId],
		references: [file.id]
	}),
	fileVariant: one(fileVariant, {
		fields: [fileMigrationLog.fileId],
		references: [fileVariant.file]
	}),
}));

export const fileVariantRelations = relations(fileVariant, ({one, many}) => ({
	fileMigrationLogs: many(fileMigrationLog),
	file: one(file, {
		fields: [fileVariant.file],
		references: [file.id]
	}),
}));

export const keywordToPostRelations = relations(keywordToPost, ({one}) => ({
	keyword: one(keyword, {
		fields: [keywordToPost.keywordId],
		references: [keyword.id]
	}),
	post: one(post, {
		fields: [keywordToPost.postId],
		references: [post.id]
	}),
}));

export const keywordRelations = relations(keyword, ({many}) => ({
	keywordToPosts: many(keywordToPost),
}));