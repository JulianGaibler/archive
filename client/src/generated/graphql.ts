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
  caption?: Maybe<Scalars['String']['output']>;
  /** Path where the compressed files are located without file-extension. */
  compressedPath?: Maybe<Scalars['String']['output']>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  creator: User;
  /** Text describing the item. */
  description?: Maybe<Scalars['String']['output']>;
  /** The ID of an object */
  id: Scalars['ID']['output'];
  /** Path where the original file is located. (with file-extension) */
  originalPath?: Maybe<Scalars['String']['output']>;
  /** Items are ordered within a post. This denotes the unique position. */
  position: Scalars['Int']['output'];
  /** Post to which this item belongs. */
  post?: Maybe<Post>;
  /** Height, relative to the width in percent. */
  relativeHeight?: Maybe<Scalars['Float']['output']>;
  /** Path where the thumbnails are located without file-extension. */
  thumbnailPath?: Maybe<Scalars['String']['output']>;
  type: Format;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

/** A connection to a list of items. */
export type ItemConnection = {
  __typename?: 'ItemConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<ItemEdge>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

/** An edge in a connection. */
export type ItemEdge = {
  __typename?: 'ItemEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: Item;
};

/** A keyword for categorizing Posts. */
export type Keyword = Node & {
  __typename?: 'Keyword';
  /** The ID of an object */
  id: Scalars['ID']['output'];
  /** Identifies the keyword name. */
  name: Scalars['String']['output'];
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

/** A connection to a list of items. */
export type KeywordConnection = {
  __typename?: 'KeywordConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<KeywordEdge>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type KeywordEdge = {
  __typename?: 'KeywordEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: Keyword;
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
  changeName: Scalars['Boolean']['output'];
  /** Changes the password of the current user. */
  changePassword: Scalars['Boolean']['output'];
  /** Deletes the profile picture of the current user. */
  clearProfilePicture: Scalars['Boolean']['output'];
  /** Creates a new keyword. */
  createKeyword: Keyword;
  /** Creates a new Post */
  createPost: Post;
  /** Deleted a keyword. */
  deleteKeyword: Scalars['Boolean']['output'];
  /** Deletes list of posts and returns list of the ones that were actually deleted. */
  deletePosts: Array<Scalars['ID']['output']>;
  /** Edits a post. */
  editPost: Post;
  /** Associates the Telegram ID of a user with their Archive Profil. */
  linkTelegram: Scalars['Boolean']['output'];
  /** Creates a new session for the user. */
  login: Scalars['Boolean']['output'];
  /** Terminates the current users session. */
  logout: Scalars['Boolean']['output'];
  /** Revokes the session of a user. */
  revokeSession: Scalars['Boolean']['output'];
  /** Sets the user's dark-mode preference. */
  setDarkMode: Scalars['Boolean']['output'];
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


export type MutationDeleteKeywordArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeletePostsArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type MutationEditPostArgs = {
  id: Scalars['ID']['input'];
  keywords?: InputMaybe<Array<Scalars['ID']['input']>>;
  language?: InputMaybe<Language>;
  title?: InputMaybe<Scalars['String']['input']>;
};


export type MutationLinkTelegramArgs = {
  auth_date: Scalars['String']['input'];
  first_name?: InputMaybe<Scalars['String']['input']>;
  hash: Scalars['String']['input'];
  id: Scalars['String']['input'];
  last_name?: InputMaybe<Scalars['String']['input']>;
  photo_url?: InputMaybe<Scalars['String']['input']>;
  username?: InputMaybe<Scalars['String']['input']>;
};


export type MutationLoginArgs = {
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};


export type MutationRevokeSessionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSetDarkModeArgs = {
  enabled: Scalars['Boolean']['input'];
};


export type MutationSignupArgs = {
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};


export type MutationUploadProfilePictureArgs = {
  file: Scalars['Upload']['input'];
};

/** An object with an ID */
export type Node = {
  /** The id of the object. */
  id: Scalars['ID']['output'];
};

/** Information about pagination in a connection. */
export type PageInfo = {
  __typename?: 'PageInfo';
  /** When paginating forwards, the cursor to continue. */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean']['output'];
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** When paginating backwards, the cursor to continue. */
  startCursor?: Maybe<Scalars['String']['output']>;
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

/** A connection to a list of items. */
export type PostConnection = {
  __typename?: 'PostConnection';
  /** A list of edges. */
  edges?: Maybe<Array<Maybe<PostEdge>>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

/** An edge in a connection. */
export type PostEdge = {
  __typename?: 'PostEdge';
  /** A cursor for use in pagination */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: Post;
};

export type Query = {
  __typename?: 'Query';
  /** Returns a list of keywords. */
  keywords?: Maybe<KeywordConnection>;
  /** Returns the currently authenticated user. */
  me?: Maybe<User>;
  /** Fetches an object given its ID */
  node?: Maybe<Node>;
  /** Fetches objects given their IDs */
  nodes: Array<Maybe<Node>>;
  /** Returns a list of posts. */
  posts?: Maybe<PostConnection>;
  /** Returns information about the location of the actual files. */
  resources?: Maybe<Resources>;
  /** Returns a list of tasks. */
  tasks?: Maybe<TaskConnection>;
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
  byUsers?: InputMaybe<Array<Scalars['ID']['input']>>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryTasksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  byStatus?: InputMaybe<Array<TaskStatus>>;
  byUsers?: InputMaybe<Array<Scalars['ID']['input']>>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryUserArgs = {
  username: Scalars['String']['input'];
};


export type QueryUsersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  byUsername?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};

/** A keyword for categorizing Posts. */
export type Resources = {
  __typename?: 'Resources';
  /** The domain on which the resources are stored */
  resourceDomain: Scalars['String']['output'];
  /** The path that leads to the resources. */
  resourcePath: Scalars['String']['output'];
};

/** Represents a Session object of an user. */
export type Session = Node & {
  __typename?: 'Session';
  /** Identifies the date and time when the session was created. */
  createdAt: Scalars['DateTime']['output'];
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
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** A task for an uploaded item. */
export type Task = Node & {
  __typename?: 'Task';
  addToPost?: Maybe<Post>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  createdItem?: Maybe<Item>;
  /** File Extension of original File */
  ext: Scalars['String']['output'];
  /** The ID of an object */
  id: Scalars['ID']['output'];
  /** Notes created while processing, usually used for debugging. */
  notes: Scalars['String']['output'];
  /** Current progress of the task. */
  progress?: Maybe<Scalars['Int']['output']>;
  /** Current status of the task. */
  status: TaskStatus;
  /** Identifies the date and time when the object was last updated.. */
  updatedAt: Scalars['DateTime']['output'];
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
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: Task;
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
  darkMode?: Maybe<Scalars['Boolean']['output']>;
  /** The ID of an object */
  id: Scalars['ID']['output'];
  /** Shows if the user has a connected Telegram Account. */
  linkedTelegram?: Maybe<Scalars['Boolean']['output']>;
  /** The user's profile name. */
  name: Scalars['String']['output'];
  /** All Posts associated with this user. */
  posts?: Maybe<PostConnection>;
  /** Name of the user's profile picture. */
  profilePicture?: Maybe<Scalars['String']['output']>;
  /**  The username used to login. */
  username: Scalars['String']['output'];
};


/** A user is an account that can make new content. */
export type UserPostsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
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
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge */
  node: User;
};

export type ChangeNameMutationVariables = Exact<{
  newName: Scalars['String']['input'];
}>;


export type ChangeNameMutation = { __typename?: 'Mutation', changeName: boolean };

export type ChangePasswordMutationVariables = Exact<{
  oldPassword: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
}>;


export type ChangePasswordMutation = { __typename?: 'Mutation', changePassword: boolean };

export type ClearProfilePictureMutationVariables = Exact<{ [key: string]: never; }>;


export type ClearProfilePictureMutation = { __typename?: 'Mutation', clearProfilePicture: boolean };

export type KeywordSearchQueryVariables = Exact<{
  input?: InputMaybe<Scalars['String']['input']>;
}>;


export type KeywordSearchQuery = { __typename?: 'Query', keywords?: { __typename?: 'KeywordConnection', edges?: Array<{ __typename?: 'KeywordEdge', node: { __typename?: 'Keyword', id: string, name: string } } | null> | null } | null };

export type LinkTelegramMutationVariables = Exact<{
  id: Scalars['String']['input'];
  first_name?: InputMaybe<Scalars['String']['input']>;
  last_name?: InputMaybe<Scalars['String']['input']>;
  username?: InputMaybe<Scalars['String']['input']>;
  photo_url?: InputMaybe<Scalars['String']['input']>;
  auth_date: Scalars['String']['input'];
  hash: Scalars['String']['input'];
}>;


export type LinkTelegramMutation = { __typename?: 'Mutation', linkTelegram: boolean };

export type LoginMutationVariables = Exact<{
  username: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;


export type LoginMutation = { __typename?: 'Mutation', login: boolean };

export type LogoutMutationVariables = Exact<{ [key: string]: never; }>;


export type LogoutMutation = { __typename?: 'Mutation', logout: boolean };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me?: { __typename?: 'User', name: string, username: string, profilePicture?: string | null, darkMode?: boolean | null } | null };

export type PostQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type PostQuery = { __typename?: 'Query', node?: { __typename?: 'Item' } | { __typename?: 'Keyword' } | { __typename?: 'Post', id: string, title: string, language: Language, updatedAt: any, createdAt: any, creator: { __typename?: 'User', name: string, username: string, profilePicture?: string | null }, keywords: Array<{ __typename?: 'Keyword', name: string, id: string }>, items: { __typename?: 'ItemConnection', edges?: Array<{ __typename?: 'ItemEdge', node: { __typename?: 'Item', caption?: string | null, compressedPath?: string | null, createdAt: any, description?: string | null, type: Format, relativeHeight?: number | null, position: number, originalPath?: string | null, id: string, creator: { __typename?: 'User', username: string, profilePicture?: string | null } } } | null> | null } } | { __typename?: 'Session' } | { __typename?: 'Task' } | { __typename?: 'User' } | null };

export type PostsQueryVariables = Exact<{
  after?: InputMaybe<Scalars['String']['input']>;
  byContent?: InputMaybe<Scalars['String']['input']>;
}>;


export type PostsQuery = { __typename?: 'Query', posts?: { __typename?: 'PostConnection', edges?: Array<{ __typename?: 'PostEdge', node: { __typename?: 'Post', id: string, title: string, creator: { __typename?: 'User', profilePicture?: string | null, username: string }, items: { __typename?: 'ItemConnection', totalCount: number, edges?: Array<{ __typename?: 'ItemEdge', node: { __typename?: 'Item', id: string, type: Format, thumbnailPath?: string | null, relativeHeight?: number | null } } | null> | null } } } | null> | null, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null, startCursor?: string | null } } | null };

export type ResourcesQueryVariables = Exact<{ [key: string]: never; }>;


export type ResourcesQuery = { __typename?: 'Query', resources?: { __typename?: 'Resources', resourceDomain: string, resourcePath: string } | null };

export type RevokeSessionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RevokeSessionMutation = { __typename?: 'Mutation', revokeSession: boolean };

export type SetDarkModeMutationVariables = Exact<{
  enabled: Scalars['Boolean']['input'];
}>;


export type SetDarkModeMutation = { __typename?: 'Mutation', setDarkMode: boolean };

export type UnlinkTelegramMutationVariables = Exact<{ [key: string]: never; }>;


export type UnlinkTelegramMutation = { __typename?: 'Mutation', unlinkTelegram: boolean };

export type UploadPictureMutationVariables = Exact<{
  file: Scalars['Upload']['input'];
}>;


export type UploadPictureMutation = { __typename?: 'Mutation', uploadProfilePicture: boolean };


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
export const ClearProfilePictureDocument = gql`
    mutation clearProfilePicture {
  clearProfilePicture
}
    `;
export const KeywordSearchDocument = gql`
    query keywordSearch($input: String) {
  keywords(byName: $input) {
    edges {
      node {
        id
        name
      }
    }
  }
}
    `;
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
export const PostDocument = gql`
    query Post($id: ID!) {
  node(id: $id) {
    ... on Post {
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
        edges {
          node {
            caption
            compressedPath
            createdAt
            description
            type
            relativeHeight
            position
            originalPath
            id
            creator {
              username
              profilePicture
            }
          }
        }
      }
    }
  }
}
    `;
export const PostsDocument = gql`
    query Posts($after: String, $byContent: String) {
  posts(first: 40, after: $after, byContent: $byContent) {
    edges {
      node {
        id
        title
        creator {
          profilePicture
          username
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
    pageInfo {
      hasNextPage
      endCursor
      startCursor
    }
  }
}
    `;
export const ResourcesDocument = gql`
    query resources {
  resources {
    resourceDomain
    resourcePath
  }
}
    `;
export const RevokeSessionDocument = gql`
    mutation revokeSession($id: ID!) {
  revokeSession(id: $id)
}
    `;
export const SetDarkModeDocument = gql`
    mutation setDarkMode($enabled: Boolean!) {
  setDarkMode(enabled: $enabled)
}
    `;
export const UnlinkTelegramDocument = gql`
    mutation unlinkTelegram {
  unlinkTelegram
}
    `;
export const UploadPictureDocument = gql`
    mutation uploadPicture($file: Upload!) {
  uploadProfilePicture(file: $file)
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();
const ChangeNameDocumentString = print(ChangeNameDocument);
const ChangePasswordDocumentString = print(ChangePasswordDocument);
const ClearProfilePictureDocumentString = print(ClearProfilePictureDocument);
const KeywordSearchDocumentString = print(KeywordSearchDocument);
const LinkTelegramDocumentString = print(LinkTelegramDocument);
const LoginDocumentString = print(LoginDocument);
const LogoutDocumentString = print(LogoutDocument);
const MeDocumentString = print(MeDocument);
const PostDocumentString = print(PostDocument);
const PostsDocumentString = print(PostsDocument);
const ResourcesDocumentString = print(ResourcesDocument);
const RevokeSessionDocumentString = print(RevokeSessionDocument);
const SetDarkModeDocumentString = print(SetDarkModeDocument);
const UnlinkTelegramDocumentString = print(UnlinkTelegramDocument);
const UploadPictureDocumentString = print(UploadPictureDocument);
export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    changeName(variables: ChangeNameMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: ChangeNameMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<ChangeNameMutation>(ChangeNameDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'changeName', 'mutation', variables);
    },
    changePassword(variables: ChangePasswordMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: ChangePasswordMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<ChangePasswordMutation>(ChangePasswordDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'changePassword', 'mutation', variables);
    },
    clearProfilePicture(variables?: ClearProfilePictureMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: ClearProfilePictureMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<ClearProfilePictureMutation>(ClearProfilePictureDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'clearProfilePicture', 'mutation', variables);
    },
    keywordSearch(variables?: KeywordSearchQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: KeywordSearchQuery; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<KeywordSearchQuery>(KeywordSearchDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'keywordSearch', 'query', variables);
    },
    linkTelegram(variables: LinkTelegramMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: LinkTelegramMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<LinkTelegramMutation>(LinkTelegramDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'linkTelegram', 'mutation', variables);
    },
    login(variables: LoginMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: LoginMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<LoginMutation>(LoginDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'login', 'mutation', variables);
    },
    logout(variables?: LogoutMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: LogoutMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<LogoutMutation>(LogoutDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'logout', 'mutation', variables);
    },
    me(variables?: MeQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: MeQuery; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<MeQuery>(MeDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'me', 'query', variables);
    },
    Post(variables: PostQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: PostQuery; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<PostQuery>(PostDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'Post', 'query', variables);
    },
    Posts(variables?: PostsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: PostsQuery; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<PostsQuery>(PostsDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'Posts', 'query', variables);
    },
    resources(variables?: ResourcesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: ResourcesQuery; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<ResourcesQuery>(ResourcesDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'resources', 'query', variables);
    },
    revokeSession(variables: RevokeSessionMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: RevokeSessionMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<RevokeSessionMutation>(RevokeSessionDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'revokeSession', 'mutation', variables);
    },
    setDarkMode(variables: SetDarkModeMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: SetDarkModeMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<SetDarkModeMutation>(SetDarkModeDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'setDarkMode', 'mutation', variables);
    },
    unlinkTelegram(variables?: UnlinkTelegramMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: UnlinkTelegramMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<UnlinkTelegramMutation>(UnlinkTelegramDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'unlinkTelegram', 'mutation', variables);
    },
    uploadPicture(variables: UploadPictureMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: UploadPictureMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<UploadPictureMutation>(UploadPictureDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'uploadPicture', 'mutation', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;