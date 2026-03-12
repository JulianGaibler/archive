import { relations } from "drizzle-orm/relations";
import { user, passkey, item, file, post, session, keyword, keywordToPost, fileVariant } from "./schema";

export const passkeyRelations = relations(passkey, ({one}) => ({
	user: one(user, {
		fields: [passkey.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({one, many}) => ({
	passkeys: many(passkey),
	items: many(item),
	posts: many(post),
	sessions: many(session),
	file: one(file, {
		fields: [user.profilePictureFileId],
		references: [file.id],
		relationName: "user_profilePictureFileId_file_id"
	}),
	files: many(file, {
		relationName: "file_creatorId_user_id"
	}),
}));

export const itemRelations = relations(item, ({one}) => ({
	user: one(user, {
		fields: [item.creatorId],
		references: [user.id]
	}),
	file: one(file, {
		fields: [item.fileId],
		references: [file.id]
	}),
	post: one(post, {
		fields: [item.postId],
		references: [post.id]
	}),
}));

export const fileRelations = relations(file, ({one, many}) => ({
	items: many(item),
	users: many(user, {
		relationName: "user_profilePictureFileId_file_id"
	}),
	user: one(user, {
		fields: [file.creatorId],
		references: [user.id],
		relationName: "file_creatorId_user_id"
	}),
	fileVariants: many(fileVariant),
}));

export const postRelations = relations(post, ({one, many}) => ({
	items: many(item),
	user: one(user, {
		fields: [post.creatorId],
		references: [user.id]
	}),
	keywordToPosts: many(keywordToPost),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
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

export const fileVariantRelations = relations(fileVariant, ({one}) => ({
	file: one(file, {
		fields: [fileVariant.file],
		references: [file.id]
	}),
}));