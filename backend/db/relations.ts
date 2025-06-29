import { relations } from "drizzle-orm/relations";
import { user, post, item, session, keyword, keywordToPost } from "./schema";

export const postRelations = relations(post, ({one, many}) => ({
	user: one(user, {
		fields: [post.creatorId],
		references: [user.id]
	}),
	items: many(item),
	keywordToPosts: many(keywordToPost),
}));

export const userRelations = relations(user, ({many}) => ({
	posts: many(post),
	items: many(item),
	sessions: many(session),
}));

export const itemRelations = relations(item, ({one}) => ({
	user: one(user, {
		fields: [item.creatorId],
		references: [user.id]
	}),
	post: one(post, {
		fields: [item.postId],
		references: [post.id]
	}),
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