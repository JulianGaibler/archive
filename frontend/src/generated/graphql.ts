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
  /** A timestamp encoded as milliseconds since Unix Epoch in UTC. */
  DateTime: { input: any; output: any; }
  /** The `Upload` scalar type represents a file upload. */
  Upload: { input: any; output: any; }
};

/** Item affected by file processing, with type info to avoid frontend refetch. */
export type AffectedItem = {
  __typename?: 'AffectedItem';
  /** The item ID */
  id: Scalars['ID']['output'];
  /** The item position in its post (for sorting) */
  position?: Maybe<Scalars['Int']['output']>;
  /**
   * The item typename (VideoItem, ProcessingItem, AudioItem, etc.)
   * Allows frontend to update __typename without refetching entire post.
   */
  typename: Scalars['String']['output'];
};

/** An audio file. */
export type AudioFile = File & {
  __typename?: 'AudioFile';
  compressedPath: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  creator: User;
  /** The file UUID */
  id: Scalars['String']['output'];
  modifications?: Maybe<FileModifications>;
  originalPath: Scalars['String']['output'];
  originalType: FileType;
  processingNotes?: Maybe<Scalars['String']['output']>;
  processingProgress?: Maybe<Scalars['Int']['output']>;
  processingStatus: FileProcessingStatus;
  unmodifiedCompressedPath?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  waveform: Array<Scalars['Float']['output']>;
  waveformThumbnail: Array<Scalars['Float']['output']>;
};

/** An audio item. */
export type AudioItem = Item & Node & {
  __typename?: 'AudioItem';
  caption: Scalars['String']['output'];
  captionPreview: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  creator: User;
  description: Scalars['String']['output'];
  file: AudioFile;
  /** The ID of an object */
  id: Scalars['ID']['output'];
  position: Scalars['Int']['output'];
  post: Post;
  updatedAt: Scalars['DateTime']['output'];
};

/**
 * Input type for cropping parameters.
 * Defines a rectangular area to crop from a file.
 */
export type CropInput = {
  /** Bottom edge of the crop area in pixels. */
  bottom: Scalars['Int']['input'];
  /** Left edge of the crop area in pixels. */
  left: Scalars['Int']['input'];
  /** Right edge of the crop area in pixels. */
  right: Scalars['Int']['input'];
  /** Top edge of the crop area in pixels. */
  top: Scalars['Int']['input'];
};

/** Metadata about a crop modification. */
export type CropMetadata = {
  __typename?: 'CropMetadata';
  /** Bottom edge of the crop area in pixels. */
  bottom: Scalars['Int']['output'];
  /** Left edge of the crop area in pixels. */
  left: Scalars['Int']['output'];
  /** Right edge of the crop area in pixels. */
  right: Scalars['Int']['output'];
  /** Top edge of the crop area in pixels. */
  top: Scalars['Int']['output'];
};

export type EditItemInput = {
  caption?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the item to edit. */
  id: Scalars['ID']['input'];
};

/** Base interface for all file types. */
export type File = {
  createdAt: Scalars['DateTime']['output'];
  creator: User;
  /** The file UUID */
  id: Scalars['String']['output'];
  /** Modifications applied to this file during reprocessing. */
  modifications?: Maybe<FileModifications>;
  /**
   * The original file type before any conversions.
   * Used to determine what conversions are available.
   */
  originalType: FileType;
  processingNotes?: Maybe<Scalars['String']['output']>;
  processingProgress?: Maybe<Scalars['Int']['output']>;
  processingStatus: FileProcessingStatus;
  /** Path to the unmodified compressed variant (if modifications were applied). */
  unmodifiedCompressedPath?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

/** Modifications applied to a file during reprocessing. */
export type FileModifications = {
  __typename?: 'FileModifications';
  /** Crop modification applied to the file. */
  crop?: Maybe<CropMetadata>;
  /** File type conversion applied. */
  fileType?: Maybe<FileType>;
  /** Audio normalization applied to the file. */
  normalize?: Maybe<NormalizeMetadata>;
  /** Template configuration for text overlay areas. */
  template?: Maybe<TemplateConfig>;
  /** Trim modification applied to the file. */
  trim?: Maybe<TrimMetadata>;
};

/** The possible states of file processing. */
export enum FileProcessingStatus {
  /** The processing was successful. */
  Done = 'DONE',
  /** The processing has failed. */
  Failed = 'FAILED',
  /** The file is being processed. */
  Processing = 'PROCESSING',
  /** The file is waiting to be processed. */
  Queued = 'QUEUED'
}

/** Update data of a file's current processing status. */
export type FileProcessingUpdate = {
  __typename?: 'FileProcessingUpdate';
  /**
   * List of items that reference this file, with type information.
   * Useful for knowing which items were affected by the file processing
   * and updating their types in the frontend without refetching.
   */
  affectedItems?: Maybe<Array<AffectedItem>>;
  /** The updated file. */
  file: File;
  /** The ID of the file */
  id: Scalars['ID']['output'];
  /** Indicates what kind of update this is. */
  kind: UpdateKind;
};

/** File types that can be uploaded and processed. */
export enum FileType {
  /** A sound file. */
  Audio = 'AUDIO',
  /** A video without sound (animated image). */
  Gif = 'GIF',
  /** An image. */
  Image = 'IMAGE',
  /** A video with sound. */
  Video = 'VIDEO'
}

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

/** A GIF file. */
export type GifFile = File & {
  __typename?: 'GifFile';
  compressedGifPath: Scalars['String']['output'];
  compressedPath: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  creator: User;
  /** The file UUID */
  id: Scalars['String']['output'];
  modifications?: Maybe<FileModifications>;
  originalPath: Scalars['String']['output'];
  originalType: FileType;
  processingNotes?: Maybe<Scalars['String']['output']>;
  processingProgress?: Maybe<Scalars['Int']['output']>;
  processingStatus: FileProcessingStatus;
  relativeHeight: Scalars['Float']['output'];
  thumbnailPath?: Maybe<Scalars['String']['output']>;
  unmodifiedCompressedPath?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

/** A GIF item. */
export type GifItem = Item & Node & {
  __typename?: 'GifItem';
  caption: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  creator: User;
  description: Scalars['String']['output'];
  file: GifFile;
  /** The ID of an object */
  id: Scalars['ID']['output'];
  position: Scalars['Int']['output'];
  post: Post;
  updatedAt: Scalars['DateTime']['output'];
};

/** An image item. */
export type ImageItem = Item & Node & {
  __typename?: 'ImageItem';
  caption: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  creator: User;
  description: Scalars['String']['output'];
  file: PhotoFile;
  /** The ID of an object */
  id: Scalars['ID']['output'];
  position: Scalars['Int']['output'];
  post: Post;
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

export type LoginResult = {
  __typename?: 'LoginResult';
  pendingToken?: Maybe<Scalars['String']['output']>;
  requiresTotp: Scalars['Boolean']['output'];
  success: Scalars['Boolean']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Cancels an in-progress TOTP setup. */
  cancelTotpSetup: Scalars['Boolean']['output'];
  /** Changes the name of the current user. */
  changeName: Scalars['Boolean']['output'];
  /** Changes the password of the current user. */
  changePassword: Scalars['Boolean']['output'];
  /** Deletes the profile picture of the current user. */
  clearProfilePicture: Scalars['Boolean']['output'];
  /** Confirms TOTP setup by verifying a code. Enables 2FA and returns recovery codes. */
  confirmTotp: TotpConfirmResult;
  /**
   * Convert an item's file to a different format.
   * Creates new variants while preserving the original.
   * Returns the new file ID for subscription.
   */
  convertItem: Scalars['String']['output'];
  /** Creates a new keyword. */
  createKeyword: Keyword;
  /** Creates a new Post */
  createPost: Post;
  /**
   * Crop an item's file.
   * Creates new variants with crop applied while preserving the original.
   * Returns the new file ID for subscription.
   */
  cropItem: Scalars['String']['output'];
  /**
   * Deletes an item from a post and reorders remaining items.
   * Returns the ID of the deleted item.
   */
  deleteItem: Scalars['ID']['output'];
  /** Deleted a keyword. */
  deleteKeyword: Scalars['Boolean']['output'];
  /** Deletes a passkey. */
  deletePasskey: Scalars['Boolean']['output'];
  /**
   * Deletes a post and all its associated items and files.
   * Returns the ID of the deleted post.
   */
  deletePost: Scalars['ID']['output'];
  /** Deletes a temporary file that has not been claimed by a resource. */
  deleteTemporaryFile: Scalars['Boolean']['output'];
  /** Disables two-factor authentication. Requires password and TOTP code. */
  disableTotp: Scalars['Boolean']['output'];
  /**
   * Duplicates an item within the same post.
   * Creates an independent copy of the item with its own file copy.
   * The duplicate appears right after the original item (position + 1).
   * Returns the ID of the new duplicated item.
   */
  duplicateItem: Scalars['ID']['output'];
  /** Edits a post. */
  editPost: Post;
  /** Generates WebAuthn authentication options for passkey login. */
  generatePasskeyAuthenticationOptions: Scalars['String']['output'];
  /** Generates WebAuthn registration options for adding a new passkey. */
  generatePasskeyRegistrationOptions: Scalars['String']['output'];
  /** Initiates TOTP two-factor authentication setup. Returns QR code and secret. */
  initTotp: TotpSetupResult;
  /** Associates the Telegram ID of a user with their Archive Profil. */
  linkTelegram: Scalars['Boolean']['output'];
  /** Creates a new session for the user. Returns login result with optional TOTP challenge. */
  login: LoginResult;
  /** Terminates the current users session. */
  logout: Scalars['Boolean']['output'];
  /**
   * Merges one post into another, moving all items and optionally keywords.
   * Returns the number of items merged.
   */
  mergePost: Scalars['Int']['output'];
  /**
   * Apply modifications (crop and/or trim) to an item's file.
   * Creates new variants with modifications applied while preserving the original.
   * This is more efficient than calling cropItem and trimItem separately.
   * Returns the new file ID for subscription.
   */
  modifyItem: Scalars['String']['output'];
  /**
   * Moves an item from one post to another.
   * Returns whether the source post was deleted.
   */
  moveItem: Scalars['Boolean']['output'];
  /**
   * Normalize an item's audio.
   * Creates new variants with normalization applied while preserving the original.
   * Returns the new file ID for subscription.
   */
  normalizeItem: Scalars['String']['output'];
  /** Regenerates recovery codes. Requires password and TOTP code. */
  regenerateRecoveryCodes: TotpConfirmResult;
  /**
   * Remove specific modifications from an item or revert to original.
   * Creates a new file without the specified modifications.
   * Returns the new file ID for subscription.
   */
  removeModifications: Scalars['String']['output'];
  /** Renames a passkey. */
  renamePasskey: Scalars['Boolean']['output'];
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
  /**
   * Reset and reprocess a file: removes all modifications, deletes all processed variants,
   * and reprocesses from the original file. Useful for recovering from processing errors.
   */
  resetAndReprocessFile: Scalars['String']['output'];
  /** Revokes the session of a user. */
  revokeSession: Scalars['Boolean']['output'];
  /**
   * Sets or clears the template configuration for an item's file.
   * Pass null to clear the template. Does not trigger reprocessing.
   */
  setItemTemplate: Scalars['Boolean']['output'];
  /** Creates a new user and performs a login. */
  signup: Scalars['Boolean']['output'];
  /**
   * Trim an item's file.
   * Creates new variants with trim applied while preserving the original.
   * Returns the new file ID for subscription.
   */
  trimItem: Scalars['String']['output'];
  /** Removed Telegram ID from Archive profile. */
  unlinkTelegram: Scalars['Boolean']['output'];
  /**
   * Uploads a new file for an item. File starts processing immediately and
   * expires in 2 hours if not attached to a post. Returns the file ID.
   */
  uploadItemFile: Scalars['ID']['output'];
  /** Sets the profile picture of the current user. */
  uploadProfilePicture: Scalars['Boolean']['output'];
  /** Verifies a TOTP code to complete login for users with 2FA enabled. */
  verifyLoginTotp: Scalars['Boolean']['output'];
  /** Verifies a passkey authentication response and creates a session. */
  verifyPasskeyAuthentication: Scalars['Boolean']['output'];
  /** Verifies and saves a new passkey after browser attestation. */
  verifyPasskeyRegistration: Scalars['Boolean']['output'];
};


export type MutationChangeNameArgs = {
  newName: Scalars['String']['input'];
};


export type MutationChangePasswordArgs = {
  code?: InputMaybe<Scalars['String']['input']>;
  newPassword: Scalars['String']['input'];
  oldPassword: Scalars['String']['input'];
};


export type MutationConfirmTotpArgs = {
  code: Scalars['String']['input'];
};


export type MutationConvertItemArgs = {
  crop?: InputMaybe<CropInput>;
  itemId: Scalars['ID']['input'];
  targetType: FileType;
};


export type MutationCreateKeywordArgs = {
  name: Scalars['String']['input'];
};


export type MutationCreatePostArgs = {
  keywords?: InputMaybe<Array<Scalars['ID']['input']>>;
  language: Language;
  title: Scalars['String']['input'];
};


export type MutationCropItemArgs = {
  crop: CropInput;
  itemId: Scalars['ID']['input'];
};


export type MutationDeleteItemArgs = {
  itemId: Scalars['ID']['input'];
};


export type MutationDeleteKeywordArgs = {
  keywordId: Scalars['String']['input'];
};


export type MutationDeletePasskeyArgs = {
  passkeyId: Scalars['String']['input'];
};


export type MutationDeletePostArgs = {
  postId: Scalars['ID']['input'];
};


export type MutationDeleteTemporaryFileArgs = {
  fileId: Scalars['String']['input'];
};


export type MutationDisableTotpArgs = {
  code: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


export type MutationDuplicateItemArgs = {
  itemId: Scalars['ID']['input'];
};


export type MutationEditPostArgs = {
  items?: InputMaybe<Array<EditItemInput>>;
  keywords: Array<Scalars['ID']['input']>;
  language: Language;
  newItems?: InputMaybe<Array<NewItemInput>>;
  postId: Scalars['ID']['input'];
  title: Scalars['String']['input'];
};


export type MutationGeneratePasskeyRegistrationOptionsArgs = {
  name?: InputMaybe<Scalars['String']['input']>;
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


export type MutationModifyItemArgs = {
  crop?: InputMaybe<CropInput>;
  itemId: Scalars['ID']['input'];
  normalize?: InputMaybe<NormalizeInput>;
  trim?: InputMaybe<TrimInput>;
};


export type MutationMoveItemArgs = {
  itemId: Scalars['ID']['input'];
  keepEmptyPost?: InputMaybe<Scalars['Boolean']['input']>;
  targetPostId: Scalars['ID']['input'];
};


export type MutationNormalizeItemArgs = {
  itemId: Scalars['ID']['input'];
  normalize: NormalizeInput;
};


export type MutationRegenerateRecoveryCodesArgs = {
  code: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


export type MutationRemoveModificationsArgs = {
  clearAllModifications?: InputMaybe<Scalars['Boolean']['input']>;
  itemId: Scalars['ID']['input'];
  removeModifications: Array<Scalars['String']['input']>;
};


export type MutationRenamePasskeyArgs = {
  name: Scalars['String']['input'];
  passkeyId: Scalars['String']['input'];
};


export type MutationReorderItemArgs = {
  itemId: Scalars['ID']['input'];
  newPosition: Scalars['Int']['input'];
};


export type MutationReorderItemsArgs = {
  itemIds: Array<Scalars['ID']['input']>;
  postId: Scalars['ID']['input'];
};


export type MutationResetAndReprocessFileArgs = {
  itemId: Scalars['ID']['input'];
};


export type MutationRevokeSessionArgs = {
  sessionId: Scalars['ID']['input'];
};


export type MutationSetItemTemplateArgs = {
  itemId: Scalars['ID']['input'];
  template?: InputMaybe<TemplateInput>;
};


export type MutationSignupArgs = {
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};


export type MutationTrimItemArgs = {
  itemId: Scalars['ID']['input'];
  trim: TrimInput;
};


export type MutationUploadItemFileArgs = {
  file: Scalars['Upload']['input'];
  type?: InputMaybe<FileType>;
};


export type MutationUploadProfilePictureArgs = {
  file: Scalars['Upload']['input'];
};


export type MutationVerifyLoginTotpArgs = {
  code: Scalars['String']['input'];
  pendingToken: Scalars['String']['input'];
};


export type MutationVerifyPasskeyAuthenticationArgs = {
  response: Scalars['String']['input'];
};


export type MutationVerifyPasskeyRegistrationArgs = {
  name?: InputMaybe<Scalars['String']['input']>;
  response: Scalars['String']['input'];
};

export type NewItemInput = {
  caption?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  /** A file to be added as a new item. */
  fileId: Scalars['String']['input'];
};

/** An object with an ID */
export type Node = {
  /** The id of the object. */
  id: Scalars['ID']['output'];
};

/** Input type for audio normalization parameters. */
export type NormalizeInput = {
  /** Whether audio normalization should be applied. */
  enabled: Scalars['Boolean']['input'];
};

/** Metadata about an audio normalization modification. */
export type NormalizeMetadata = {
  __typename?: 'NormalizeMetadata';
  /** Whether audio normalization is applied. */
  enabled: Scalars['Boolean']['output'];
};

export type Passkey = {
  __typename?: 'Passkey';
  backedUp: Scalars['Boolean']['output'];
  createdAt: Scalars['DateTime']['output'];
  deviceType: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  transports?: Maybe<Scalars['String']['output']>;
};

/** A photo file. */
export type PhotoFile = File & {
  __typename?: 'PhotoFile';
  compressedPath: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  creator: User;
  /** The file UUID */
  id: Scalars['String']['output'];
  modifications?: Maybe<FileModifications>;
  originalPath: Scalars['String']['output'];
  originalType: FileType;
  processingNotes?: Maybe<Scalars['String']['output']>;
  processingProgress?: Maybe<Scalars['Int']['output']>;
  processingStatus: FileProcessingStatus;
  relativeHeight: Scalars['Float']['output'];
  thumbnailPath?: Maybe<Scalars['String']['output']>;
  unmodifiedCompressedPath?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
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
  fileId: Scalars['ID']['output'];
  /** The ID of an object */
  id: Scalars['ID']['output'];
  position: Scalars['Int']['output'];
  post: Post;
  processingNotes?: Maybe<Scalars['String']['output']>;
  processingProgress?: Maybe<Scalars['Int']['output']>;
  processingStatus: FileProcessingStatus;
  updatedAt: Scalars['DateTime']['output'];
};

/** A profile picture file. */
export type ProfilePictureFile = File & {
  __typename?: 'ProfilePictureFile';
  createdAt: Scalars['DateTime']['output'];
  creator: User;
  /** The file UUID */
  id: Scalars['String']['output'];
  modifications?: Maybe<FileModifications>;
  originalType: FileType;
  processingNotes?: Maybe<Scalars['String']['output']>;
  processingProgress?: Maybe<Scalars['Int']['output']>;
  processingStatus: FileProcessingStatus;
  profilePicture64: Scalars['String']['output'];
  profilePicture256: Scalars['String']['output'];
  unmodifiedCompressedPath?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type Query = {
  __typename?: 'Query';
  /** Returns a list of posts. */
  items?: Maybe<ItemConnection>;
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
  /** Returns whether new account signup is allowed on this server. */
  signupAllowed: Scalars['Boolean']['output'];
  /** Returns user based on username */
  user?: Maybe<User>;
  /** Returns a list of sessions of the the currently authenticated user. */
  userSessions: Array<Session>;
  /** Returns a list of users. */
  users?: Maybe<UserConnection>;
};


export type QueryItemsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  byContent?: InputMaybe<Scalars['String']['input']>;
  byUsers?: InputMaybe<Array<Scalars['String']['input']>>;
  first?: InputMaybe<Scalars['Int']['input']>;
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
  /** Returns updates from file processing. */
  fileProcessingUpdates: FileProcessingUpdate;
};


export type SubscriptionFileProcessingUpdatesArgs = {
  ids: Array<Scalars['String']['input']>;
};

/** A text overlay area within a template. */
export type TemplateArea = {
  __typename?: 'TemplateArea';
  alignH: Scalars['String']['output'];
  alignV: Scalars['String']['output'];
  backplateColor: Scalars['String']['output'];
  backplateOpacity: Scalars['Int']['output'];
  font: Scalars['String']['output'];
  fontSize: Scalars['Int']['output'];
  height: Scalars['Float']['output'];
  id: Scalars['String']['output'];
  overflow: Scalars['String']['output'];
  rotation: Scalars['Float']['output'];
  textColor: Scalars['String']['output'];
  width: Scalars['Float']['output'];
  x: Scalars['Float']['output'];
  y: Scalars['Float']['output'];
};

export type TemplateAreaInput = {
  alignH: Scalars['String']['input'];
  alignV: Scalars['String']['input'];
  backplateColor: Scalars['String']['input'];
  backplateOpacity: Scalars['Int']['input'];
  font: Scalars['String']['input'];
  fontSize: Scalars['Int']['input'];
  height: Scalars['Float']['input'];
  id: Scalars['String']['input'];
  overflow: Scalars['String']['input'];
  rotation: Scalars['Float']['input'];
  textColor: Scalars['String']['input'];
  width: Scalars['Float']['input'];
  x: Scalars['Float']['input'];
  y: Scalars['Float']['input'];
};

/** Template configuration for text overlay areas on an image. */
export type TemplateConfig = {
  __typename?: 'TemplateConfig';
  areas: Array<TemplateArea>;
};

export type TemplateInput = {
  areas: Array<TemplateAreaInput>;
};

export type TotpConfirmResult = {
  __typename?: 'TotpConfirmResult';
  recoveryCodes: Array<Scalars['String']['output']>;
};

export type TotpSetupResult = {
  __typename?: 'TotpSetupResult';
  otpauthUrl: Scalars['String']['output'];
  qrCodeDataUrl: Scalars['String']['output'];
  secret: Scalars['String']['output'];
};

export type TotpStatus = {
  __typename?: 'TotpStatus';
  enabled: Scalars['Boolean']['output'];
  recoveryCodesRemaining: Scalars['Int']['output'];
};

/**
 * Input type for trimming parameters.
 * Defines a time range to trim from video/audio files.
 */
export type TrimInput = {
  /** End time of the trim in seconds. */
  endTime: Scalars['Float']['input'];
  /** Start time of the trim in seconds. */
  startTime: Scalars['Float']['input'];
};

/** Metadata about a trim modification. */
export type TrimMetadata = {
  __typename?: 'TrimMetadata';
  /** End time of the trim in seconds. */
  endTime: Scalars['Float']['output'];
  /** Start time of the trim in seconds. */
  startTime: Scalars['Float']['output'];
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
  /** Registered passkeys. Only available for the current user via `me` query. */
  passkeys?: Maybe<Array<Passkey>>;
  /** The number of posts created by this user. */
  postCount: Scalars['Int']['output'];
  /** All Posts associated with this user. */
  posts?: Maybe<PostConnection>;
  /** Profile picture file containing different sizes. */
  profilePicture?: Maybe<ProfilePictureFile>;
  /** Two-factor authentication status. Only available for the current user via `me` query. */
  totpStatus?: Maybe<TotpStatus>;
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

/** A video file. */
export type VideoFile = File & {
  __typename?: 'VideoFile';
  compressedPath: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  creator: User;
  /** The file UUID */
  id: Scalars['String']['output'];
  modifications?: Maybe<FileModifications>;
  originalPath: Scalars['String']['output'];
  originalType: FileType;
  posterThumbnailPath?: Maybe<Scalars['String']['output']>;
  processingNotes?: Maybe<Scalars['String']['output']>;
  processingProgress?: Maybe<Scalars['Int']['output']>;
  processingStatus: FileProcessingStatus;
  relativeHeight: Scalars['Float']['output'];
  thumbnailPath?: Maybe<Scalars['String']['output']>;
  unmodifiedCompressedPath?: Maybe<Scalars['String']['output']>;
  /** Path to the unmodified thumbnail poster (if modifications were applied). */
  unmodifiedThumbnailPosterPath?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

/** A video item. */
export type VideoItem = Item & Node & {
  __typename?: 'VideoItem';
  caption: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  creator: User;
  description: Scalars['String']['output'];
  file: VideoFile;
  hasCaptions: Scalars['Boolean']['output'];
  /** The ID of an object */
  id: Scalars['ID']['output'];
  position: Scalars['Int']['output'];
  post: Post;
  updatedAt: Scalars['DateTime']['output'];
};

export type SettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type SettingsQuery = { __typename?: 'Query', me?: { __typename?: 'User', name: string, username: string, linkedTelegram?: boolean | null, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null, totpStatus?: { __typename?: 'TotpStatus', enabled: boolean, recoveryCodesRemaining: number } | null, passkeys?: Array<{ __typename?: 'Passkey', id: string, name: string, deviceType: string, backedUp: boolean, transports?: string | null, createdAt: any }> | null } | null, userSessions: Array<{ __typename?: 'Session', createdAt: any, firstIp: string, id: string, latestIp: string, current: boolean, userAgent: string, updatedAt: any }> };

export type SignupAllowedQueryVariables = Exact<{ [key: string]: never; }>;


export type SignupAllowedQuery = { __typename?: 'Query', signupAllowed: boolean };

export type SignupMutationVariables = Exact<{
  username: Scalars['String']['input'];
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;


export type SignupMutation = { __typename?: 'Mutation', signup: boolean };

export type LoginMutationVariables = Exact<{
  username: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;


export type LoginMutation = { __typename?: 'Mutation', login: { __typename?: 'LoginResult', success: boolean, requiresTotp: boolean, pendingToken?: string | null } };

export type VerifyLoginTotpMutationVariables = Exact<{
  pendingToken: Scalars['String']['input'];
  code: Scalars['String']['input'];
}>;


export type VerifyLoginTotpMutation = { __typename?: 'Mutation', verifyLoginTotp: boolean };

export type LogoutMutationVariables = Exact<{ [key: string]: never; }>;


export type LogoutMutation = { __typename?: 'Mutation', logout: boolean };

export type InitTotpMutationVariables = Exact<{ [key: string]: never; }>;


export type InitTotpMutation = { __typename?: 'Mutation', initTotp: { __typename?: 'TotpSetupResult', secret: string, otpauthUrl: string, qrCodeDataUrl: string } };

export type ConfirmTotpMutationVariables = Exact<{
  code: Scalars['String']['input'];
}>;


export type ConfirmTotpMutation = { __typename?: 'Mutation', confirmTotp: { __typename?: 'TotpConfirmResult', recoveryCodes: Array<string> } };

export type CancelTotpSetupMutationVariables = Exact<{ [key: string]: never; }>;


export type CancelTotpSetupMutation = { __typename?: 'Mutation', cancelTotpSetup: boolean };

export type DisableTotpMutationVariables = Exact<{
  password: Scalars['String']['input'];
  code: Scalars['String']['input'];
}>;


export type DisableTotpMutation = { __typename?: 'Mutation', disableTotp: boolean };

export type RegenerateRecoveryCodesMutationVariables = Exact<{
  password: Scalars['String']['input'];
  code: Scalars['String']['input'];
}>;


export type RegenerateRecoveryCodesMutation = { __typename?: 'Mutation', regenerateRecoveryCodes: { __typename?: 'TotpConfirmResult', recoveryCodes: Array<string> } };

export type GeneratePasskeyRegistrationOptionsMutationVariables = Exact<{
  name?: InputMaybe<Scalars['String']['input']>;
}>;


export type GeneratePasskeyRegistrationOptionsMutation = { __typename?: 'Mutation', generatePasskeyRegistrationOptions: string };

export type VerifyPasskeyRegistrationMutationVariables = Exact<{
  response: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
}>;


export type VerifyPasskeyRegistrationMutation = { __typename?: 'Mutation', verifyPasskeyRegistration: boolean };

export type GeneratePasskeyAuthenticationOptionsMutationVariables = Exact<{ [key: string]: never; }>;


export type GeneratePasskeyAuthenticationOptionsMutation = { __typename?: 'Mutation', generatePasskeyAuthenticationOptions: string };

export type VerifyPasskeyAuthenticationMutationVariables = Exact<{
  response: Scalars['String']['input'];
}>;


export type VerifyPasskeyAuthenticationMutation = { __typename?: 'Mutation', verifyPasskeyAuthentication: boolean };

export type RenamePasskeyMutationVariables = Exact<{
  passkeyId: Scalars['String']['input'];
  name: Scalars['String']['input'];
}>;


export type RenamePasskeyMutation = { __typename?: 'Mutation', renamePasskey: boolean };

export type DeletePasskeyMutationVariables = Exact<{
  passkeyId: Scalars['String']['input'];
}>;


export type DeletePasskeyMutation = { __typename?: 'Mutation', deletePasskey: boolean };

type ItemData_AudioItem_Fragment = { __typename: 'AudioItem', caption: string, position: number, createdAt: any, updatedAt: any, description: string, id: string, file: { __typename: 'AudioFile', id: string, originalType: FileType, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null, updatedAt: any, originalPath: string, compressedPath: string, unmodifiedCompressedPath?: string | null, waveform: Array<number>, waveformThumbnail: Array<number>, modifications?: { __typename?: 'FileModifications', fileType?: FileType | null, crop?: { __typename?: 'CropMetadata', left: number, top: number, right: number, bottom: number } | null, trim?: { __typename?: 'TrimMetadata', startTime: number, endTime: number } | null, normalize?: { __typename?: 'NormalizeMetadata', enabled: boolean } | null } | null }, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null } };

type ItemData_GifItem_Fragment = { __typename: 'GifItem', caption: string, position: number, createdAt: any, updatedAt: any, description: string, id: string, file: { __typename: 'GifFile', id: string, originalType: FileType, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null, updatedAt: any, originalPath: string, compressedPath: string, compressedGifPath: string, thumbnailPath?: string | null, unmodifiedCompressedPath?: string | null, relativeHeight: number, modifications?: { __typename?: 'FileModifications', fileType?: FileType | null, crop?: { __typename?: 'CropMetadata', left: number, top: number, right: number, bottom: number } | null, trim?: { __typename?: 'TrimMetadata', startTime: number, endTime: number } | null } | null }, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null } };

type ItemData_ImageItem_Fragment = { __typename: 'ImageItem', caption: string, position: number, createdAt: any, updatedAt: any, description: string, id: string, file: { __typename: 'PhotoFile', id: string, originalType: FileType, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null, updatedAt: any, originalPath: string, compressedPath: string, thumbnailPath?: string | null, unmodifiedCompressedPath?: string | null, relativeHeight: number, modifications?: { __typename?: 'FileModifications', fileType?: FileType | null, crop?: { __typename?: 'CropMetadata', left: number, top: number, right: number, bottom: number } | null, template?: { __typename?: 'TemplateConfig', areas: Array<{ __typename?: 'TemplateArea', id: string, x: number, y: number, width: number, height: number, rotation: number, alignH: string, alignV: string, overflow: string, font: string, fontSize: number, textColor: string, backplateOpacity: number, backplateColor: string }> } | null } | null }, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null } };

type ItemData_ProcessingItem_Fragment = { __typename: 'ProcessingItem', position: number, fileId: string, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null, createdAt: any, updatedAt: any, description: string, id: string, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null } };

type ItemData_VideoItem_Fragment = { __typename: 'VideoItem', caption: string, hasCaptions: boolean, position: number, createdAt: any, updatedAt: any, description: string, id: string, file: { __typename: 'VideoFile', id: string, originalType: FileType, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null, updatedAt: any, originalPath: string, compressedPath: string, thumbnailPath?: string | null, posterThumbnailPath?: string | null, unmodifiedCompressedPath?: string | null, unmodifiedThumbnailPosterPath?: string | null, relativeHeight: number, modifications?: { __typename?: 'FileModifications', fileType?: FileType | null, crop?: { __typename?: 'CropMetadata', left: number, top: number, right: number, bottom: number } | null, trim?: { __typename?: 'TrimMetadata', startTime: number, endTime: number } | null, normalize?: { __typename?: 'NormalizeMetadata', enabled: boolean } | null } | null }, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null } };

export type ItemDataFragment =
  | ItemData_AudioItem_Fragment
  | ItemData_GifItem_Fragment
  | ItemData_ImageItem_Fragment
  | ItemData_ProcessingItem_Fragment
  | ItemData_VideoItem_Fragment
;

export type PostDataFragment = { __typename?: 'Post', id: string, title: string, language: Language, updatedAt: any, createdAt: any, creator: { __typename?: 'User', name: string, username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null }, keywords: Array<{ __typename?: 'Keyword', name: string, id: string }>, items: { __typename?: 'ItemConnection', nodes: Array<
      | { __typename: 'AudioItem', caption: string, position: number, createdAt: any, updatedAt: any, description: string, id: string, file: { __typename: 'AudioFile', id: string, originalType: FileType, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null, updatedAt: any, originalPath: string, compressedPath: string, unmodifiedCompressedPath?: string | null, waveform: Array<number>, waveformThumbnail: Array<number>, modifications?: { __typename?: 'FileModifications', fileType?: FileType | null, crop?: { __typename?: 'CropMetadata', left: number, top: number, right: number, bottom: number } | null, trim?: { __typename?: 'TrimMetadata', startTime: number, endTime: number } | null, normalize?: { __typename?: 'NormalizeMetadata', enabled: boolean } | null } | null }, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null } }
      | { __typename: 'GifItem', caption: string, position: number, createdAt: any, updatedAt: any, description: string, id: string, file: { __typename: 'GifFile', id: string, originalType: FileType, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null, updatedAt: any, originalPath: string, compressedPath: string, compressedGifPath: string, thumbnailPath?: string | null, unmodifiedCompressedPath?: string | null, relativeHeight: number, modifications?: { __typename?: 'FileModifications', fileType?: FileType | null, crop?: { __typename?: 'CropMetadata', left: number, top: number, right: number, bottom: number } | null, trim?: { __typename?: 'TrimMetadata', startTime: number, endTime: number } | null } | null }, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null } }
      | { __typename: 'ImageItem', caption: string, position: number, createdAt: any, updatedAt: any, description: string, id: string, file: { __typename: 'PhotoFile', id: string, originalType: FileType, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null, updatedAt: any, originalPath: string, compressedPath: string, thumbnailPath?: string | null, unmodifiedCompressedPath?: string | null, relativeHeight: number, modifications?: { __typename?: 'FileModifications', fileType?: FileType | null, crop?: { __typename?: 'CropMetadata', left: number, top: number, right: number, bottom: number } | null, template?: { __typename?: 'TemplateConfig', areas: Array<{ __typename?: 'TemplateArea', id: string, x: number, y: number, width: number, height: number, rotation: number, alignH: string, alignV: string, overflow: string, font: string, fontSize: number, textColor: string, backplateOpacity: number, backplateColor: string }> } | null } | null }, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null } }
      | { __typename: 'ProcessingItem', position: number, fileId: string, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null, createdAt: any, updatedAt: any, description: string, id: string, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null } }
      | { __typename: 'VideoItem', caption: string, hasCaptions: boolean, position: number, createdAt: any, updatedAt: any, description: string, id: string, file: { __typename: 'VideoFile', id: string, originalType: FileType, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null, updatedAt: any, originalPath: string, compressedPath: string, thumbnailPath?: string | null, posterThumbnailPath?: string | null, unmodifiedCompressedPath?: string | null, unmodifiedThumbnailPosterPath?: string | null, relativeHeight: number, modifications?: { __typename?: 'FileModifications', fileType?: FileType | null, crop?: { __typename?: 'CropMetadata', left: number, top: number, right: number, bottom: number } | null, trim?: { __typename?: 'TrimMetadata', startTime: number, endTime: number } | null, normalize?: { __typename?: 'NormalizeMetadata', enabled: boolean } | null } | null }, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null } }
    > } };

export type PostsConnectionFragment = { __typename?: 'PostConnection', hasNextPage: boolean, endCursor?: string | null, startCursor?: string | null, nodes: Array<{ __typename?: 'Post', id: string, title: string, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null }, items: { __typename?: 'ItemConnection', totalCount: number, nodes: Array<
        | { __typename: 'AudioItem', captionPreview: string, description: string, id: string, file: { __typename: 'AudioFile', waveform: Array<number>, waveformThumbnail: Array<number> } }
        | { __typename: 'GifItem', id: string, file: { __typename: 'GifFile', relativeHeight: number, thumbnailPath?: string | null } }
        | { __typename: 'ImageItem', id: string, file: { __typename: 'PhotoFile', relativeHeight: number, thumbnailPath?: string | null } }
        | { __typename: 'ProcessingItem', id: string }
        | { __typename: 'VideoItem', id: string, file: { __typename: 'VideoFile', relativeHeight: number, thumbnailPath?: string | null, posterThumbnailPath?: string | null } }
      > } }> };

export type ConvertItemMutationVariables = Exact<{
  itemId: Scalars['ID']['input'];
  targetType: FileType;
  crop?: InputMaybe<CropInput>;
}>;


export type ConvertItemMutation = { __typename?: 'Mutation', convertItem: string };

export type CropItemMutationVariables = Exact<{
  itemId: Scalars['ID']['input'];
  crop: CropInput;
}>;


export type CropItemMutation = { __typename?: 'Mutation', cropItem: string };

export type TrimItemMutationVariables = Exact<{
  itemId: Scalars['ID']['input'];
  trim: TrimInput;
}>;


export type TrimItemMutation = { __typename?: 'Mutation', trimItem: string };

export type ModifyItemMutationVariables = Exact<{
  itemId: Scalars['ID']['input'];
  crop?: InputMaybe<CropInput>;
  trim?: InputMaybe<TrimInput>;
  normalize?: InputMaybe<NormalizeInput>;
}>;


export type ModifyItemMutation = { __typename?: 'Mutation', modifyItem: string };

export type NormalizeItemMutationVariables = Exact<{
  itemId: Scalars['ID']['input'];
  normalize: NormalizeInput;
}>;


export type NormalizeItemMutation = { __typename?: 'Mutation', normalizeItem: string };

export type RemoveModificationsMutationVariables = Exact<{
  itemId: Scalars['ID']['input'];
  removeModifications: Array<Scalars['String']['input']> | Scalars['String']['input'];
  clearAllModifications?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type RemoveModificationsMutation = { __typename?: 'Mutation', removeModifications: string };

export type ResetAndReprocessFileMutationVariables = Exact<{
  itemId: Scalars['ID']['input'];
}>;


export type ResetAndReprocessFileMutation = { __typename?: 'Mutation', resetAndReprocessFile: string };

export type DuplicateItemMutationVariables = Exact<{
  itemId: Scalars['ID']['input'];
}>;


export type DuplicateItemMutation = { __typename?: 'Mutation', duplicateItem: string };

export type SetItemTemplateMutationVariables = Exact<{
  itemId: Scalars['ID']['input'];
  template?: InputMaybe<TemplateInput>;
}>;


export type SetItemTemplateMutation = { __typename?: 'Mutation', setItemTemplate: boolean };

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


export type KeywordWithPostsQuery = { __typename?: 'Query', keyword:
    | { __typename: 'AudioItem' }
    | { __typename: 'GifItem' }
    | { __typename: 'ImageItem' }
    | { __typename: 'Keyword', name: string, postCount: number }
    | { __typename: 'Post' }
    | { __typename: 'ProcessingItem' }
    | { __typename: 'Session' }
    | { __typename: 'User' }
    | { __typename: 'VideoItem' }
  , posts?: { __typename?: 'PostConnection', hasNextPage: boolean, endCursor?: string | null, startCursor?: string | null, nodes: Array<{ __typename?: 'Post', id: string, title: string, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null }, items: { __typename?: 'ItemConnection', totalCount: number, nodes: Array<
          | { __typename: 'AudioItem', captionPreview: string, description: string, id: string, file: { __typename: 'AudioFile', waveform: Array<number>, waveformThumbnail: Array<number> } }
          | { __typename: 'GifItem', id: string, file: { __typename: 'GifFile', relativeHeight: number, thumbnailPath?: string | null } }
          | { __typename: 'ImageItem', id: string, file: { __typename: 'PhotoFile', relativeHeight: number, thumbnailPath?: string | null } }
          | { __typename: 'ProcessingItem', id: string }
          | { __typename: 'VideoItem', id: string, file: { __typename: 'VideoFile', relativeHeight: number, thumbnailPath?: string | null, posterThumbnailPath?: string | null } }
        > } }> } | null };

export type CreateKeywordMutationVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type CreateKeywordMutation = { __typename?: 'Mutation', createKeyword: { __typename?: 'Keyword', id: string, name: string } };

export type PostQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type PostQuery = { __typename?: 'Query', node:
    | { __typename?: 'AudioItem' }
    | { __typename?: 'GifItem' }
    | { __typename?: 'ImageItem' }
    | { __typename?: 'Keyword' }
    | { __typename?: 'Post', id: string, title: string, language: Language, updatedAt: any, createdAt: any, creator: { __typename?: 'User', name: string, username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null }, keywords: Array<{ __typename?: 'Keyword', name: string, id: string }>, items: { __typename?: 'ItemConnection', nodes: Array<
          | { __typename: 'AudioItem', caption: string, position: number, createdAt: any, updatedAt: any, description: string, id: string, file: { __typename: 'AudioFile', id: string, originalType: FileType, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null, updatedAt: any, originalPath: string, compressedPath: string, unmodifiedCompressedPath?: string | null, waveform: Array<number>, waveformThumbnail: Array<number>, modifications?: { __typename?: 'FileModifications', fileType?: FileType | null, crop?: { __typename?: 'CropMetadata', left: number, top: number, right: number, bottom: number } | null, trim?: { __typename?: 'TrimMetadata', startTime: number, endTime: number } | null, normalize?: { __typename?: 'NormalizeMetadata', enabled: boolean } | null } | null }, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null } }
          | { __typename: 'GifItem', caption: string, position: number, createdAt: any, updatedAt: any, description: string, id: string, file: { __typename: 'GifFile', id: string, originalType: FileType, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null, updatedAt: any, originalPath: string, compressedPath: string, compressedGifPath: string, thumbnailPath?: string | null, unmodifiedCompressedPath?: string | null, relativeHeight: number, modifications?: { __typename?: 'FileModifications', fileType?: FileType | null, crop?: { __typename?: 'CropMetadata', left: number, top: number, right: number, bottom: number } | null, trim?: { __typename?: 'TrimMetadata', startTime: number, endTime: number } | null } | null }, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null } }
          | { __typename: 'ImageItem', caption: string, position: number, createdAt: any, updatedAt: any, description: string, id: string, file: { __typename: 'PhotoFile', id: string, originalType: FileType, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null, updatedAt: any, originalPath: string, compressedPath: string, thumbnailPath?: string | null, unmodifiedCompressedPath?: string | null, relativeHeight: number, modifications?: { __typename?: 'FileModifications', fileType?: FileType | null, crop?: { __typename?: 'CropMetadata', left: number, top: number, right: number, bottom: number } | null, template?: { __typename?: 'TemplateConfig', areas: Array<{ __typename?: 'TemplateArea', id: string, x: number, y: number, width: number, height: number, rotation: number, alignH: string, alignV: string, overflow: string, font: string, fontSize: number, textColor: string, backplateOpacity: number, backplateColor: string }> } | null } | null }, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null } }
          | { __typename: 'ProcessingItem', position: number, fileId: string, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null, createdAt: any, updatedAt: any, description: string, id: string, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null } }
          | { __typename: 'VideoItem', caption: string, hasCaptions: boolean, position: number, createdAt: any, updatedAt: any, description: string, id: string, file: { __typename: 'VideoFile', id: string, originalType: FileType, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null, updatedAt: any, originalPath: string, compressedPath: string, thumbnailPath?: string | null, posterThumbnailPath?: string | null, unmodifiedCompressedPath?: string | null, unmodifiedThumbnailPosterPath?: string | null, relativeHeight: number, modifications?: { __typename?: 'FileModifications', fileType?: FileType | null, crop?: { __typename?: 'CropMetadata', left: number, top: number, right: number, bottom: number } | null, trim?: { __typename?: 'TrimMetadata', startTime: number, endTime: number } | null, normalize?: { __typename?: 'NormalizeMetadata', enabled: boolean } | null } | null }, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null } }
        > } }
    | { __typename?: 'ProcessingItem' }
    | { __typename?: 'Session' }
    | { __typename?: 'User' }
    | { __typename?: 'VideoItem' }
   };

export type PostsQueryVariables = Exact<{
  after?: InputMaybe<Scalars['String']['input']>;
  byContent?: InputMaybe<Scalars['String']['input']>;
  byKeywords?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  byUsers?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
}>;


export type PostsQuery = { __typename?: 'Query', posts?: { __typename?: 'PostConnection', hasNextPage: boolean, endCursor?: string | null, startCursor?: string | null, nodes: Array<{ __typename?: 'Post', id: string, title: string, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null }, items: { __typename?: 'ItemConnection', totalCount: number, nodes: Array<
          | { __typename: 'AudioItem', captionPreview: string, description: string, id: string, file: { __typename: 'AudioFile', waveform: Array<number>, waveformThumbnail: Array<number> } }
          | { __typename: 'GifItem', id: string, file: { __typename: 'GifFile', relativeHeight: number, thumbnailPath?: string | null } }
          | { __typename: 'ImageItem', id: string, file: { __typename: 'PhotoFile', relativeHeight: number, thumbnailPath?: string | null } }
          | { __typename: 'ProcessingItem', id: string }
          | { __typename: 'VideoItem', id: string, file: { __typename: 'VideoFile', relativeHeight: number, thumbnailPath?: string | null, posterThumbnailPath?: string | null } }
        > } }> } | null };

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


export type CreatePostMutation = { __typename?: 'Mutation', createPost: { __typename?: 'Post', id: string, title: string, language: Language, updatedAt: any, createdAt: any, creator: { __typename?: 'User', name: string, username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null }, keywords: Array<{ __typename?: 'Keyword', name: string, id: string }>, items: { __typename?: 'ItemConnection', nodes: Array<
        | { __typename: 'AudioItem', caption: string, position: number, createdAt: any, updatedAt: any, description: string, id: string, file: { __typename: 'AudioFile', id: string, originalType: FileType, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null, updatedAt: any, originalPath: string, compressedPath: string, unmodifiedCompressedPath?: string | null, waveform: Array<number>, waveformThumbnail: Array<number>, modifications?: { __typename?: 'FileModifications', fileType?: FileType | null, crop?: { __typename?: 'CropMetadata', left: number, top: number, right: number, bottom: number } | null, trim?: { __typename?: 'TrimMetadata', startTime: number, endTime: number } | null, normalize?: { __typename?: 'NormalizeMetadata', enabled: boolean } | null } | null }, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null } }
        | { __typename: 'GifItem', caption: string, position: number, createdAt: any, updatedAt: any, description: string, id: string, file: { __typename: 'GifFile', id: string, originalType: FileType, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null, updatedAt: any, originalPath: string, compressedPath: string, compressedGifPath: string, thumbnailPath?: string | null, unmodifiedCompressedPath?: string | null, relativeHeight: number, modifications?: { __typename?: 'FileModifications', fileType?: FileType | null, crop?: { __typename?: 'CropMetadata', left: number, top: number, right: number, bottom: number } | null, trim?: { __typename?: 'TrimMetadata', startTime: number, endTime: number } | null } | null }, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null } }
        | { __typename: 'ImageItem', caption: string, position: number, createdAt: any, updatedAt: any, description: string, id: string, file: { __typename: 'PhotoFile', id: string, originalType: FileType, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null, updatedAt: any, originalPath: string, compressedPath: string, thumbnailPath?: string | null, unmodifiedCompressedPath?: string | null, relativeHeight: number, modifications?: { __typename?: 'FileModifications', fileType?: FileType | null, crop?: { __typename?: 'CropMetadata', left: number, top: number, right: number, bottom: number } | null, template?: { __typename?: 'TemplateConfig', areas: Array<{ __typename?: 'TemplateArea', id: string, x: number, y: number, width: number, height: number, rotation: number, alignH: string, alignV: string, overflow: string, font: string, fontSize: number, textColor: string, backplateOpacity: number, backplateColor: string }> } | null } | null }, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null } }
        | { __typename: 'ProcessingItem', position: number, fileId: string, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null, createdAt: any, updatedAt: any, description: string, id: string, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null } }
        | { __typename: 'VideoItem', caption: string, hasCaptions: boolean, position: number, createdAt: any, updatedAt: any, description: string, id: string, file: { __typename: 'VideoFile', id: string, originalType: FileType, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null, updatedAt: any, originalPath: string, compressedPath: string, thumbnailPath?: string | null, posterThumbnailPath?: string | null, unmodifiedCompressedPath?: string | null, unmodifiedThumbnailPosterPath?: string | null, relativeHeight: number, modifications?: { __typename?: 'FileModifications', fileType?: FileType | null, crop?: { __typename?: 'CropMetadata', left: number, top: number, right: number, bottom: number } | null, trim?: { __typename?: 'TrimMetadata', startTime: number, endTime: number } | null, normalize?: { __typename?: 'NormalizeMetadata', enabled: boolean } | null } | null }, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null } }
      > } } };

export type UploadItemFileMutationVariables = Exact<{
  file: Scalars['Upload']['input'];
  type?: InputMaybe<FileType>;
}>;


export type UploadItemFileMutation = { __typename?: 'Mutation', uploadItemFile: string };

export type EditPostMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  title: Scalars['String']['input'];
  keywords: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  language: Language;
  items?: InputMaybe<Array<EditItemInput> | EditItemInput>;
  newItems?: InputMaybe<Array<NewItemInput> | NewItemInput>;
}>;


export type EditPostMutation = { __typename?: 'Mutation', editPost: { __typename?: 'Post', id: string, title: string, language: Language, updatedAt: any, createdAt: any, creator: { __typename?: 'User', name: string, username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null }, keywords: Array<{ __typename?: 'Keyword', name: string, id: string }>, items: { __typename?: 'ItemConnection', nodes: Array<
        | { __typename: 'AudioItem', caption: string, position: number, createdAt: any, updatedAt: any, description: string, id: string, file: { __typename: 'AudioFile', id: string, originalType: FileType, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null, updatedAt: any, originalPath: string, compressedPath: string, unmodifiedCompressedPath?: string | null, waveform: Array<number>, waveformThumbnail: Array<number>, modifications?: { __typename?: 'FileModifications', fileType?: FileType | null, crop?: { __typename?: 'CropMetadata', left: number, top: number, right: number, bottom: number } | null, trim?: { __typename?: 'TrimMetadata', startTime: number, endTime: number } | null, normalize?: { __typename?: 'NormalizeMetadata', enabled: boolean } | null } | null }, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null } }
        | { __typename: 'GifItem', caption: string, position: number, createdAt: any, updatedAt: any, description: string, id: string, file: { __typename: 'GifFile', id: string, originalType: FileType, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null, updatedAt: any, originalPath: string, compressedPath: string, compressedGifPath: string, thumbnailPath?: string | null, unmodifiedCompressedPath?: string | null, relativeHeight: number, modifications?: { __typename?: 'FileModifications', fileType?: FileType | null, crop?: { __typename?: 'CropMetadata', left: number, top: number, right: number, bottom: number } | null, trim?: { __typename?: 'TrimMetadata', startTime: number, endTime: number } | null } | null }, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null } }
        | { __typename: 'ImageItem', caption: string, position: number, createdAt: any, updatedAt: any, description: string, id: string, file: { __typename: 'PhotoFile', id: string, originalType: FileType, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null, updatedAt: any, originalPath: string, compressedPath: string, thumbnailPath?: string | null, unmodifiedCompressedPath?: string | null, relativeHeight: number, modifications?: { __typename?: 'FileModifications', fileType?: FileType | null, crop?: { __typename?: 'CropMetadata', left: number, top: number, right: number, bottom: number } | null, template?: { __typename?: 'TemplateConfig', areas: Array<{ __typename?: 'TemplateArea', id: string, x: number, y: number, width: number, height: number, rotation: number, alignH: string, alignV: string, overflow: string, font: string, fontSize: number, textColor: string, backplateOpacity: number, backplateColor: string }> } | null } | null }, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null } }
        | { __typename: 'ProcessingItem', position: number, fileId: string, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null, createdAt: any, updatedAt: any, description: string, id: string, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null } }
        | { __typename: 'VideoItem', caption: string, hasCaptions: boolean, position: number, createdAt: any, updatedAt: any, description: string, id: string, file: { __typename: 'VideoFile', id: string, originalType: FileType, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null, updatedAt: any, originalPath: string, compressedPath: string, thumbnailPath?: string | null, posterThumbnailPath?: string | null, unmodifiedCompressedPath?: string | null, unmodifiedThumbnailPosterPath?: string | null, relativeHeight: number, modifications?: { __typename?: 'FileModifications', fileType?: FileType | null, crop?: { __typename?: 'CropMetadata', left: number, top: number, right: number, bottom: number } | null, trim?: { __typename?: 'TrimMetadata', startTime: number, endTime: number } | null, normalize?: { __typename?: 'NormalizeMetadata', enabled: boolean } | null } | null }, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null } }
      > } } };

export type DeleteItemMutationVariables = Exact<{
  deleteItemId: Scalars['ID']['input'];
}>;


export type DeleteItemMutation = { __typename?: 'Mutation', deleteItem: string };

export type DeletePostMutationVariables = Exact<{
  deletePostId: Scalars['ID']['input'];
}>;


export type DeletePostMutation = { __typename?: 'Mutation', deletePost: string };

export type DeleteTemporaryFileMutationVariables = Exact<{
  fileId: Scalars['String']['input'];
}>;


export type DeleteTemporaryFileMutation = { __typename?: 'Mutation', deleteTemporaryFile: boolean };

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

export type FileProcessingUpdatesSubscriptionVariables = Exact<{
  ids: Array<Scalars['String']['input']> | Scalars['String']['input'];
}>;


export type FileProcessingUpdatesSubscription = { __typename?: 'Subscription', fileProcessingUpdates: { __typename?: 'FileProcessingUpdate', kind: UpdateKind, file:
      | { __typename?: 'AudioFile', originalPath: string, compressedPath: string, waveform: Array<number>, waveformThumbnail: Array<number>, id: string, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null }
      | { __typename?: 'GifFile', originalPath: string, compressedPath: string, compressedGifPath: string, thumbnailPath?: string | null, relativeHeight: number, id: string, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null }
      | { __typename?: 'PhotoFile', originalPath: string, compressedPath: string, thumbnailPath?: string | null, relativeHeight: number, id: string, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null }
      | { __typename?: 'ProfilePictureFile', id: string, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null }
      | { __typename?: 'VideoFile', originalPath: string, compressedPath: string, thumbnailPath?: string | null, posterThumbnailPath?: string | null, relativeHeight: number, id: string, processingStatus: FileProcessingStatus, processingProgress?: number | null, processingNotes?: string | null }
    , affectedItems?: Array<{ __typename?: 'AffectedItem', id: string, typename: string, position?: number | null }> | null } };

export type ChangeNameMutationVariables = Exact<{
  newName: Scalars['String']['input'];
}>;


export type ChangeNameMutation = { __typename?: 'Mutation', changeName: boolean };

export type ChangePasswordMutationVariables = Exact<{
  oldPassword: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
  code?: InputMaybe<Scalars['String']['input']>;
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


export type MeQuery = { __typename?: 'Query', me?: { __typename?: 'User', name: string, username: string, linkedTelegram?: boolean | null, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null } | null };

export type UserQueryVariables = Exact<{
  username: Scalars['String']['input'];
}>;


export type UserQuery = { __typename?: 'Query', user?: { __typename?: 'User', id: string, username: string, name: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null, posts?: { __typename?: 'PostConnection', totalCount: number } | null } | null };

export type UsersQueryVariables = Exact<{
  after?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
}>;


export type UsersQuery = { __typename?: 'Query', users?: { __typename?: 'UserConnection', hasNextPage: boolean, endCursor?: string | null, nodes: Array<{ __typename?: 'User', id: string, username: string, name: string, postCount: number, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null }> } | null };

export type UserWithPostsQueryVariables = Exact<{
  username: Scalars['String']['input'];
  after?: InputMaybe<Scalars['String']['input']>;
  byContent?: InputMaybe<Scalars['String']['input']>;
}>;


export type UserWithPostsQuery = { __typename?: 'Query', user?: { __typename?: 'User', id: string, username: string, name: string, postCount: number, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null } | null, posts?: { __typename?: 'PostConnection', hasNextPage: boolean, endCursor?: string | null, startCursor?: string | null, nodes: Array<{ __typename?: 'Post', id: string, title: string, creator: { __typename?: 'User', username: string, profilePicture?: { __typename?: 'ProfilePictureFile', profilePicture256: string, profilePicture64: string } | null }, items: { __typename?: 'ItemConnection', totalCount: number, nodes: Array<
          | { __typename: 'AudioItem', captionPreview: string, description: string, id: string, file: { __typename: 'AudioFile', waveform: Array<number>, waveformThumbnail: Array<number> } }
          | { __typename: 'GifItem', id: string, file: { __typename: 'GifFile', relativeHeight: number, thumbnailPath?: string | null } }
          | { __typename: 'ImageItem', id: string, file: { __typename: 'PhotoFile', relativeHeight: number, thumbnailPath?: string | null } }
          | { __typename: 'ProcessingItem', id: string }
          | { __typename: 'VideoItem', id: string, file: { __typename: 'VideoFile', relativeHeight: number, thumbnailPath?: string | null, posterThumbnailPath?: string | null } }
        > } }> } | null };

export const ItemDataFragmentDoc = gql`
    fragment ItemData on Item {
  __typename
  createdAt
  updatedAt
  description
  position
  id
  creator {
    username
    profilePicture {
      profilePicture256
      profilePicture64
    }
  }
  ... on VideoItem {
    file {
      __typename
      id
      originalType
      processingStatus
      processingProgress
      processingNotes
      updatedAt
      originalPath
      compressedPath
      thumbnailPath
      posterThumbnailPath
      unmodifiedCompressedPath
      unmodifiedThumbnailPosterPath
      modifications {
        crop {
          left
          top
          right
          bottom
        }
        trim {
          startTime
          endTime
        }
        normalize {
          enabled
        }
        fileType
      }
      relativeHeight
    }
    caption
    hasCaptions
    position
  }
  ... on ImageItem {
    file {
      __typename
      id
      originalType
      processingStatus
      processingProgress
      processingNotes
      updatedAt
      originalPath
      compressedPath
      thumbnailPath
      unmodifiedCompressedPath
      modifications {
        crop {
          left
          top
          right
          bottom
        }
        fileType
        template {
          areas {
            id
            x
            y
            width
            height
            rotation
            alignH
            alignV
            overflow
            font
            fontSize
            textColor
            backplateOpacity
            backplateColor
          }
        }
      }
      relativeHeight
    }
    caption
    position
  }
  ... on GifItem {
    file {
      __typename
      id
      originalType
      processingStatus
      processingProgress
      processingNotes
      updatedAt
      originalPath
      compressedPath
      compressedGifPath
      thumbnailPath
      unmodifiedCompressedPath
      modifications {
        crop {
          left
          top
          right
          bottom
        }
        trim {
          startTime
          endTime
        }
        fileType
      }
      relativeHeight
    }
    caption
    position
  }
  ... on AudioItem {
    file {
      __typename
      id
      originalType
      processingStatus
      processingProgress
      processingNotes
      updatedAt
      originalPath
      compressedPath
      unmodifiedCompressedPath
      modifications {
        crop {
          left
          top
          right
          bottom
        }
        trim {
          startTime
          endTime
        }
        normalize {
          enabled
        }
        fileType
      }
      waveform
      waveformThumbnail
    }
    caption
    position
  }
  ... on ProcessingItem {
    position
    fileId
    processingStatus
    processingProgress
    processingNotes
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
    profilePicture {
      profilePicture256
      profilePicture64
    }
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
      profilePicture {
        profilePicture256
        profilePicture64
      }
      username
    }
    items(first: 1) {
      totalCount
      nodes {
        id
        __typename
        ... on VideoItem {
          file {
            __typename
            relativeHeight
            thumbnailPath
            posterThumbnailPath
          }
        }
        ... on ImageItem {
          file {
            __typename
            relativeHeight
            thumbnailPath
          }
        }
        ... on GifItem {
          file {
            __typename
            relativeHeight
            thumbnailPath
          }
        }
        ... on AudioItem {
          captionPreview
          description
          file {
            __typename
            waveform
            waveformThumbnail
          }
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
    profilePicture {
      profilePicture256
      profilePicture64
    }
    linkedTelegram
    totpStatus {
      enabled
      recoveryCodesRemaining
    }
    passkeys {
      id
      name
      deviceType
      backedUp
      transports
      createdAt
    }
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
export const SignupAllowedDocument = gql`
    query signupAllowed {
  signupAllowed
}
    `;
export const SignupDocument = gql`
    mutation signup($username: String!, $name: String!, $password: String!) {
  signup(username: $username, name: $name, password: $password)
}
    `;
export const LoginDocument = gql`
    mutation login($username: String!, $password: String!) {
  login(username: $username, password: $password) {
    success
    requiresTotp
    pendingToken
  }
}
    `;
export const VerifyLoginTotpDocument = gql`
    mutation verifyLoginTotp($pendingToken: String!, $code: String!) {
  verifyLoginTotp(pendingToken: $pendingToken, code: $code)
}
    `;
export const LogoutDocument = gql`
    mutation logout {
  logout
}
    `;
export const InitTotpDocument = gql`
    mutation initTotp {
  initTotp {
    secret
    otpauthUrl
    qrCodeDataUrl
  }
}
    `;
export const ConfirmTotpDocument = gql`
    mutation confirmTotp($code: String!) {
  confirmTotp(code: $code) {
    recoveryCodes
  }
}
    `;
export const CancelTotpSetupDocument = gql`
    mutation cancelTotpSetup {
  cancelTotpSetup
}
    `;
export const DisableTotpDocument = gql`
    mutation disableTotp($password: String!, $code: String!) {
  disableTotp(password: $password, code: $code)
}
    `;
export const RegenerateRecoveryCodesDocument = gql`
    mutation regenerateRecoveryCodes($password: String!, $code: String!) {
  regenerateRecoveryCodes(password: $password, code: $code) {
    recoveryCodes
  }
}
    `;
export const GeneratePasskeyRegistrationOptionsDocument = gql`
    mutation generatePasskeyRegistrationOptions($name: String) {
  generatePasskeyRegistrationOptions(name: $name)
}
    `;
export const VerifyPasskeyRegistrationDocument = gql`
    mutation verifyPasskeyRegistration($response: String!, $name: String) {
  verifyPasskeyRegistration(response: $response, name: $name)
}
    `;
export const GeneratePasskeyAuthenticationOptionsDocument = gql`
    mutation generatePasskeyAuthenticationOptions {
  generatePasskeyAuthenticationOptions
}
    `;
export const VerifyPasskeyAuthenticationDocument = gql`
    mutation verifyPasskeyAuthentication($response: String!) {
  verifyPasskeyAuthentication(response: $response)
}
    `;
export const RenamePasskeyDocument = gql`
    mutation renamePasskey($passkeyId: String!, $name: String!) {
  renamePasskey(passkeyId: $passkeyId, name: $name)
}
    `;
export const DeletePasskeyDocument = gql`
    mutation deletePasskey($passkeyId: String!) {
  deletePasskey(passkeyId: $passkeyId)
}
    `;
export const ConvertItemDocument = gql`
    mutation convertItem($itemId: ID!, $targetType: FileType!, $crop: CropInput) {
  convertItem(itemId: $itemId, targetType: $targetType, crop: $crop)
}
    `;
export const CropItemDocument = gql`
    mutation cropItem($itemId: ID!, $crop: CropInput!) {
  cropItem(itemId: $itemId, crop: $crop)
}
    `;
export const TrimItemDocument = gql`
    mutation trimItem($itemId: ID!, $trim: TrimInput!) {
  trimItem(itemId: $itemId, trim: $trim)
}
    `;
export const ModifyItemDocument = gql`
    mutation modifyItem($itemId: ID!, $crop: CropInput, $trim: TrimInput, $normalize: NormalizeInput) {
  modifyItem(itemId: $itemId, crop: $crop, trim: $trim, normalize: $normalize)
}
    `;
export const NormalizeItemDocument = gql`
    mutation normalizeItem($itemId: ID!, $normalize: NormalizeInput!) {
  normalizeItem(itemId: $itemId, normalize: $normalize)
}
    `;
export const RemoveModificationsDocument = gql`
    mutation removeModifications($itemId: ID!, $removeModifications: [String!]!, $clearAllModifications: Boolean) {
  removeModifications(
    itemId: $itemId
    removeModifications: $removeModifications
    clearAllModifications: $clearAllModifications
  )
}
    `;
export const ResetAndReprocessFileDocument = gql`
    mutation resetAndReprocessFile($itemId: ID!) {
  resetAndReprocessFile(itemId: $itemId)
}
    `;
export const DuplicateItemDocument = gql`
    mutation duplicateItem($itemId: ID!) {
  duplicateItem(itemId: $itemId)
}
    `;
export const SetItemTemplateDocument = gql`
    mutation setItemTemplate($itemId: ID!, $template: TemplateInput) {
  setItemTemplate(itemId: $itemId, template: $template)
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
export const UploadItemFileDocument = gql`
    mutation uploadItemFile($file: Upload!, $type: FileType) {
  uploadItemFile(file: $file, type: $type)
}
    `;
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
export const DeleteTemporaryFileDocument = gql`
    mutation deleteTemporaryFile($fileId: String!) {
  deleteTemporaryFile(fileId: $fileId)
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
export const FileProcessingUpdatesDocument = gql`
    subscription fileProcessingUpdates($ids: [String!]!) {
  fileProcessingUpdates(ids: $ids) {
    kind
    file {
      id
      processingStatus
      processingProgress
      processingNotes
      ... on PhotoFile {
        originalPath
        compressedPath
        thumbnailPath
        relativeHeight
      }
      ... on VideoFile {
        originalPath
        compressedPath
        thumbnailPath
        posterThumbnailPath
        relativeHeight
      }
      ... on GifFile {
        originalPath
        compressedPath
        compressedGifPath
        thumbnailPath
        relativeHeight
      }
      ... on AudioFile {
        originalPath
        compressedPath
        waveform
        waveformThumbnail
      }
    }
    affectedItems {
      id
      typename
      position
    }
  }
}
    `;
export const ChangeNameDocument = gql`
    mutation changeName($newName: String!) {
  changeName(newName: $newName)
}
    `;
export const ChangePasswordDocument = gql`
    mutation changePassword($oldPassword: String!, $newPassword: String!, $code: String) {
  changePassword(
    oldPassword: $oldPassword
    newPassword: $newPassword
    code: $code
  )
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
    profilePicture {
      profilePicture256
      profilePicture64
    }
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
    profilePicture {
      profilePicture256
      profilePicture64
    }
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
      profilePicture {
        profilePicture256
        profilePicture64
      }
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
    profilePicture {
      profilePicture256
      profilePicture64
    }
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
const SignupAllowedDocumentString = print(SignupAllowedDocument);
const SignupDocumentString = print(SignupDocument);
const LoginDocumentString = print(LoginDocument);
const VerifyLoginTotpDocumentString = print(VerifyLoginTotpDocument);
const LogoutDocumentString = print(LogoutDocument);
const InitTotpDocumentString = print(InitTotpDocument);
const ConfirmTotpDocumentString = print(ConfirmTotpDocument);
const CancelTotpSetupDocumentString = print(CancelTotpSetupDocument);
const DisableTotpDocumentString = print(DisableTotpDocument);
const RegenerateRecoveryCodesDocumentString = print(RegenerateRecoveryCodesDocument);
const GeneratePasskeyRegistrationOptionsDocumentString = print(GeneratePasskeyRegistrationOptionsDocument);
const VerifyPasskeyRegistrationDocumentString = print(VerifyPasskeyRegistrationDocument);
const GeneratePasskeyAuthenticationOptionsDocumentString = print(GeneratePasskeyAuthenticationOptionsDocument);
const VerifyPasskeyAuthenticationDocumentString = print(VerifyPasskeyAuthenticationDocument);
const RenamePasskeyDocumentString = print(RenamePasskeyDocument);
const DeletePasskeyDocumentString = print(DeletePasskeyDocument);
const ConvertItemDocumentString = print(ConvertItemDocument);
const CropItemDocumentString = print(CropItemDocument);
const TrimItemDocumentString = print(TrimItemDocument);
const ModifyItemDocumentString = print(ModifyItemDocument);
const NormalizeItemDocumentString = print(NormalizeItemDocument);
const RemoveModificationsDocumentString = print(RemoveModificationsDocument);
const ResetAndReprocessFileDocumentString = print(ResetAndReprocessFileDocument);
const DuplicateItemDocumentString = print(DuplicateItemDocument);
const SetItemTemplateDocumentString = print(SetItemTemplateDocument);
const KeywordsDocumentString = print(KeywordsDocument);
const KeywordSearchDocumentString = print(KeywordSearchDocument);
const KeywordWithPostsDocumentString = print(KeywordWithPostsDocument);
const CreateKeywordDocumentString = print(CreateKeywordDocument);
const PostDocumentString = print(PostDocument);
const PostsDocumentString = print(PostsDocument);
const PostsTextOnlyDocumentString = print(PostsTextOnlyDocument);
const CreatePostDocumentString = print(CreatePostDocument);
const UploadItemFileDocumentString = print(UploadItemFileDocument);
const EditPostDocumentString = print(EditPostDocument);
const DeleteItemDocumentString = print(DeleteItemDocument);
const DeletePostDocumentString = print(DeletePostDocument);
const DeleteTemporaryFileDocumentString = print(DeleteTemporaryFileDocument);
const MergePostDocumentString = print(MergePostDocument);
const ReorderItemDocumentString = print(ReorderItemDocument);
const MoveItemDocumentString = print(MoveItemDocument);
const FileProcessingUpdatesDocumentString = print(FileProcessingUpdatesDocument);
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
    signupAllowed(variables?: SignupAllowedQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: SignupAllowedQuery; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<SignupAllowedQuery>(SignupAllowedDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'signupAllowed', 'query', variables);
    },
    signup(variables: SignupMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: SignupMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<SignupMutation>(SignupDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'signup', 'mutation', variables);
    },
    login(variables: LoginMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: LoginMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<LoginMutation>(LoginDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'login', 'mutation', variables);
    },
    verifyLoginTotp(variables: VerifyLoginTotpMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: VerifyLoginTotpMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<VerifyLoginTotpMutation>(VerifyLoginTotpDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'verifyLoginTotp', 'mutation', variables);
    },
    logout(variables?: LogoutMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: LogoutMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<LogoutMutation>(LogoutDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'logout', 'mutation', variables);
    },
    initTotp(variables?: InitTotpMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: InitTotpMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<InitTotpMutation>(InitTotpDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'initTotp', 'mutation', variables);
    },
    confirmTotp(variables: ConfirmTotpMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: ConfirmTotpMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<ConfirmTotpMutation>(ConfirmTotpDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'confirmTotp', 'mutation', variables);
    },
    cancelTotpSetup(variables?: CancelTotpSetupMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: CancelTotpSetupMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<CancelTotpSetupMutation>(CancelTotpSetupDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'cancelTotpSetup', 'mutation', variables);
    },
    disableTotp(variables: DisableTotpMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: DisableTotpMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<DisableTotpMutation>(DisableTotpDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'disableTotp', 'mutation', variables);
    },
    regenerateRecoveryCodes(variables: RegenerateRecoveryCodesMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: RegenerateRecoveryCodesMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<RegenerateRecoveryCodesMutation>(RegenerateRecoveryCodesDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'regenerateRecoveryCodes', 'mutation', variables);
    },
    generatePasskeyRegistrationOptions(variables?: GeneratePasskeyRegistrationOptionsMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: GeneratePasskeyRegistrationOptionsMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<GeneratePasskeyRegistrationOptionsMutation>(GeneratePasskeyRegistrationOptionsDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'generatePasskeyRegistrationOptions', 'mutation', variables);
    },
    verifyPasskeyRegistration(variables: VerifyPasskeyRegistrationMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: VerifyPasskeyRegistrationMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<VerifyPasskeyRegistrationMutation>(VerifyPasskeyRegistrationDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'verifyPasskeyRegistration', 'mutation', variables);
    },
    generatePasskeyAuthenticationOptions(variables?: GeneratePasskeyAuthenticationOptionsMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: GeneratePasskeyAuthenticationOptionsMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<GeneratePasskeyAuthenticationOptionsMutation>(GeneratePasskeyAuthenticationOptionsDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'generatePasskeyAuthenticationOptions', 'mutation', variables);
    },
    verifyPasskeyAuthentication(variables: VerifyPasskeyAuthenticationMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: VerifyPasskeyAuthenticationMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<VerifyPasskeyAuthenticationMutation>(VerifyPasskeyAuthenticationDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'verifyPasskeyAuthentication', 'mutation', variables);
    },
    renamePasskey(variables: RenamePasskeyMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: RenamePasskeyMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<RenamePasskeyMutation>(RenamePasskeyDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'renamePasskey', 'mutation', variables);
    },
    deletePasskey(variables: DeletePasskeyMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: DeletePasskeyMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<DeletePasskeyMutation>(DeletePasskeyDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deletePasskey', 'mutation', variables);
    },
    convertItem(variables: ConvertItemMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: ConvertItemMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<ConvertItemMutation>(ConvertItemDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'convertItem', 'mutation', variables);
    },
    cropItem(variables: CropItemMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: CropItemMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<CropItemMutation>(CropItemDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'cropItem', 'mutation', variables);
    },
    trimItem(variables: TrimItemMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: TrimItemMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<TrimItemMutation>(TrimItemDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'trimItem', 'mutation', variables);
    },
    modifyItem(variables: ModifyItemMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: ModifyItemMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<ModifyItemMutation>(ModifyItemDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'modifyItem', 'mutation', variables);
    },
    normalizeItem(variables: NormalizeItemMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: NormalizeItemMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<NormalizeItemMutation>(NormalizeItemDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'normalizeItem', 'mutation', variables);
    },
    removeModifications(variables: RemoveModificationsMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: RemoveModificationsMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<RemoveModificationsMutation>(RemoveModificationsDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'removeModifications', 'mutation', variables);
    },
    resetAndReprocessFile(variables: ResetAndReprocessFileMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: ResetAndReprocessFileMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<ResetAndReprocessFileMutation>(ResetAndReprocessFileDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'resetAndReprocessFile', 'mutation', variables);
    },
    duplicateItem(variables: DuplicateItemMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: DuplicateItemMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<DuplicateItemMutation>(DuplicateItemDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'duplicateItem', 'mutation', variables);
    },
    setItemTemplate(variables: SetItemTemplateMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: SetItemTemplateMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<SetItemTemplateMutation>(SetItemTemplateDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'setItemTemplate', 'mutation', variables);
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
    uploadItemFile(variables: UploadItemFileMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: UploadItemFileMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<UploadItemFileMutation>(UploadItemFileDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'uploadItemFile', 'mutation', variables);
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
    deleteTemporaryFile(variables: DeleteTemporaryFileMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: DeleteTemporaryFileMutation; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<DeleteTemporaryFileMutation>(DeleteTemporaryFileDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteTemporaryFile', 'mutation', variables);
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
    fileProcessingUpdates(variables: FileProcessingUpdatesSubscriptionVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<{ data: FileProcessingUpdatesSubscription; errors?: GraphQLError[]; extensions?: any; headers: Headers; status: number; }> {
        return withWrapper((wrappedRequestHeaders) => client.rawRequest<FileProcessingUpdatesSubscription>(FileProcessingUpdatesDocumentString, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'fileProcessingUpdates', 'subscription', variables);
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