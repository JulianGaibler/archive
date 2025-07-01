import type { GraphQLClient, RequestOptions } from 'graphql-request';
import { GraphQLError, print } from 'graphql'
import gql from 'graphql-tag';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: any; output: any; }
  Upload: { input: any; output: any; }
};

/** An audio item. */
export type AudioItem = Item & MediaItem & Node & {
  __typename?: 'AudioItem';
  ampThumbnail: Array<Scalars['Float']['output']>;
  caption: Scalars['String']['output'];
  compressedPath: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  creator: User;
  description: Scalars['String']['output'];
  /** The ID of an object */
  id: Scalars['ID']['output'];
  originalPath: Scalars['String']['output'];
  position: Scalars['Int']['output'];
  post: Post;
  updatedAt: Scalars['DateTime']['output'];
};

export type EditItemInput = {
  caption?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the item to edit. */
  id: Scalars['ID']['input'];
};

/** Possible formats a post can have. */
export enum Format {
  /** A sound file. */
  Audio = 'AUDIO',
  /** A video without sound. */
  Gif = 'GIF',
  /** An image. */
  Image = 'IMAGE',
  /** A text post. */
  Text = 'TEXT',
  /** A video with sound. */
  Video = 'VIDEO'
}

/** A GIF item. */
export type GifItem = Item & MediaItem & Node & VisualMediaItem & {
  __typename?: 'GifItem';
  caption: Scalars['String']['output'];
  compressedPath: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  creator: User;
  description: Scalars['String']['output'];
  /** The ID of an object */
  id: Scalars['ID']['output'];
  originalPath: Scalars['String']['output'];
  position: Scalars['Int']['output'];
  post: Post;
  relativeHeight: Scalars['Float']['output'];
  thumbnailPath?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

/** An image item. */
export type ImageItem = Item & MediaItem & Node & VisualMediaItem & {
  __typename?: 'ImageItem';
  caption: Scalars['String']['output'];
  compressedPath: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  creator: User;
  description: Scalars['String']['output'];
  /** The ID of an object */
  id: Scalars['ID']['output'];
  originalPath: Scalars['String']['output'];
  position: Scalars['Int']['output'];
  post: Post;
  relativeHeight: Scalars['Float']['output'];
  thumbnailPath?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

/** Base interface for all item types. */
export type Item = {
  createdAt: Scalars['DateTime']['output'];
  creator: User;
  description: Scalars['String']['output'];
  /** The ID of an object */
  id: Scalars['ID']['output'];
  position: Scalars['Int']['output'];
  post: Post;
  updatedAt: Scalars['DateTime']['output'];
};

/** A connection to a list of items. */
export type ItemConnection = {
  __typename?: 'ItemConnection';
  /** When paginating forwards, the cursor to continue. */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean']['output'];
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** List of items. */
  nodes: Array<Item>;
  /** When paginating backwards, the cursor to continue. */
  startCursor?: Maybe<Scalars['String']['output']>;
  /** Total number of items. */
  totalCount: Scalars['Int']['output'];
};

/** A keyword for categorizing Posts. */
export type Keyword = Node & {
  __typename?: 'Keyword';
  /** The ID of an object */
  id: Scalars['ID']['output'];
  /** Identifies the keyword name. */
  name: Scalars['String']['output'];
  /** The number of posts associated with this keyword. */
  postCount: Scalars['Int']['output'];
  /** All Posts associated with this keyword. */
  posts?: Maybe<PostConnection>;
};


/** A keyword for categorizing Posts. */
export type KeywordPostsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** A connection to a list of keywords. */
export type KeywordConnection = {
  __typename?: 'KeywordConnection';
  /** When paginating forwards, the cursor to continue. */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean']['output'];
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** List of keywords. */
  nodes: Array<Keyword>;
  /** When paginating backwards, the cursor to continue. */
  startCursor?: Maybe<Scalars['String']['output']>;
  /** Total number of keywords. */
  totalCount: Scalars['Int']['output'];
};

/** Possible languages that an object can have. */
export enum Language {
  /** The English language. */
  English = 'ENGLISH',
  /** The French language. */
  French = 'FRENCH',
  /** The German language. */
  German = 'GERMAN',
  /** The Italian language. */
  Italian = 'ITALIAN',
  /** The Norwegian language. */
  Norwegian = 'NORWEGIAN',
  /** The Russian language. */
  Russian = 'RUSSIAN',
  /** The Spanish language. */
  Spanish = 'SPANISH',
  /** The Turkish language. */
  Turkish = 'TURKISH'
}

/** Interface for media items. */
export type MediaItem = {
  caption: Scalars['String']['output'];
  compressedPath: Scalars['String']['output'];
  originalPath: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Changes the name of the current user. */
  changeName: Scalars['Boolean']['output'];
  /** Changes the password of the current user. */
  changePassword: Scalars['Boolean']['output'];
  /** Deletes the profile picture of the current user. */
  clearProfilePicture: Scalars['Boolean']['output'];
  /** Creates a new keyword. */
  createKeyword: Keyword;
  /** Creates a new Post */
  createPost: Post;
  /**
   * Deletes an item from a post and reorders remaining items.
   * Returns the ID of the deleted item.
   */
  deleteItem: Scalars['ID']['output'];
  /** Deleted a keyword. */
  deleteKeyword: Scalars['Boolean']['output'];
  /**
   * Deletes a post and all its associated items and files.
   * Returns the ID of the deleted post.
   */
  deletePost: Scalars['ID']['output'];
  /** Edits a post. */
  editPost: Post;
  /** Associates the Telegram ID of a user with their Archive Profil. */
  linkTelegram: Scalars['Boolean']['output'];
  /** Creates a new session for the user. */
  login: Scalars['Boolean']['output'];
  /** Terminates the current users session. */
  logout: Scalars['Boolean']['output'];
  /**
   * Merges one post into another, moving all items and optionally keywords.
   * Returns the number of items merged.
   */
  mergePost: Scalars['Int']['output'];
  /**
   * Moves an item from one post to another.
   * Returns whether the source post was deleted.
   */
  moveItem: Scalars['Boolean']['output'];
  /**
   * Reorders an item within a post to a new position.
   * Returns the new position of the item.
   */
  reorderItem: Scalars['Int']['output'];
  /**
   * Reorders multiple items within a post to the specified order. Items not included will be placed after the reordered items maintaining their relative positions.
   * Return all item ids on the post in the new order.
   */
  reorderItems: Array<Scalars['ID']['output']>;
  /** Revokes the session of a user. */
  revokeSession: Scalars['Boolean']['output'];
  /** Creates a new user and performs a login. */
  signup: Scalars['Boolean']['output'];
  /** Removed Telegram ID from Archive profile. */
  unlinkTelegram: Scalars['Boolean']['output'];
  /** Sets the profile picture of the current user. */
  uploadProfilePicture: Scalars['Boolean']['output'];
};


export type MutationChangeNameArgs = {
  newName: Scalars['String']['input'];
};


export type MutationChangePasswordArgs = {
  newPassword: Scalars['String']['input'];
  oldPassword: Scalars['String']['input'];
};


export type MutationCreateKeywordArgs = {
  name: Scalars['String']['input'];
};


export type MutationCreatePostArgs = {
  keywords?: InputMaybe<Array<Scalars['ID']['input']>>;
  language: Language;
  title: Scalars['String']['input'];
};


export type MutationDeleteItemArgs = {
  itemId: Scalars['ID']['input'];
};


export type MutationDeleteKeywordArgs = {
  keywordId: Scalars['String']['input'];
};


export type MutationDeletePostArgs = {
  postId: Scalars['ID']['input'];
};


export type MutationEditPostArgs = {
  items?: InputMaybe<Array<EditItemInput>>;
  keywords: Array<Scalars['ID']['input']>;
  language: Language;
  newItems?: InputMaybe<Array<NewItemInput>>;
  postId: Scalars['ID']['input'];
  title: Scalars['String']['input'];
};


export type MutationLinkTelegramArgs = {
  apiResponse: Scalars['String']['input'];
};


export type MutationLoginArgs = {
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};


export type MutationMergePostArgs = {
  mergeKeywords?: InputMaybe<Scalars['Boolean']['input']>;
  sourcePostId: Scalars['ID']['input'];
  targetPostId: Scalars['ID']['input'];
};


export type MutationMoveItemArgs = {
  itemId: Scalars['ID']['input'];
  keepEmptyPost?: InputMaybe<Scalars['Boolean']['input']>;
  targetPostId: Scalars['ID']['input'];
};


export type MutationReorderItemArgs = {
  itemId: Scalars['ID']['input'];
  newPosition: Scalars['Int']['input'];
};


export type MutationReorderItemsArgs = {
  itemIds: Array<Scalars['ID']['input']>;
  postId: Scalars['ID']['input'];
};


export type MutationRevokeSessionArgs = {
  sessionId: Scalars['ID']['input'];
};


export type MutationSignupArgs = {
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};


export type MutationUploadProfilePictureArgs = {
  file: Scalars['Upload']['input'];
};

export type NewItemInput = {
  caption?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  /** The file to upload. */
  file: Scalars['Upload']['input'];
};

/** An object with an ID */
export type Node = {
  /** The id of the object. */
  id: Scalars['ID']['output'];
};

/** A post. */
export type Post = Node & {
  __typename?: 'Post';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  creator: User;
  /** The ID of an object */
  id: Scalars['ID']['output'];
  /** Items in this post. */
  items: ItemConnection;
  keywords: Array<Keyword>;
  /** Language in which caption and title are written. */
  language: Language;
  title: Scalars['String']['output'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};


/** A post. */
export type PostItemsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** A connection to a list of posts. */
export type PostConnection = {
  __typename?: 'PostConnection';
  /** When paginating forwards, the cursor to continue. */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean']['output'];
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** List of posts. */
  nodes: Array<Post>;
  /** When paginating backwards, the cursor to continue. */
  startCursor?: Maybe<Scalars['String']['output']>;
  /** Total number of posts. */
  totalCount: Scalars['Int']['output'];
};

/** An item that is being processed. */
export type ProcessingItem = Item & Node & {
  __typename?: 'ProcessingItem';
  createdAt: Scalars['DateTime']['output'];
  creator: User;
  description: Scalars['String']['output'];
  /** The ID of an object */
  id: Scalars['ID']['output'];
  position: Scalars['Int']['output'];
  post: Post;
  taskNotes?: Maybe<Scalars['String']['output']>;
  taskProgress?: Maybe<Scalars['Int']['output']>;
  taskStatus: TaskStatus;
  updatedAt: Scalars['DateTime']['output'];
};

export type Query = {
  __typename?: 'Query';
  /** Returns a list of keywords. */
  keywords?: Maybe<KeywordConnection>;
  /** Returns the currently authenticated user. */
  me?: Maybe<User>;
  /** Fetches an object given its ID */
  node: Node;
  /** Fetches objects given their IDs */
  nodes: Array<Maybe<Node>>;
  /** Returns a list of posts. */
  posts?: Maybe<PostConnection>;
  /** Returns user based on username */
  user?: Maybe<User>;
  /** Returns a list of sessions of the the currently authenticated user. */
  userSessions: Array<Session>;
  /** Returns a list of users. */
  users?: Maybe<UserConnection>;
};


export type QueryKeywordsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  byName?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  sortByPostCount?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryNodeArgs = {
  id: Scalars['ID']['input'];
};


export type QueryNodesArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type QueryPostsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  byContent?: InputMaybe<Scalars['String']['input']>;
  byKeywords?: InputMaybe<Array<Scalars['ID']['input']>>;
  byLanguage?: InputMaybe<Language>;
  byTypes?: InputMaybe<Array<Format>>;
  byUsers?: InputMaybe<Array<Scalars['String']['input']>>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryUserArgs = {
  username: Scalars['String']['input'];
};


export type QueryUsersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sortByPostCount?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Represents a Session object of an user. */
export type Session = Node & {
  __typename?: 'Session';
  /** Identifies the date and time when the session was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Indicates if this is the current session. */
  current: Scalars['Boolean']['output'];
  /** IP with which the session was created. */
  firstIp: Scalars['String']['output'];
  /** The ID of an object */
  id: Scalars['ID']['output'];
  /** Last IP that used this session. */
  latestIp: Scalars['String']['output'];
  /** Identifies the date and time when the session was last used. */
  updatedAt: Scalars['DateTime']['output'];
  /** User associated with that session */
  user?: Maybe<User>;
  /** Last known User-Agent string of this session. */
  userAgent: Scalars['String']['output'];
};

export type Subscription = {
  __typename?: 'Subscription';
  /** Returns updates from tasks. */
  taskUpdates: TaskUpdate;
};


export type SubscriptionTaskUpdatesArgs = {
  ids: Array<Scalars['String']['input']>;
};

/** The possible states of a task. */
export enum TaskStatus {
  /** The processing was successful. */
  Done = 'DONE',
  /** The processing has failed. */
  Failed = 'FAILED',
  /** The file is being processed. */
  Processing = 'PROCESSING',
  /** The file is waiting to be processed. */
  Queued = 'QUEUED'
}

/** Update data of a tasks current status. */
export type TaskUpdate = {
  __typename?: 'TaskUpdate';
  /** The ID of an object */
  id: Scalars['ID']['output'];
  /** The updated or created item. */
  item?: Maybe<Item>;
  /** Indicates what kind of update this is. */
  kind: UpdateKind;
};

/** Enum that specifies if an update contains a new object, an update or if an object has been deleted. */
export enum UpdateKind {
  /** Contains a changed object */
  Changed = 'CHANGED',
  /** Contains a new object */
  Created = 'CREATED',
  /** Contains a deleted object */
  Deleted = 'DELETED'
}

/** A user is an account that can make new content. */
export type User = Node & {
  __typename?: 'User';
  /** The ID of an object */
  id: Scalars['ID']['output'];
  /** Shows if the user has a connected Telegram Account. */
  linkedTelegram?: Maybe<Scalars['Boolean']['output']>;
  /** The user's profile name. */
  name: Scalars['String']['output'];
  /** The number of posts created by this user. */
  postCount: Scalars['Int']['output'];
  /** All Posts associated with this user. */
  posts?: Maybe<PostConnection>;
  /** Name of the user's profile picture. */
  profilePicture?: Maybe<Scalars['String']['output']>;
  /** The username used to login. */
  username: Scalars['String']['output'];
};


/** A user is an account that can make new content. */
export type UserPostsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** A connection to a list of users. */
export type UserConnection = {
  __typename?: 'UserConnection';
  /** When paginating forwards, the cursor to continue. */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean']['output'];
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** List of users. */
  nodes: Array<User>;
  /** When paginating backwards, the cursor to continue. */
  startCursor?: Maybe<Scalars['String']['output']>;
  /** Total number of users. */
  totalCount: Scalars['Int']['output'];
};

/** A video item. */
export type VideoItem = Item & MediaItem & Node & VisualMediaItem & {
  __typename?: 'VideoItem';
  caption: Scalars['String']['output'];
  compressedPath: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  creator: User;
  description: Scalars['String']['output'];
  /** The ID of an object */
  id: Scalars['ID']['output'];
  originalPath: Scalars['String']['output'];
  position: Scalars['Int']['output'];
  post: Post;
  relativeHeight: Scalars['Float']['output'];
  thumbnailPath?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

/** Interface for visual media items. */
export type VisualMediaItem = {
  relativeHeight: Scalars['Float']['output'];
  thumbnailPath?: Maybe<Scalars['String']['output']>;
};

export type SettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type SettingsQuery = { __typename?: 'Query', me?: { __typename?: 'User', name: string, username: string, profilePicture?: string | null, linkedTelegram?: boolean | null } | null, userSessions: Array<{ __typename?: 'Session', createdAt: any, firstIp: string, id: string, latestIp: string, current: boolean, userAgent: string, updatedAt: any }> };

export type LoginMutationVariables = Exact<{
  username: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;


export type LoginMutation = { __typename?: 'Mutation', login: boolean };

export type LogoutMutationVariables = Exact<{ [key: string]: never; }>;


export type LogoutMutation = { __typename?: 'Mutation', logout: boolean };

type ItemData_AudioItem_Fragment = { __typename: 'AudioItem', caption: string, originalPath: string, compressedPath: string, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } };

type ItemData_GifItem_Fragment = { __typename: 'GifItem', caption: string, originalPath: string, compressedPath: string, relativeHeight: number, thumbnailPath?: string | null, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } };

type ItemData_ImageItem_Fragment = { __typename: 'ImageItem', caption: string, originalPath: string, compressedPath: string, relativeHeight: number, thumbnailPath?: string | null, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } };

type ItemData_ProcessingItem_Fragment = { __typename: 'ProcessingItem', taskProgress?: number | null, taskStatus: TaskStatus, taskNotes?: string | null, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } };

type ItemData_VideoItem_Fragment = { __typename: 'VideoItem', caption: string, originalPath: string, compressedPath: string, relativeHeight: number, thumbnailPath?: string | null, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } };

export type ItemDataFragment = ItemData_AudioItem_Fragment | ItemData_GifItem_Fragment | ItemData_ImageItem_Fragment | ItemData_ProcessingItem_Fragment | ItemData_VideoItem_Fragment;

export type PostDataFragment = { __typename?: 'Post', id: string, title: string, language: Language, updatedAt: any, createdAt: any, creator: { __typename?: 'User', name: string, username: string, profilePicture?: string | null }, keywords: Array<{ __typename?: 'Keyword', name: string, id: string }>, items: { __typename?: 'ItemConnection', nodes: Array<{ __typename: 'AudioItem', caption: string, originalPath: string, compressedPath: string, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } } | { __typename: 'GifItem', caption: string, originalPath: string, compressedPath: string, relativeHeight: number, thumbnailPath?: string | null, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } } | { __typename: 'ImageItem', caption: string, originalPath: string, compressedPath: string, relativeHeight: number, thumbnailPath?: string | null, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } } | { __typename: 'ProcessingItem', taskProgress?: number | null, taskStatus: TaskStatus, taskNotes?: string | null, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } } | { __typename: 'VideoItem', caption: string, originalPath: string, compressedPath: string, relativeHeight: number, thumbnailPath?: string | null, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } }> } };

export type PostsConnectionFragment = { __typename?: 'PostConnection', hasNextPage: boolean, endCursor?: string | null, startCursor?: string | null, nodes: Array<{ __typename?: 'Post', id: string, title: string, creator: { __typename?: 'User', profilePicture?: string | null, username: string }, items: { __typename?: 'ItemConnection', totalCount: number, nodes: Array<{ __typename: 'AudioItem', ampThumbnail: Array<number>, id: string } | { __typename: 'GifItem', relativeHeight: number, thumbnailPath?: string | null, id: string } | { __typename: 'ImageItem', relativeHeight: number, thumbnailPath?: string | null, id: string } | { __typename: 'ProcessingItem', id: string } | { __typename: 'VideoItem', relativeHeight: number, thumbnailPath?: string | null, id: string }> } }> };

export type KeywordsQueryVariables = Exact<{
  after?: InputMaybe<Scalars['String']['input']>;
  byName?: InputMaybe<Scalars['String']['input']>;
}>;


export type KeywordsQuery = { __typename?: 'Query', keywords?: { __typename?: 'KeywordConnection', hasNextPage: boolean, endCursor?: string | null, nodes: Array<{ __typename?: 'Keyword', id: string, name: string, postCount: number }> } | null };

export type KeywordSearchQueryVariables = Exact<{
  input?: InputMaybe<Scalars['String']['input']>;
}>;


export type KeywordSearchQuery = { __typename?: 'Query', keywords?: { __typename?: 'KeywordConnection', nodes: Array<{ __typename?: 'Keyword', id: string, name: string }> } | null };

export type KeywordWithPostsQueryVariables = Exact<{
  nodeId: Scalars['ID']['input'];
  after?: InputMaybe<Scalars['String']['input']>;
  byContent?: InputMaybe<Scalars['String']['input']>;
}>;


export type KeywordWithPostsQuery = { __typename?: 'Query', keyword: { __typename: 'AudioItem' } | { __typename: 'GifItem' } | { __typename: 'ImageItem' } | { __typename: 'Keyword', name: string, postCount: number } | { __typename: 'Post' } | { __typename: 'ProcessingItem' } | { __typename: 'Session' } | { __typename: 'User' } | { __typename: 'VideoItem' }, posts?: { __typename?: 'PostConnection', hasNextPage: boolean, endCursor?: string | null, startCursor?: string | null, nodes: Array<{ __typename?: 'Post', id: string, title: string, creator: { __typename?: 'User', profilePicture?: string | null, username: string }, items: { __typename?: 'ItemConnection', totalCount: number, nodes: Array<{ __typename: 'AudioItem', ampThumbnail: Array<number>, id: string } | { __typename: 'GifItem', relativeHeight: number, thumbnailPath?: string | null, id: string } | { __typename: 'ImageItem', relativeHeight: number, thumbnailPath?: string | null, id: string } | { __typename: 'ProcessingItem', id: string } | { __typename: 'VideoItem', relativeHeight: number, thumbnailPath?: string | null, id: string }> } }> } | null };

export type CreateKeywordMutationVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type CreateKeywordMutation = { __typename?: 'Mutation', createKeyword: { __typename?: 'Keyword', id: string, name: string } };

export type PostQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type PostQuery = { __typename?: 'Query', node: { __typename?: 'AudioItem' } | { __typename?: 'GifItem' } | { __typename?: 'ImageItem' } | { __typename?: 'Keyword' } | { __typename?: 'Post', id: string, title: string, language: Language, updatedAt: any, createdAt: any, creator: { __typename?: 'User', name: string, username: string, profilePicture?: string | null }, keywords: Array<{ __typename?: 'Keyword', name: string, id: string }>, items: { __typename?: 'ItemConnection', nodes: Array<{ __typename: 'AudioItem', caption: string, originalPath: string, compressedPath: string, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } } | { __typename: 'GifItem', caption: string, originalPath: string, compressedPath: string, relativeHeight: number, thumbnailPath?: string | null, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } } | { __typename: 'ImageItem', caption: string, originalPath: string, compressedPath: string, relativeHeight: number, thumbnailPath?: string | null, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } } | { __typename: 'ProcessingItem', taskProgress?: number | null, taskStatus: TaskStatus, taskNotes?: string | null, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } } | { __typename: 'VideoItem', caption: string, originalPath: string, compressedPath: string, relativeHeight: number, thumbnailPath?: string | null, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } }> } } | { __typename?: 'ProcessingItem' } | { __typename?: 'Session' } | { __typename?: 'User' } | { __typename?: 'VideoItem' } };

export type PostsQueryVariables = Exact<{
  after?: InputMaybe<Scalars['String']['input']>;
  byContent?: InputMaybe<Scalars['String']['input']>;
  byKeywords?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  byUsers?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
}>;


export type PostsQuery = { __typename?: 'Query', posts?: { __typename?: 'PostConnection', hasNextPage: boolean, endCursor?: string | null, startCursor?: string | null, nodes: Array<{ __typename?: 'Post', id: string, title: string, creator: { __typename?: 'User', profilePicture?: string | null, username: string }, items: { __typename?: 'ItemConnection', totalCount: number, nodes: Array<{ __typename: 'AudioItem', ampThumbnail: Array<number>, id: string } | { __typename: 'GifItem', relativeHeight: number, thumbnailPath?: string | null, id: string } | { __typename: 'ImageItem', relativeHeight: number, thumbnailPath?: string | null, id: string } | { __typename: 'ProcessingItem', id: string } | { __typename: 'VideoItem', relativeHeight: number, thumbnailPath?: string | null, id: string }> } }> } | null };

export type PostsTextOnlyQueryVariables = Exact<{
  after?: InputMaybe<Scalars['String']['input']>;
  byContent?: InputMaybe<Scalars['String']['input']>;
}>;


export type PostsTextOnlyQuery = { __typename?: 'Query', posts?: { __typename?: 'PostConnection', hasNextPage: boolean, endCursor?: string | null, startCursor?: string | null, nodes: Array<{ __typename?: 'Post', id: string, title: string }> } | null };

export type CreatePostMutationVariables = Exact<{
  title: Scalars['String']['input'];
  language: Language;
  keywords?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type CreatePostMutation = { __typename?: 'Mutation', createPost: { __typename?: 'Post', id: string, title: string, language: Language, updatedAt: any, createdAt: any, creator: { __typename?: 'User', name: string, username: string, profilePicture?: string | null }, keywords: Array<{ __typename?: 'Keyword', name: string, id: string }>, items: { __typename?: 'ItemConnection', nodes: Array<{ __typename: 'AudioItem', caption: string, originalPath: string, compressedPath: string, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } } | { __typename: 'GifItem', caption: string, originalPath: string, compressedPath: string, relativeHeight: number, thumbnailPath?: string | null, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } } | { __typename: 'ImageItem', caption: string, originalPath: string, compressedPath: string, relativeHeight: number, thumbnailPath?: string | null, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } } | { __typename: 'ProcessingItem', taskProgress?: number | null, taskStatus: TaskStatus, taskNotes?: string | null, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } } | { __typename: 'VideoItem', caption: string, originalPath: string, compressedPath: string, relativeHeight: number, thumbnailPath?: string | null, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } }> } } };

export type EditPostMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  title: Scalars['String']['input'];
  keywords: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  language: Language;
  items?: InputMaybe<Array<EditItemInput> | EditItemInput>;
  newItems?: InputMaybe<Array<NewItemInput> | NewItemInput>;
}>;


export type EditPostMutation = { __typename?: 'Mutation', editPost: { __typename?: 'Post', id: string, title: string, language: Language, updatedAt: any, createdAt: any, creator: { __typename?: 'User', name: string, username: string, profilePicture?: string | null }, keywords: Array<{ __typename?: 'Keyword', name: string, id: string }>, items: { __typename?: 'ItemConnection', nodes: Array<{ __typename: 'AudioItem', caption: string, originalPath: string, compressedPath: string, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } } | { __typename: 'GifItem', caption: string, originalPath: string, compressedPath: string, relativeHeight: number, thumbnailPath?: string | null, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } } | { __typename: 'ImageItem', caption: string, originalPath: string, compressedPath: string, relativeHeight: number, thumbnailPath?: string | null, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } } | { __typename: 'ProcessingItem', taskProgress?: number | null, taskStatus: TaskStatus, taskNotes?: string | null, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } } | { __typename: 'VideoItem', caption: string, originalPath: string, compressedPath: string, relativeHeight: number, thumbnailPath?: string | null, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } }> } } };

export type DeleteItemMutationVariables = Exact<{
  deleteItemId: Scalars['ID']['input'];
}>;


export type DeleteItemMutation = { __typename?: 'Mutation', deleteItem: string };

export type DeletePostMutationVariables = Exact<{
  deletePostId: Scalars['ID']['input'];
}>;


export type DeletePostMutation = { __typename?: 'Mutation', deletePost: string };

export type MergePostMutationVariables = Exact<{
  sourcePostId: Scalars['ID']['input'];
  targetPostId: Scalars['ID']['input'];
  mergeKeywords?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type MergePostMutation = { __typename?: 'Mutation', mergePost: number };

export type ReorderItemMutationVariables = Exact<{
  itemIds: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  postId: Scalars['ID']['input'];
}>;


export type ReorderItemMutation = { __typename?: 'Mutation', reorderItems: Array<string> };

export type MoveItemMutationVariables = Exact<{
  itemId: Scalars['ID']['input'];
  targetPostId: Scalars['ID']['input'];
  keepEmptyPost?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type MoveItemMutation = { __typename?: 'Mutation', moveItem: boolean };

export type TaskUpdatesSubscriptionVariables = Exact<{
  ids: Array<Scalars['String']['input']> | Scalars['String']['input'];
}>;


export type TaskUpdatesSubscription = { __typename?: 'Subscription', taskUpdates: { __typename?: 'TaskUpdate', kind: UpdateKind, item?: { __typename: 'AudioItem', caption: string, originalPath: string, compressedPath: string, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } } | { __typename: 'GifItem', caption: string, originalPath: string, compressedPath: string, relativeHeight: number, thumbnailPath?: string | null, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } } | { __typename: 'ImageItem', caption: string, originalPath: string, compressedPath: string, relativeHeight: number, thumbnailPath?: string | null, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } } | { __typename: 'ProcessingItem', taskProgress?: number | null, taskStatus: TaskStatus, taskNotes?: string | null, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } } | { __typename: 'VideoItem', caption: string, originalPath: string, compressedPath: string, relativeHeight: number, thumbnailPath?: string | null, createdAt: any, description: string, position: number, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } } | null } };

export type ChangeNameMutationVariables = Exact<{
  newName: Scalars['String']['input'];
}>;


export type ChangeNameMutation = { __typename?: 'Mutation', changeName: boolean };

export type ChangePasswordMutationVariables = Exact<{
  oldPassword: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
}>;


export type ChangePasswordMutation = { __typename?: 'Mutation', changePassword: boolean };

export type UploadPictureMutationVariables = Exact<{
  file: Scalars['Upload']['input'];
}>;


export type UploadPictureMutation = { __typename?: 'Mutation', uploadProfilePicture: boolean };

export type ClearProfilePictureMutationVariables = Exact<{ [key: string]: never; }>;


export type ClearProfilePictureMutation = { __typename?: 'Mutation', clearProfilePicture: boolean };

export type RevokeSessionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RevokeSessionMutation = { __typename?: 'Mutation', revokeSession: boolean };

export type LinkTelegramMutationVariables = Exact<{
  apiResponse: Scalars['String']['input'];
}>;


export type LinkTelegramMutation = { __typename?: 'Mutation', linkTelegram: boolean };

export type UnlinkTelegramMutationVariables = Exact<{ [key: string]: never; }>;


export type UnlinkTelegramMutation = { __typename?: 'Mutation', unlinkTelegram: boolean };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me?: { __typename?: 'User', name: string, username: string, profilePicture?: string | null, linkedTelegram?: boolean | null } | null };

export type UserQueryVariables = Exact<{
  username: Scalars['String']['input'];
}>;


export type UserQuery = { __typename?: 'Query', user?: { __typename?: 'User', id: string, username: string, name: string, profilePicture?: string | null, posts?: { __typename?: 'PostConnection', totalCount: number } | null } | null };

export type UsersQueryVariables = Exact<{
  after?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
}>;


export type UsersQuery = { __typename?: 'Query', users?: { __typename?: 'UserConnection', hasNextPage: boolean, endCursor?: string | null, nodes: Array<{ __typename?: 'User', id: string, username: string, name: string, profilePicture?: string | null, postCount: number }> } | null };

export type UserWithPostsQueryVariables = Exact<{
  username: Scalars['String']['input'];
  after?: InputMaybe<Scalars['String']['input']>;
  byContent?: InputMaybe<Scalars['String']['input']>;
}>;


export type UserWithPostsQuery = { __typename?: 'Query', user?: { __typename?: 'User', id: string, username: string, name: string, profilePicture?: string | null, postCount: number } | null, posts?: { __typename?: 'PostConnection', hasNextPage: boolean, endCursor?: string | null, startCursor?: string | null, nodes: Array<{ __typename?: 'Post', id: string, title: string, creator: { __typename?: 'User', profilePicture?: string | null, username: string }, items: { __typename?: 'ItemConnection', totalCount: number, nodes: Array<{ __typename: 'AudioItem', ampThumbnail: Array<number>, id: string } | { __typename: 'GifItem', relativeHeight: number, thumbnailPath?: string | null, id: string } | { __typename: 'ImageItem', relativeHeight: number, thumbnailPath?: string | null, id: string } | { __typename: 'ProcessingItem', id: string } | { __typename: 'VideoItem', relativeHeight: number, thumbnailPath?: string | null, id: string }> } }> } | null };

export const ItemDataFragmentDoc = gql`
    fragment ItemData on Item {
  __typename
  createdAt
  description
  position
  id
  creator {
    username
    profilePicture
  }
  ... on MediaItem {
    caption
    originalPath
    compressedPath
  }
  ... on VisualMediaItem {
    relativeHeight
    thumbnailPath
  }
  ... on ProcessingItem {
    taskProgress
    taskStatus
    taskNotes
  }
}
    `;
export const PostDataFragmentDoc = gql`
    fragment PostData on Post {
  id
  title
  language
  updatedAt
  createdAt
  creator {
    name
    username
    profilePicture
  }
  keywords {
    name
    id
  }
  items {
    nodes {
      ...ItemData
    }
  }
}
    ${ItemDataFragmentDoc}`;
export const PostsConnectionFragmentDoc = gql`
    fragment PostsConnection on PostConnection {
  nodes {
    id
    title
    creator {
      profilePicture
      username
    }
    items(first: 1) {
      totalCount
      nodes {
        id
        __typename
        ... on VisualMediaItem {
          relativeHeight
          thumbnailPath
        }
        ... on AudioItem {
          ampThumbnail
        }
      }
    }
  }
  hasNextPage
  endCursor
  startCursor
}
    `;
export const SettingsDocument = gql`
    query settings {
  me {
    name
    username
    profilePicture
    linkedTelegram
  }
  userSessions {
    createdAt
    firstIp
    id
    latestIp
    current
    userAgent
    updatedAt
  }
}
    `;
export const LoginDocument = gql`
    mutation login($username: String!, $password: String!) {
  login(username: $username, password: $password)
}
    `;
export const LogoutDocument = gql`
    mutation logout {
  logout
}
    `;
export const KeywordsDocument = gql`
    query Keywords($after: String, $byName: String) {
  keywords(first: 48, after: $after, sortByPostCount: true, byName: $byName) {
    nodes {
      id
      name
      postCount
    }
    hasNextPage
    endCursor
  }
}
    `;
export const KeywordSearchDocument = gql`
    query keywordSearch($input: String) {
  keywords(byName: $input) {
    nodes {
      id
      name
    }
  }
}
    `;
export const KeywordWithPostsDocument = gql`
    query KeywordWithPosts($nodeId: ID!, $after: String, $byContent: String) {
  keyword: node(id: $nodeId) {
    __typename
    ... on Keyword {
      name
      postCount
    }
  }
  posts(first: 24, after: $after, byContent: $byContent, byKeywords: [$nodeId]) {
    ...PostsConnection
  }
}
    ${PostsConnectionFragmentDoc}`;
export const CreateKeywordDocument = gql`
    mutation createKeyword($name: String!) {
  createKeyword(name: $name) {
    id
    name
  }
}
    `;
export const PostDocument = gql`
    query Post($id: ID!) {
  node(id: $id) {
    ... on Post {
      ...PostData
    }
  }
}
    ${PostDataFragmentDoc}`;
export const PostsDocument = gql`
    query Posts($after: String, $byContent: String, $byKeywords: [ID!], $byUsers: [String!]) {
  posts(
    first: 40
    after: $after
    byContent: $byContent
    byKeywords: $byKeywords
    byUsers: $byUsers
  ) {
    ...PostsConnection
  }
}
    ${PostsConnectionFragmentDoc}`;
export const PostsTextOnlyDocument = gql`
    query PostsTextOnly($after: String, $byContent: String) {
  posts(first: 20, after: $after, byContent: $byContent) {
    nodes {
      id
      title
    }
    hasNextPage
    endCursor
    startCursor
  }
}
    `;
export const CreatePostDocument = gql`
    mutation createPost($title: String!, $language: Language!, $keywords: [ID!]) {
  createPost(title: $title, language: $language, keywords: $keywords) {
    ...PostData
  }
}
    ${PostDataFragmentDoc}`;
export const EditPostDocument = gql`
    mutation editPost($id: ID!, $title: String!, $keywords: [ID!]!, $language: Language!, $items: [EditItemInput!], $newItems: [NewItemInput!]) {
  editPost(
    postId: $id
    title: $title
    keywords: $keywords
    language: $language
    items: $items
    newItems: $newItems
  ) {
    ...PostData
  }
}
    ${PostDataFragmentDoc}`;
export const DeleteItemDocument = gql`
    mutation deleteItem($deleteItemId: ID!) {
  deleteItem(itemId: $deleteItemId)
}
    `;
export const DeletePostDocument = gql`
    mutation deletePost($deletePostId: ID!) {
  deletePost(postId: $deletePostId)
}
    `;
export const MergePostDocument = gql`
    mutation mergePost($sourcePostId: ID!, $targetPostId: ID!, $mergeKeywords: Boolean) {
  mergePost(
    sourcePostId: $sourcePostId
    targetPostId: $targetPostId
    mergeKeywords: $mergeKeywords
  )
}
    `;
export const ReorderItemDocument = gql`
    mutation reorderItem($itemIds: [ID!]!, $postId: ID!) {
  reorderItems(itemIds: $itemIds, postId: $postId)
}
    `;
export const MoveItemDocument = gql`
    mutation moveItem($itemId: ID!, $targetPostId: ID!, $keepEmptyPost: Boolean) {
  moveItem(
    itemId: $itemId
    targetPostId: $targetPostId
    keepEmptyPost: $keepEmptyPost
  )
}
    `;
export const TaskUpdatesDocument = gql`
    subscription taskUpdates($ids: [String!]!) {
  taskUpdates(ids: $ids) {
    kind
    item {
      ...ItemData
    }
  }
}
    ${ItemDataFragmentDoc}`;
export const ChangeNameDocument = gql`
    mutation changeName($newName: String!) {
  changeName(newName: $newName)
}
    `;
export const ChangePasswordDocument = gql`
    mutation changePassword($oldPassword: String!, $newPassword: String!) {
  changePassword(oldPassword: $oldPassword, newPassword: $newPassword)
}
    `;
export const UploadPictureDocument = gql`
    mutation uploadPicture($file: Upload!) {
  uploadProfilePicture(file: $file)
}
    `;
export const ClearProfilePictureDocument = gql`
    mutation clearProfilePicture {
  clearProfilePicture
}
    `;
export const RevokeSessionDocument = gql`
    mutation revokeSession($id: ID!) {
  revokeSession(sessionId: $id)
}
    `;
export const LinkTelegramDocument = gql`
    mutation linkTelegram($apiResponse: String!) {
  linkTelegram(apiResponse: $apiResponse)
}
    `;
export const UnlinkTelegramDocument = gql`
    mutation unlinkTelegram {
  unlinkTelegram
}
    `;
export const MeDocument = gql`
    query me {
  me {
    name
    username
    profilePicture
    linkedTelegram
  }
}
    `;
export const UserDocument = gql`
    query User($username: String!) {
  user(username: $username) {
    id
    username
    name
    profilePicture
    posts {
      totalCount
    }
  }
}
    `;
export const UsersDocument = gql`
    query Users($after: String, $search: String) {
  users(first: 50, after: $after, search: $search, sortByPostCount: true) {
    nodes {
      id
      username
      name
      profilePicture
      postCount
    }
    hasNextPage
    endCursor
  }
}
    `;
export const UserWithPostsDocument = gql`
    query UserWithPosts($username: String!, $after: String, $byContent: String) {
  user(username: $username) {
    id
    username
    name
    profilePicture
    postCount
  }
  posts(first: 24, after: $after, byContent: $byContent, byUsers: [$username]) {
    ...PostsConnection
  }
}
    ${PostsConnectionFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();
const SettingsDocumentString = print(SettingsDocument);
const LoginDocumentString = print(LoginDocument);
const LogoutDocumentString = print(LogoutDocument);
const KeywordsDocumentString = print(KeywordsDocument);
const KeywordSearchDocumentString = print(KeywordSearchDocument);
const KeywordWithPostsDocumentString = print(KeywordWithPostsDocument);
const CreateKeywordDocumentString = print(CreateKeywordDocument);
const PostDocumentString = print(PostDocument);
const PostsDocumentString = print(PostsDocument);
const PostsTextOnlyDocumentString = print(PostsTextOnlyDocument);
const CreatePostDocumentString = print(CreatePostDocument);
const EditPostDocumentString = print(EditPostDocument);
const DeleteItemDocumentString = print(DeleteItemDocument);
const DeletePostDocumentString = print(DeletePostDocument);
const MergePostDocumentString = print(MergePostDocument);
const ReorderItemDocumentString = print(ReorderItemDocument);
const MoveItemDocumentString = print(MoveItemDocument);
const TaskUpdatesDocumentString = print(TaskUpdatesDocument);
const ChangeNameDocumentString = print(ChangeNameDocument);
const ChangePasswordDocumentString = print(ChangePasswordDocument);
const UploadPictureDocumentString = print(UploadPictureDocument);
const ClearProfilePictureDocumentString = print(ClearProfilePictureDocument);
const RevokeSessionDocumentString = print(RevokeSessionDocument);
const LinkTelegramDocumentString = print(LinkTelegramDocument);
const UnlinkTelegramDocumentString = print(UnlinkTelegramDocument);
const MeDocumentString = print(MeDocument);
const UserDocumentString = print(UserDocument);
const UsersDocumentString = print(UsersDocument);
const UserWithPostsDocumentString = print(UserWithPostsDocument);
export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    settings(variables?: SettingsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: SettingsQuery; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<SettingsQuery>(SettingsDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'settings', 'query', variables);
    },
    login(variables: LoginMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: LoginMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<LoginMutation>(LoginDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'login', 'mutation', variables);
    },
    logout(variables?: LogoutMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: LogoutMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<LogoutMutation>(LogoutDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'logout', 'mutation', variables);
    },
    Keywords(variables?: KeywordsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: KeywordsQuery; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<KeywordsQuery>(KeywordsDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'Keywords', 'query', variables);
    },
    keywordSearch(variables?: KeywordSearchQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: KeywordSearchQuery; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<KeywordSearchQuery>(KeywordSearchDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'keywordSearch', 'query', variables);
    },
    KeywordWithPosts(variables: KeywordWithPostsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: KeywordWithPostsQuery; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<KeywordWithPostsQuery>(KeywordWithPostsDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'KeywordWithPosts', 'query', variables);
    },
    createKeyword(variables: CreateKeywordMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: CreateKeywordMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<CreateKeywordMutation>(CreateKeywordDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'createKeyword', 'mutation', variables);
    },
    Post(variables: PostQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: PostQuery; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<PostQuery>(PostDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'Post', 'query', variables);
    },
    Posts(variables?: PostsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: PostsQuery; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<PostsQuery>(PostsDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'Posts', 'query', variables);
    },
    PostsTextOnly(variables?: PostsTextOnlyQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: PostsTextOnlyQuery; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<PostsTextOnlyQuery>(PostsTextOnlyDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'PostsTextOnly', 'query', variables);
    },
    createPost(variables: CreatePostMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: CreatePostMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<CreatePostMutation>(CreatePostDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'createPost', 'mutation', variables);
    },
    editPost(variables: EditPostMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: EditPostMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<EditPostMutation>(EditPostDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'editPost', 'mutation', variables);
    },
    deleteItem(variables: DeleteItemMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: DeleteItemMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<DeleteItemMutation>(DeleteItemDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteItem', 'mutation', variables);
    },
    deletePost(variables: DeletePostMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: DeletePostMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<DeletePostMutation>(DeletePostDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deletePost', 'mutation', variables);
    },
    mergePost(variables: MergePostMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: MergePostMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<MergePostMutation>(MergePostDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'mergePost', 'mutation', variables);
    },
    reorderItem(variables: ReorderItemMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: ReorderItemMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<ReorderItemMutation>(ReorderItemDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'reorderItem', 'mutation', variables);
    },
    moveItem(variables: MoveItemMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: MoveItemMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<MoveItemMutation>(MoveItemDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'moveItem', 'mutation', variables);
    },
    taskUpdates(variables: TaskUpdatesSubscriptionVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: TaskUpdatesSubscription; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<TaskUpdatesSubscription>(TaskUpdatesDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'taskUpdates', 'subscription', variables);
    },
    changeName(variables: ChangeNameMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: ChangeNameMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<ChangeNameMutation>(ChangeNameDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'changeName', 'mutation', variables);
    },
    changePassword(variables: ChangePasswordMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: ChangePasswordMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<ChangePasswordMutation>(ChangePasswordDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'changePassword', 'mutation', variables);
    },
    uploadPicture(variables: UploadPictureMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: UploadPictureMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<UploadPictureMutation>(UploadPictureDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'uploadPicture', 'mutation', variables);
    },
    clearProfilePicture(variables?: ClearProfilePictureMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: ClearProfilePictureMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<ClearProfilePictureMutation>(ClearProfilePictureDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'clearProfilePicture', 'mutation', variables);
    },
    revokeSession(variables: RevokeSessionMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: RevokeSessionMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<RevokeSessionMutation>(RevokeSessionDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'revokeSession', 'mutation', variables);
    },
    linkTelegram(variables: LinkTelegramMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: LinkTelegramMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<LinkTelegramMutation>(LinkTelegramDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'linkTelegram', 'mutation', variables);
    },
    unlinkTelegram(variables?: UnlinkTelegramMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: UnlinkTelegramMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<UnlinkTelegramMutation>(UnlinkTelegramDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'unlinkTelegram', 'mutation', variables);
    },
    me(variables?: MeQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: MeQuery; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<MeQuery>(MeDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'me', 'query', variables);
    },
    User(variables: UserQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: UserQuery; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<UserQuery>(UserDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'User', 'query', variables);
    },
    Users(variables?: UsersQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: UsersQuery; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<UsersQuery>(UsersDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'Users', 'query', variables);
    },
    UserWithPosts(variables: UserWithPostsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: UserWithPostsQuery; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<UserWithPostsQuery>(UserWithPostsDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'UserWithPosts', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;