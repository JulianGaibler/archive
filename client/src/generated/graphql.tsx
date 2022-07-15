/**
 * NOTE: THIS IS AN AUTO-GENERATED FILE!
 * DO NOT MODIFY IT DIRECTLY!
 *
 * Use `npm run generate` while the server is running to generate
 * this file again.
 */

/* eslint-disable */

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  /** A timestamp encoded as milliseconds since Unix Epoch in UTC. */
  DateTime: any;
  /** The `Upload` scalar type represents a file upload. */
  Upload: any;
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

/** An item belonging to a post. */
export type Item = Node & {
  __typename?: 'Item';
  /** Spoken or written words within an item. */
  caption?: Maybe<Scalars['String']>;
  /** Path where the compressed files are located without file-extension. */
  compressedPath?: Maybe<Scalars['String']>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime'];
  creator?: Maybe<User>;
  /** Text describing the item. */
  description?: Maybe<Scalars['String']>;
  /** The ID of an object */
  id: Scalars['ID'];
  lastEditBy?: Maybe<User>;
  /** Path where the original file is located. (with file-extension) */
  originalPath?: Maybe<Scalars['String']>;
  /** Items are ordered within a post. This denotes the unique position. */
  position: Scalars['Int'];
  /** Post to which this item belongs. */
  post?: Maybe<Post>;
  /** Height, relative to the width in percent. */
  relativeHeight?: Maybe<Scalars['Float']>;
  /** Path where the thumbnails are located without file-extension. */
  thumbnailPath?: Maybe<Scalars['String']>;
  type: Format;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime'];
};

/** A connection to a list of items. */
export type ItemConnection = {
  __typename?: 'ItemConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<ItemEdge>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type ItemEdge = {
  __typename?: 'ItemEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String'];
  /** The item at the end of the edge */
  node?: Maybe<Item>;
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

export type Mutation = {
  __typename?: 'Mutation';
  /** Changes the name of the current user. */
  changeName: Scalars['Boolean'];
  /** Changes the password of the current user. */
  changePassword: Scalars['Boolean'];
  /** Deletes the profile picture of the current user. */
  clearProfilePicture: Scalars['Boolean'];
  /** Creates a new Post */
  createPost: Post;
  /** Creates a new tag. */
  createTag: Tag;
  /** Deletes list of posts and returns list of the ones that were actually deleted. */
  deletePosts: Array<Scalars['ID']>;
  /** Deleted a tag. */
  deleteTag: Scalars['Boolean'];
  /** Edits a post. */
  editPost: Post;
  /** Associates the Telegram ID of a user with their Archive Profil. */
  linkTelegram: Scalars['Boolean'];
  /** Creates a new session for the user. */
  login: Scalars['Boolean'];
  /** Terminates the current users session. */
  logout: Scalars['Boolean'];
  /** Revokes the session of a user. */
  revokeSession: Scalars['Boolean'];
  /** Sets the user's dark-mode preference. */
  setDarkMode: Scalars['Boolean'];
  /** Creates a new user and performs a login. */
  signup: Scalars['Boolean'];
  /** Removed Telegram ID from Archive profile. */
  unlinkTelegram: Scalars['Boolean'];
  /** Sets the profile picture of the current user. */
  uploadProfilePicture: Scalars['Boolean'];
};


export type MutationChangeNameArgs = {
  newName: Scalars['String'];
};


export type MutationChangePasswordArgs = {
  newPassword: Scalars['String'];
  oldPassword: Scalars['String'];
};


export type MutationCreatePostArgs = {
  language: Language;
  tags?: InputMaybe<Array<Scalars['ID']>>;
  title: Scalars['String'];
};


export type MutationCreateTagArgs = {
  name: Scalars['String'];
};


export type MutationDeletePostsArgs = {
  ids: Array<Scalars['ID']>;
};


export type MutationDeleteTagArgs = {
  id: Scalars['String'];
};


export type MutationEditPostArgs = {
  id: Scalars['ID'];
  language?: InputMaybe<Language>;
  tags?: InputMaybe<Array<Scalars['ID']>>;
  title?: InputMaybe<Scalars['String']>;
};


export type MutationLinkTelegramArgs = {
  auth_date: Scalars['String'];
  first_name?: InputMaybe<Scalars['String']>;
  hash: Scalars['String'];
  id: Scalars['String'];
  last_name?: InputMaybe<Scalars['String']>;
  photo_url?: InputMaybe<Scalars['String']>;
  username?: InputMaybe<Scalars['String']>;
};


export type MutationLoginArgs = {
  password: Scalars['String'];
  username: Scalars['String'];
};


export type MutationRevokeSessionArgs = {
  id: Scalars['ID'];
};


export type MutationSetDarkModeArgs = {
  enabled: Scalars['Boolean'];
};


export type MutationSignupArgs = {
  name: Scalars['String'];
  password: Scalars['String'];
  username: Scalars['String'];
};


export type MutationUploadProfilePictureArgs = {
  file: Scalars['Upload'];
};

/** An object with an ID */
export type Node = {
  /** The id of the object. */
  id: Scalars['ID'];
};

/** Information about pagination in a connection. */
export type PageInfo = {
  __typename?: 'PageInfo';
  /** When paginating forwards, the cursor to continue. */
  endCursor?: Maybe<Scalars['String']>;
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean'];
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean'];
  /** When paginating backwards, the cursor to continue. */
  startCursor?: Maybe<Scalars['String']>;
};

/** A post. */
export type Post = Node & {
  __typename?: 'Post';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime'];
  creator?: Maybe<User>;
  /** The ID of an object */
  id: Scalars['ID'];
  /** Items in this post. */
  items?: Maybe<ItemConnection>;
  /** Language in which caption and title are written. */
  language?: Maybe<Language>;
  lastEditBy?: Maybe<User>;
  tags: Array<Tag>;
  title: Scalars['String'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime'];
};


/** A post. */
export type PostItemsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};

/** A connection to a list of items. */
export type PostConnection = {
  __typename?: 'PostConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<PostEdge>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  totalCount: Scalars['Int'];
};

/** An edge in a connection. */
export type PostEdge = {
  __typename?: 'PostEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String'];
  /** The item at the end of the edge */
  node?: Maybe<Post>;
};

export type Query = {
  __typename?: 'Query';
  /** Returns the currently authenticated user. */
  me?: Maybe<User>;
  /** Fetches an object given its ID */
  node?: Maybe<Node>;
  /** Fetches objects given their IDs */
  nodes: Array<Maybe<Node>>;
  /** Returns a list of posts. */
  posts?: Maybe<PostConnection>;
  /** Returns a list of tags. */
  tags?: Maybe<TagConnection>;
  /** Returns a list of tasks. */
  tasks?: Maybe<TaskConnection>;
  /** Returns user based on username */
  user?: Maybe<User>;
  /** Returns a list of sessions of the the currently authenticated user. */
  userSessions: Array<Session>;
  /** Returns a list of users. */
  users?: Maybe<UserConnection>;
};


export type QueryNodeArgs = {
  id: Scalars['ID'];
};


export type QueryNodesArgs = {
  ids: Array<Scalars['ID']>;
};


export type QueryPostsArgs = {
  after?: InputMaybe<Scalars['String']>;
  byContent?: InputMaybe<Scalars['String']>;
  byLanguage?: InputMaybe<Language>;
  byTags?: InputMaybe<Array<Scalars['ID']>>;
  byTypes?: InputMaybe<Array<Format>>;
  byUsers?: InputMaybe<Array<Scalars['ID']>>;
  first?: InputMaybe<Scalars['Int']>;
};


export type QueryTagsArgs = {
  after?: InputMaybe<Scalars['String']>;
  byName?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
};


export type QueryTasksArgs = {
  after?: InputMaybe<Scalars['String']>;
  byStatus?: InputMaybe<Array<TaskStatus>>;
  byUsers?: InputMaybe<Array<Scalars['ID']>>;
  first?: InputMaybe<Scalars['Int']>;
};


export type QueryUserArgs = {
  username: Scalars['String'];
};


export type QueryUsersArgs = {
  after?: InputMaybe<Scalars['String']>;
  byUsername?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
};

/** Represents a Session object of an user. */
export type Session = Node & {
  __typename?: 'Session';
  /** Identifies the date and time when the session was created. */
  createdAt: Scalars['DateTime'];
  /** IP with which the session was created. */
  firstIp: Scalars['String'];
  /** The ID of an object */
  id: Scalars['ID'];
  /** Last IP that used this session. */
  latestIp: Scalars['String'];
  /** Identifies the date and time when the session was last used. */
  updatedAt: Scalars['DateTime'];
  /** User associated with that session */
  user?: Maybe<User>;
  /** Last known User-Agent string of this session. */
  userAgent: Scalars['String'];
};

export type Subscription = {
  __typename?: 'Subscription';
  /** Returns updates from tasks. */
  taskUpdates: TaskUpdate;
};


export type SubscriptionTaskUpdatesArgs = {
  ids?: InputMaybe<Array<Scalars['String']>>;
};

/** A tag for categorizing Posts. */
export type Tag = Node & {
  __typename?: 'Tag';
  /** The ID of an object */
  id: Scalars['ID'];
  /** Identifies the tag name. */
  name: Scalars['String'];
  /** All Posts associated with this tag. */
  posts?: Maybe<PostConnection>;
};


/** A tag for categorizing Posts. */
export type TagPostsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};

/** A connection to a list of items. */
export type TagConnection = {
  __typename?: 'TagConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<TagEdge>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type TagEdge = {
  __typename?: 'TagEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String'];
  /** The item at the end of the edge */
  node?: Maybe<Tag>;
};

/** A task for an uploaded item. */
export type Task = Node & {
  __typename?: 'Task';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime'];
  createdItem?: Maybe<Item>;
  /** File Extension of original File */
  ext: Scalars['String'];
  /** The ID of an object */
  id: Scalars['ID'];
  /** Notes created while processing, usually used for debugging. */
  notes: Scalars['String'];
  /** Current progress of the task. */
  progress?: Maybe<Scalars['Int']>;
  /** Current status of the task. */
  status: TaskStatus;
  /** Identifies the date and time when the object was last updated.. */
  updatedAt: Scalars['DateTime'];
  uploader?: Maybe<User>;
};

/** A connection to a list of items. */
export type TaskConnection = {
  __typename?: 'TaskConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<TaskEdge>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type TaskEdge = {
  __typename?: 'TaskEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String'];
  /** The item at the end of the edge */
  node?: Maybe<Task>;
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
  id: Scalars['ID'];
  /** Indicates what kind of update this is. */
  kind: UpdateKind;
  /** The updated or created task. */
  task?: Maybe<Task>;
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
  /** If the user prefers dark-mode. */
  darkMode?: Maybe<Scalars['Boolean']>;
  /** The ID of an object */
  id: Scalars['ID'];
  /** Shows if the user has a connected Telegram Account. */
  linkedTelegram?: Maybe<Scalars['Boolean']>;
  /** The user's profile name. */
  name: Scalars['String'];
  /** All Posts associated with this user. */
  posts?: Maybe<PostConnection>;
  /** Name of the user's profile picture. */
  profilePicture?: Maybe<Scalars['String']>;
  /**  The username used to login. */
  username: Scalars['String'];
};


/** A user is an account that can make new content. */
export type UserPostsArgs = {
  after?: InputMaybe<Scalars['String']>;
  before?: InputMaybe<Scalars['String']>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};

/** A connection to a list of items. */
export type UserConnection = {
  __typename?: 'UserConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<UserEdge>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type UserEdge = {
  __typename?: 'UserEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String'];
  /** The item at the end of the edge */
  node?: Maybe<User>;
};

export type ChangeNameMutationVariables = Exact<{
  newName: Scalars['String'];
}>;


export type ChangeNameMutation = { __typename?: 'Mutation', changeName: boolean };

export type ChangePasswordMutationVariables = Exact<{
  oldPassword: Scalars['String'];
  newPassword: Scalars['String'];
}>;


export type ChangePasswordMutation = { __typename?: 'Mutation', changePassword: boolean };

export type ClearProfilePictureMutationVariables = Exact<{ [key: string]: never; }>;


export type ClearProfilePictureMutation = { __typename?: 'Mutation', clearProfilePicture: boolean };

export type LinkTelegramMutationVariables = Exact<{
  id: Scalars['String'];
  first_name?: InputMaybe<Scalars['String']>;
  last_name?: InputMaybe<Scalars['String']>;
  username?: InputMaybe<Scalars['String']>;
  photo_url?: InputMaybe<Scalars['String']>;
  auth_date: Scalars['String'];
  hash: Scalars['String'];
}>;


export type LinkTelegramMutation = { __typename?: 'Mutation', linkTelegram: boolean };

export type LoginMutationVariables = Exact<{
  username: Scalars['String'];
  password: Scalars['String'];
}>;


export type LoginMutation = { __typename?: 'Mutation', login: boolean };

export type LogoutMutationVariables = Exact<{ [key: string]: never; }>;


export type LogoutMutation = { __typename?: 'Mutation', logout: boolean };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me?: { __typename?: 'User', name: string, username: string, profilePicture?: string | null, darkMode?: boolean | null } | null };

export type PostQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type PostQuery = { __typename?: 'Query', node?: { __typename?: 'Item', id: string } | { __typename?: 'Post', title: string, language?: Language | null, createdAt: any, id: string, tags: Array<{ __typename?: 'Tag', id: string, name: string }>, creator?: { __typename?: 'User', id: string, name: string, username: string, profilePicture?: string | null } | null, items?: { __typename?: 'ItemConnection', edges?: Array<{ __typename?: 'ItemEdge', node?: { __typename?: 'Item', id: string, type: Format, createdAt: any, description?: string | null, caption?: string | null, compressedPath?: string | null, creator?: { __typename?: 'User', id: string, name: string, username: string, profilePicture?: string | null } | null } | null } | null> | null } | null } | { __typename?: 'Session', id: string } | { __typename?: 'Tag', id: string } | { __typename?: 'Task', id: string } | { __typename?: 'User', id: string } | null };

export type PostsQueryVariables = Exact<{ [key: string]: never; }>;


export type PostsQuery = { __typename?: 'Query', posts?: { __typename?: 'PostConnection', edges?: Array<{ __typename?: 'PostEdge', node?: { __typename?: 'Post', id: string, title: string, creator?: { __typename?: 'User', profilePicture?: string | null } | null, items?: { __typename?: 'ItemConnection', totalCount: number, edges?: Array<{ __typename?: 'ItemEdge', node?: { __typename?: 'Item', id: string, type: Format, thumbnailPath?: string | null, relativeHeight?: number | null } | null } | null> | null } | null } | null } | null> | null } | null };

export type RevokeSessionMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type RevokeSessionMutation = { __typename?: 'Mutation', revokeSession: boolean };

export type SetDarkModeMutationVariables = Exact<{
  enabled: Scalars['Boolean'];
}>;


export type SetDarkModeMutation = { __typename?: 'Mutation', setDarkMode: boolean };

export type TagSearchQueryVariables = Exact<{
  input?: InputMaybe<Scalars['String']>;
}>;


export type TagSearchQuery = { __typename?: 'Query', tags?: { __typename?: 'TagConnection', edges?: Array<{ __typename?: 'TagEdge', node?: { __typename?: 'Tag', id: string, name: string } | null } | null> | null } | null };

export type UnlinkTelegramMutationVariables = Exact<{ [key: string]: never; }>;


export type UnlinkTelegramMutation = { __typename?: 'Mutation', unlinkTelegram: boolean };


export const ChangeNameDocument = gql`
    mutation changeName($newName: String!) {
  changeName(newName: $newName)
}
    `;
export type ChangeNameMutationFn = Apollo.MutationFunction<ChangeNameMutation, ChangeNameMutationVariables>;

/**
 * __useChangeNameMutation__
 *
 * To run a mutation, you first call `useChangeNameMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useChangeNameMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [changeNameMutation, { data, loading, error }] = useChangeNameMutation({
 *   variables: {
 *      newName: // value for 'newName'
 *   },
 * });
 */
export function useChangeNameMutation(baseOptions?: Apollo.MutationHookOptions<ChangeNameMutation, ChangeNameMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ChangeNameMutation, ChangeNameMutationVariables>(ChangeNameDocument, options);
      }
export type ChangeNameMutationHookResult = ReturnType<typeof useChangeNameMutation>;
export type ChangeNameMutationResult = Apollo.MutationResult<ChangeNameMutation>;
export type ChangeNameMutationOptions = Apollo.BaseMutationOptions<ChangeNameMutation, ChangeNameMutationVariables>;
export const ChangePasswordDocument = gql`
    mutation changePassword($oldPassword: String!, $newPassword: String!) {
  changePassword(oldPassword: $oldPassword, newPassword: $newPassword)
}
    `;
export type ChangePasswordMutationFn = Apollo.MutationFunction<ChangePasswordMutation, ChangePasswordMutationVariables>;

/**
 * __useChangePasswordMutation__
 *
 * To run a mutation, you first call `useChangePasswordMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useChangePasswordMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [changePasswordMutation, { data, loading, error }] = useChangePasswordMutation({
 *   variables: {
 *      oldPassword: // value for 'oldPassword'
 *      newPassword: // value for 'newPassword'
 *   },
 * });
 */
export function useChangePasswordMutation(baseOptions?: Apollo.MutationHookOptions<ChangePasswordMutation, ChangePasswordMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ChangePasswordMutation, ChangePasswordMutationVariables>(ChangePasswordDocument, options);
      }
export type ChangePasswordMutationHookResult = ReturnType<typeof useChangePasswordMutation>;
export type ChangePasswordMutationResult = Apollo.MutationResult<ChangePasswordMutation>;
export type ChangePasswordMutationOptions = Apollo.BaseMutationOptions<ChangePasswordMutation, ChangePasswordMutationVariables>;
export const ClearProfilePictureDocument = gql`
    mutation clearProfilePicture {
  clearProfilePicture
}
    `;
export type ClearProfilePictureMutationFn = Apollo.MutationFunction<ClearProfilePictureMutation, ClearProfilePictureMutationVariables>;

/**
 * __useClearProfilePictureMutation__
 *
 * To run a mutation, you first call `useClearProfilePictureMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useClearProfilePictureMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [clearProfilePictureMutation, { data, loading, error }] = useClearProfilePictureMutation({
 *   variables: {
 *   },
 * });
 */
export function useClearProfilePictureMutation(baseOptions?: Apollo.MutationHookOptions<ClearProfilePictureMutation, ClearProfilePictureMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ClearProfilePictureMutation, ClearProfilePictureMutationVariables>(ClearProfilePictureDocument, options);
      }
export type ClearProfilePictureMutationHookResult = ReturnType<typeof useClearProfilePictureMutation>;
export type ClearProfilePictureMutationResult = Apollo.MutationResult<ClearProfilePictureMutation>;
export type ClearProfilePictureMutationOptions = Apollo.BaseMutationOptions<ClearProfilePictureMutation, ClearProfilePictureMutationVariables>;
export const LinkTelegramDocument = gql`
    mutation linkTelegram($id: String!, $first_name: String, $last_name: String, $username: String, $photo_url: String, $auth_date: String!, $hash: String!) {
  linkTelegram(
    id: $id
    first_name: $first_name
    last_name: $last_name
    username: $username
    photo_url: $photo_url
    auth_date: $auth_date
    hash: $hash
  )
}
    `;
export type LinkTelegramMutationFn = Apollo.MutationFunction<LinkTelegramMutation, LinkTelegramMutationVariables>;

/**
 * __useLinkTelegramMutation__
 *
 * To run a mutation, you first call `useLinkTelegramMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLinkTelegramMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [linkTelegramMutation, { data, loading, error }] = useLinkTelegramMutation({
 *   variables: {
 *      id: // value for 'id'
 *      first_name: // value for 'first_name'
 *      last_name: // value for 'last_name'
 *      username: // value for 'username'
 *      photo_url: // value for 'photo_url'
 *      auth_date: // value for 'auth_date'
 *      hash: // value for 'hash'
 *   },
 * });
 */
export function useLinkTelegramMutation(baseOptions?: Apollo.MutationHookOptions<LinkTelegramMutation, LinkTelegramMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LinkTelegramMutation, LinkTelegramMutationVariables>(LinkTelegramDocument, options);
      }
export type LinkTelegramMutationHookResult = ReturnType<typeof useLinkTelegramMutation>;
export type LinkTelegramMutationResult = Apollo.MutationResult<LinkTelegramMutation>;
export type LinkTelegramMutationOptions = Apollo.BaseMutationOptions<LinkTelegramMutation, LinkTelegramMutationVariables>;
export const LoginDocument = gql`
    mutation login($username: String!, $password: String!) {
  login(username: $username, password: $password)
}
    `;
export type LoginMutationFn = Apollo.MutationFunction<LoginMutation, LoginMutationVariables>;

/**
 * __useLoginMutation__
 *
 * To run a mutation, you first call `useLoginMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLoginMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [loginMutation, { data, loading, error }] = useLoginMutation({
 *   variables: {
 *      username: // value for 'username'
 *      password: // value for 'password'
 *   },
 * });
 */
export function useLoginMutation(baseOptions?: Apollo.MutationHookOptions<LoginMutation, LoginMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LoginMutation, LoginMutationVariables>(LoginDocument, options);
      }
export type LoginMutationHookResult = ReturnType<typeof useLoginMutation>;
export type LoginMutationResult = Apollo.MutationResult<LoginMutation>;
export type LoginMutationOptions = Apollo.BaseMutationOptions<LoginMutation, LoginMutationVariables>;
export const LogoutDocument = gql`
    mutation logout {
  logout
}
    `;
export type LogoutMutationFn = Apollo.MutationFunction<LogoutMutation, LogoutMutationVariables>;

/**
 * __useLogoutMutation__
 *
 * To run a mutation, you first call `useLogoutMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLogoutMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [logoutMutation, { data, loading, error }] = useLogoutMutation({
 *   variables: {
 *   },
 * });
 */
export function useLogoutMutation(baseOptions?: Apollo.MutationHookOptions<LogoutMutation, LogoutMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LogoutMutation, LogoutMutationVariables>(LogoutDocument, options);
      }
export type LogoutMutationHookResult = ReturnType<typeof useLogoutMutation>;
export type LogoutMutationResult = Apollo.MutationResult<LogoutMutation>;
export type LogoutMutationOptions = Apollo.BaseMutationOptions<LogoutMutation, LogoutMutationVariables>;
export const MeDocument = gql`
    query me {
  me {
    name
    username
    profilePicture
    darkMode
  }
}
    `;

/**
 * __useMeQuery__
 *
 * To run a query within a React component, call `useMeQuery` and pass it any options that fit your needs.
 * When your component renders, `useMeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMeQuery({
 *   variables: {
 *   },
 * });
 */
export function useMeQuery(baseOptions?: Apollo.QueryHookOptions<MeQuery, MeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MeQuery, MeQueryVariables>(MeDocument, options);
      }
export function useMeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MeQuery, MeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MeQuery, MeQueryVariables>(MeDocument, options);
        }
export type MeQueryHookResult = ReturnType<typeof useMeQuery>;
export type MeLazyQueryHookResult = ReturnType<typeof useMeLazyQuery>;
export type MeQueryResult = Apollo.QueryResult<MeQuery, MeQueryVariables>;
export const PostDocument = gql`
    query Post($id: ID!) {
  node(id: $id) {
    id
    ... on Post {
      title
      language
      createdAt
      tags {
        id
        name
      }
      creator {
        id
        name
        username
        profilePicture
      }
      items {
        edges {
          node {
            id
            type
            createdAt
            creator {
              id
              name
              username
              profilePicture
            }
            description
            caption
            compressedPath
          }
        }
      }
    }
  }
}
    `;

/**
 * __usePostQuery__
 *
 * To run a query within a React component, call `usePostQuery` and pass it any options that fit your needs.
 * When your component renders, `usePostQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePostQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function usePostQuery(baseOptions: Apollo.QueryHookOptions<PostQuery, PostQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PostQuery, PostQueryVariables>(PostDocument, options);
      }
export function usePostLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PostQuery, PostQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PostQuery, PostQueryVariables>(PostDocument, options);
        }
export type PostQueryHookResult = ReturnType<typeof usePostQuery>;
export type PostLazyQueryHookResult = ReturnType<typeof usePostLazyQuery>;
export type PostQueryResult = Apollo.QueryResult<PostQuery, PostQueryVariables>;
export const PostsDocument = gql`
    query Posts {
  posts(first: 40) {
    edges {
      node {
        id
        title
        creator {
          profilePicture
        }
        items(first: 1) {
          totalCount
          edges {
            node {
              id
              type
              thumbnailPath
              relativeHeight
            }
          }
        }
      }
    }
  }
}
    `;

/**
 * __usePostsQuery__
 *
 * To run a query within a React component, call `usePostsQuery` and pass it any options that fit your needs.
 * When your component renders, `usePostsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePostsQuery({
 *   variables: {
 *   },
 * });
 */
export function usePostsQuery(baseOptions?: Apollo.QueryHookOptions<PostsQuery, PostsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PostsQuery, PostsQueryVariables>(PostsDocument, options);
      }
export function usePostsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PostsQuery, PostsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PostsQuery, PostsQueryVariables>(PostsDocument, options);
        }
export type PostsQueryHookResult = ReturnType<typeof usePostsQuery>;
export type PostsLazyQueryHookResult = ReturnType<typeof usePostsLazyQuery>;
export type PostsQueryResult = Apollo.QueryResult<PostsQuery, PostsQueryVariables>;
export const RevokeSessionDocument = gql`
    mutation revokeSession($id: ID!) {
  revokeSession(id: $id)
}
    `;
export type RevokeSessionMutationFn = Apollo.MutationFunction<RevokeSessionMutation, RevokeSessionMutationVariables>;

/**
 * __useRevokeSessionMutation__
 *
 * To run a mutation, you first call `useRevokeSessionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRevokeSessionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [revokeSessionMutation, { data, loading, error }] = useRevokeSessionMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRevokeSessionMutation(baseOptions?: Apollo.MutationHookOptions<RevokeSessionMutation, RevokeSessionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RevokeSessionMutation, RevokeSessionMutationVariables>(RevokeSessionDocument, options);
      }
export type RevokeSessionMutationHookResult = ReturnType<typeof useRevokeSessionMutation>;
export type RevokeSessionMutationResult = Apollo.MutationResult<RevokeSessionMutation>;
export type RevokeSessionMutationOptions = Apollo.BaseMutationOptions<RevokeSessionMutation, RevokeSessionMutationVariables>;
export const SetDarkModeDocument = gql`
    mutation setDarkMode($enabled: Boolean!) {
  setDarkMode(enabled: $enabled)
}
    `;
export type SetDarkModeMutationFn = Apollo.MutationFunction<SetDarkModeMutation, SetDarkModeMutationVariables>;

/**
 * __useSetDarkModeMutation__
 *
 * To run a mutation, you first call `useSetDarkModeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetDarkModeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setDarkModeMutation, { data, loading, error }] = useSetDarkModeMutation({
 *   variables: {
 *      enabled: // value for 'enabled'
 *   },
 * });
 */
export function useSetDarkModeMutation(baseOptions?: Apollo.MutationHookOptions<SetDarkModeMutation, SetDarkModeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SetDarkModeMutation, SetDarkModeMutationVariables>(SetDarkModeDocument, options);
      }
export type SetDarkModeMutationHookResult = ReturnType<typeof useSetDarkModeMutation>;
export type SetDarkModeMutationResult = Apollo.MutationResult<SetDarkModeMutation>;
export type SetDarkModeMutationOptions = Apollo.BaseMutationOptions<SetDarkModeMutation, SetDarkModeMutationVariables>;
export const TagSearchDocument = gql`
    query tagSearch($input: String) {
  tags(byName: $input) {
    edges {
      node {
        id
        name
      }
    }
  }
}
    `;

/**
 * __useTagSearchQuery__
 *
 * To run a query within a React component, call `useTagSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useTagSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTagSearchQuery({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useTagSearchQuery(baseOptions?: Apollo.QueryHookOptions<TagSearchQuery, TagSearchQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TagSearchQuery, TagSearchQueryVariables>(TagSearchDocument, options);
      }
export function useTagSearchLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TagSearchQuery, TagSearchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TagSearchQuery, TagSearchQueryVariables>(TagSearchDocument, options);
        }
export type TagSearchQueryHookResult = ReturnType<typeof useTagSearchQuery>;
export type TagSearchLazyQueryHookResult = ReturnType<typeof useTagSearchLazyQuery>;
export type TagSearchQueryResult = Apollo.QueryResult<TagSearchQuery, TagSearchQueryVariables>;
export const UnlinkTelegramDocument = gql`
    mutation unlinkTelegram {
  unlinkTelegram
}
    `;
export type UnlinkTelegramMutationFn = Apollo.MutationFunction<UnlinkTelegramMutation, UnlinkTelegramMutationVariables>;

/**
 * __useUnlinkTelegramMutation__
 *
 * To run a mutation, you first call `useUnlinkTelegramMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnlinkTelegramMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unlinkTelegramMutation, { data, loading, error }] = useUnlinkTelegramMutation({
 *   variables: {
 *   },
 * });
 */
export function useUnlinkTelegramMutation(baseOptions?: Apollo.MutationHookOptions<UnlinkTelegramMutation, UnlinkTelegramMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UnlinkTelegramMutation, UnlinkTelegramMutationVariables>(UnlinkTelegramDocument, options);
      }
export type UnlinkTelegramMutationHookResult = ReturnType<typeof useUnlinkTelegramMutation>;
export type UnlinkTelegramMutationResult = Apollo.MutationResult<UnlinkTelegramMutation>;
export type UnlinkTelegramMutationOptions = Apollo.BaseMutationOptions<UnlinkTelegramMutation, UnlinkTelegramMutationVariables>;