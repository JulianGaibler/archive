/* eslint-disable @typescript-eslint/no-empty-object-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  GraphQLResolveInfo,
  GraphQLScalarType,
  GraphQLScalarTypeConfig,
} from 'graphql'
import { UserExternal } from '@src/models/UserModel.js'
import { PostExternal } from '@src/models/PostModel.js'
import { ItemExternal } from '@src/models/ItemModel.js'
import { KeywordExternal } from '@src/models/KeywordModel.js'
import { SessionExternal } from '@src/models/SessionModel.js'
import { FileExternal } from '@src/models/FileModel.js'
import { FileUpload } from 'graphql-upload/processRequest.mjs'
import { Context } from '@src/server.js'
export type Maybe<T> = T | null
export type InputMaybe<T> = Maybe<T>
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K]
}
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>
}
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>
}
export type MakeEmpty<
  T extends { [key: string]: unknown },
  K extends keyof T,
> = { [_ in K]?: never }
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never
    }
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
export type RequireFields<T, K extends keyof T> = Omit<T, K> & {
  [P in K]-?: NonNullable<T[P]>
}
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string }
  String: { input: string; output: string }
  Boolean: { input: boolean; output: boolean }
  Int: { input: number; output: number }
  Float: { input: number; output: number }
  /** A timestamp encoded as milliseconds since Unix Epoch in UTC. */
  DateTime: { input: number; output: number }
  /** The `Upload` scalar type represents a file upload. */
  Upload: { input: Promise<FileUpload>; output: Promise<FileUpload> }
}

/** Item affected by file processing, with type info to avoid frontend refetch. */
export type AffectedItem = {
  __typename?: 'AffectedItem'
  /** The item ID */
  id: Scalars['ID']['output']
  /** The item position in its post (for sorting) */
  position?: Maybe<Scalars['Int']['output']>
  /**
   * The item typename (VideoItem, ProcessingItem, AudioItem, etc.) Allows
   * frontend to update __typename without refetching entire post.
   */
  typename: Scalars['String']['output']
}

/** An audio file. */
export type AudioFile = File & {
  __typename?: 'AudioFile'
  compressedPath: Scalars['String']['output']
  createdAt: Scalars['DateTime']['output']
  creator: User
  /** The file UUID */
  id: Scalars['String']['output']
  modifications?: Maybe<FileModifications>
  originalPath: Scalars['String']['output']
  originalType: FileType
  processingNotes?: Maybe<Scalars['String']['output']>
  processingProgress?: Maybe<Scalars['Int']['output']>
  processingStatus: FileProcessingStatus
  unmodifiedCompressedPath?: Maybe<Scalars['String']['output']>
  updatedAt: Scalars['DateTime']['output']
  waveform: Array<Scalars['Float']['output']>
  waveformThumbnail: Array<Scalars['Float']['output']>
}

/** An audio item. */
export type AudioItem = Item &
  Node & {
    __typename?: 'AudioItem'
    caption: Scalars['String']['output']
    captionPreview: Scalars['String']['output']
    createdAt: Scalars['DateTime']['output']
    creator: User
    description: Scalars['String']['output']
    file: AudioFile
    /** The ID of an object */
    id: Scalars['ID']['output']
    position: Scalars['Int']['output']
    post: Post
    updatedAt: Scalars['DateTime']['output']
  }

/**
 * Input type for cropping parameters. Defines a rectangular area to crop from a
 * file.
 */
export type CropInput = {
  /** Bottom edge of the crop area in pixels. */
  bottom: Scalars['Int']['input']
  /** Left edge of the crop area in pixels. */
  left: Scalars['Int']['input']
  /** Right edge of the crop area in pixels. */
  right: Scalars['Int']['input']
  /** Top edge of the crop area in pixels. */
  top: Scalars['Int']['input']
}

/** Metadata about a crop modification. */
export type CropMetadata = {
  __typename?: 'CropMetadata'
  /** Bottom edge of the crop area in pixels. */
  bottom: Scalars['Int']['output']
  /** Left edge of the crop area in pixels. */
  left: Scalars['Int']['output']
  /** Right edge of the crop area in pixels. */
  right: Scalars['Int']['output']
  /** Top edge of the crop area in pixels. */
  top: Scalars['Int']['output']
}

export type EditItemInput = {
  caption?: InputMaybe<Scalars['String']['input']>
  description?: InputMaybe<Scalars['String']['input']>
  /** The ID of the item to edit. */
  id: Scalars['ID']['input']
}

/** Base interface for all file types. */
export type File = {
  createdAt: Scalars['DateTime']['output']
  creator: User
  /** The file UUID */
  id: Scalars['String']['output']
  /** Modifications applied to this file during reprocessing. */
  modifications?: Maybe<FileModifications>
  /**
   * The original file type before any conversions. Used to determine what
   * conversions are available.
   */
  originalType: FileType
  processingNotes?: Maybe<Scalars['String']['output']>
  processingProgress?: Maybe<Scalars['Int']['output']>
  processingStatus: FileProcessingStatus
  /** Path to the unmodified compressed variant (if modifications were applied). */
  unmodifiedCompressedPath?: Maybe<Scalars['String']['output']>
  updatedAt: Scalars['DateTime']['output']
}

/** Modifications applied to a file during reprocessing. */
export type FileModifications = {
  __typename?: 'FileModifications'
  /** Crop modification applied to the file. */
  crop?: Maybe<CropMetadata>
  /** File type conversion applied. */
  fileType?: Maybe<FileType>
  /** Audio normalization applied to the file. */
  normalize?: Maybe<NormalizeMetadata>
  /** Template configuration for text overlay areas. */
  template?: Maybe<TemplateConfig>
  /** Trim modification applied to the file. */
  trim?: Maybe<TrimMetadata>
}

/** The possible states of file processing. */
export enum FileProcessingStatus {
  /** The processing was successful. */
  Done = 'DONE',
  /** The processing has failed. */
  Failed = 'FAILED',
  /** The file is being processed. */
  Processing = 'PROCESSING',
  /** The file is waiting to be processed. */
  Queued = 'QUEUED',
}

/** Update data of a file's current processing status. */
export type FileProcessingUpdate = {
  __typename?: 'FileProcessingUpdate'
  /**
   * List of items that reference this file, with type information. Useful for
   * knowing which items were affected by the file processing and updating their
   * types in the frontend without refetching.
   */
  affectedItems?: Maybe<Array<AffectedItem>>
  /** The updated file. */
  file: File
  /** The ID of the file */
  id: Scalars['ID']['output']
  /** Indicates what kind of update this is. */
  kind: UpdateKind
}

/** File types that can be uploaded and processed. */
export enum FileType {
  /** A sound file. */
  Audio = 'AUDIO',
  /** A video without sound (animated image). */
  Gif = 'GIF',
  /** An image. */
  Image = 'IMAGE',
  /** A video with sound. */
  Video = 'VIDEO',
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
  Video = 'VIDEO',
}

/** A GIF file. */
export type GifFile = File & {
  __typename?: 'GifFile'
  compressedGifPath: Scalars['String']['output']
  compressedPath: Scalars['String']['output']
  createdAt: Scalars['DateTime']['output']
  creator: User
  /** The file UUID */
  id: Scalars['String']['output']
  modifications?: Maybe<FileModifications>
  originalPath: Scalars['String']['output']
  originalType: FileType
  processingNotes?: Maybe<Scalars['String']['output']>
  processingProgress?: Maybe<Scalars['Int']['output']>
  processingStatus: FileProcessingStatus
  relativeHeight: Scalars['Float']['output']
  thumbnailPath?: Maybe<Scalars['String']['output']>
  unmodifiedCompressedPath?: Maybe<Scalars['String']['output']>
  updatedAt: Scalars['DateTime']['output']
}

/** A GIF item. */
export type GifItem = Item &
  Node & {
    __typename?: 'GifItem'
    caption: Scalars['String']['output']
    createdAt: Scalars['DateTime']['output']
    creator: User
    description: Scalars['String']['output']
    file: GifFile
    /** The ID of an object */
    id: Scalars['ID']['output']
    position: Scalars['Int']['output']
    post: Post
    updatedAt: Scalars['DateTime']['output']
  }

/** An image item. */
export type ImageItem = Item &
  Node & {
    __typename?: 'ImageItem'
    caption: Scalars['String']['output']
    createdAt: Scalars['DateTime']['output']
    creator: User
    description: Scalars['String']['output']
    file: PhotoFile
    /** The ID of an object */
    id: Scalars['ID']['output']
    position: Scalars['Int']['output']
    post: Post
    updatedAt: Scalars['DateTime']['output']
  }

/** Base interface for all item types. */
export type Item = {
  createdAt: Scalars['DateTime']['output']
  creator: User
  description: Scalars['String']['output']
  /** The ID of an object */
  id: Scalars['ID']['output']
  position: Scalars['Int']['output']
  post: Post
  updatedAt: Scalars['DateTime']['output']
}

/** A connection to a list of items. */
export type ItemConnection = {
  __typename?: 'ItemConnection'
  /** When paginating forwards, the cursor to continue. */
  endCursor?: Maybe<Scalars['String']['output']>
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean']['output']
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean']['output']
  /** List of items. */
  nodes: Array<Item>
  /** When paginating backwards, the cursor to continue. */
  startCursor?: Maybe<Scalars['String']['output']>
  /** Total number of items. */
  totalCount: Scalars['Int']['output']
}

/** A keyword for categorizing Posts. */
export type Keyword = Node & {
  __typename?: 'Keyword'
  /** The ID of an object */
  id: Scalars['ID']['output']
  /** Identifies the keyword name. */
  name: Scalars['String']['output']
  /** The number of posts associated with this keyword. */
  postCount: Scalars['Int']['output']
  /** All Posts associated with this keyword. */
  posts?: Maybe<PostConnection>
}

/** A keyword for categorizing Posts. */
export type KeywordPostsArgs = {
  after?: InputMaybe<Scalars['String']['input']>
  before?: InputMaybe<Scalars['String']['input']>
  first?: InputMaybe<Scalars['Int']['input']>
  last?: InputMaybe<Scalars['Int']['input']>
}

/** A connection to a list of keywords. */
export type KeywordConnection = {
  __typename?: 'KeywordConnection'
  /** When paginating forwards, the cursor to continue. */
  endCursor?: Maybe<Scalars['String']['output']>
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean']['output']
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean']['output']
  /** List of keywords. */
  nodes: Array<Keyword>
  /** When paginating backwards, the cursor to continue. */
  startCursor?: Maybe<Scalars['String']['output']>
  /** Total number of keywords. */
  totalCount: Scalars['Int']['output']
}

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
  Turkish = 'TURKISH',
}

export type LoginResult = {
  __typename?: 'LoginResult'
  pendingToken?: Maybe<Scalars['String']['output']>
  requiresTotp: Scalars['Boolean']['output']
  success: Scalars['Boolean']['output']
}

export type Mutation = {
  __typename?: 'Mutation'
  /** Cancels an in-progress TOTP setup. */
  cancelTotpSetup: Scalars['Boolean']['output']
  /** Changes the name of the current user. */
  changeName: Scalars['Boolean']['output']
  /** Changes the password of the current user. */
  changePassword: Scalars['Boolean']['output']
  /** Deletes the profile picture of the current user. */
  clearProfilePicture: Scalars['Boolean']['output']
  /**
   * Confirms TOTP setup by verifying a code. Enables 2FA and returns recovery
   * codes.
   */
  confirmTotp: TotpConfirmResult
  /**
   * Convert an item's file to a different format. Creates new variants while
   * preserving the original. Returns the new file ID for subscription.
   */
  convertItem: Scalars['String']['output']
  /** Creates a new keyword. */
  createKeyword: Keyword
  /** Creates a new Post */
  createPost: Post
  /**
   * Crop an item's file. Creates new variants with crop applied while
   * preserving the original. Returns the new file ID for subscription.
   */
  cropItem: Scalars['String']['output']
  /**
   * Deletes an item from a post and reorders remaining items. Returns the ID of
   * the deleted item.
   */
  deleteItem: Scalars['ID']['output']
  /** Deleted a keyword. */
  deleteKeyword: Scalars['Boolean']['output']
  /** Deletes a passkey. */
  deletePasskey: Scalars['Boolean']['output']
  /**
   * Deletes a post and all its associated items and files. Returns the ID of
   * the deleted post.
   */
  deletePost: Scalars['ID']['output']
  /** Deletes a temporary file that has not been claimed by a resource. */
  deleteTemporaryFile: Scalars['Boolean']['output']
  /** Disables two-factor authentication. Requires password and TOTP code. */
  disableTotp: Scalars['Boolean']['output']
  /**
   * Duplicates an item within the same post. Creates an independent copy of the
   * item with its own file copy. The duplicate appears right after the original
   * item (position + 1). Returns the ID of the new duplicated item.
   */
  duplicateItem: Scalars['ID']['output']
  /** Edits a post. */
  editPost: Post
  /** Generates WebAuthn authentication options for passkey login. */
  generatePasskeyAuthenticationOptions: Scalars['String']['output']
  /** Generates WebAuthn registration options for adding a new passkey. */
  generatePasskeyRegistrationOptions: Scalars['String']['output']
  /** Initiates TOTP two-factor authentication setup. Returns QR code and secret. */
  initTotp: TotpSetupResult
  /** Associates the Telegram ID of a user with their Archive Profil. */
  linkTelegram: Scalars['Boolean']['output']
  /**
   * Creates a new session for the user. Returns login result with optional TOTP
   * challenge.
   */
  login: LoginResult
  /** Terminates the current users session. */
  logout: Scalars['Boolean']['output']
  /**
   * Merges one post into another, moving all items and optionally keywords.
   * Returns the number of items merged.
   */
  mergePost: Scalars['Int']['output']
  /**
   * Apply modifications (crop and/or trim) to an item's file. Creates new
   * variants with modifications applied while preserving the original. This is
   * more efficient than calling cropItem and trimItem separately. Returns the
   * new file ID for subscription.
   */
  modifyItem: Scalars['String']['output']
  /**
   * Moves an item from one post to another. Returns whether the source post was
   * deleted.
   */
  moveItem: Scalars['Boolean']['output']
  /**
   * Normalize an item's audio. Creates new variants with normalization applied
   * while preserving the original. Returns the new file ID for subscription.
   */
  normalizeItem: Scalars['String']['output']
  /** Regenerates recovery codes. Requires password and TOTP code. */
  regenerateRecoveryCodes: TotpConfirmResult
  /**
   * Remove specific modifications from an item or revert to original. Creates a
   * new file without the specified modifications. Returns the new file ID for
   * subscription.
   */
  removeModifications: Scalars['String']['output']
  /** Renames a passkey. */
  renamePasskey: Scalars['Boolean']['output']
  /**
   * Reorders an item within a post to a new position. Returns the new position
   * of the item.
   */
  reorderItem: Scalars['Int']['output']
  /**
   * Reorders multiple items within a post to the specified order. Items not
   * included will be placed after the reordered items maintaining their
   * relative positions. Return all item ids on the post in the new order.
   */
  reorderItems: Array<Scalars['ID']['output']>
  /**
   * Reset and reprocess a file: removes all modifications, deletes all
   * processed variants, and reprocesses from the original file. Useful for
   * recovering from processing errors.
   */
  resetAndReprocessFile: Scalars['String']['output']
  /** Revokes the session of a user. */
  revokeSession: Scalars['Boolean']['output']
  /**
   * Sets or clears the template configuration for an item's file. Pass null to
   * clear the template. Does not trigger reprocessing.
   */
  setItemTemplate: Scalars['Boolean']['output']
  /** Creates a new user and performs a login. */
  signup: Scalars['Boolean']['output']
  /**
   * Trim an item's file. Creates new variants with trim applied while
   * preserving the original. Returns the new file ID for subscription.
   */
  trimItem: Scalars['String']['output']
  /** Removed Telegram ID from Archive profile. */
  unlinkTelegram: Scalars['Boolean']['output']
  /**
   * Uploads a new file for an item. File starts processing immediately and
   * expires in 2 hours if not attached to a post. Returns the file ID.
   */
  uploadItemFile: Scalars['ID']['output']
  /** Sets the profile picture of the current user. */
  uploadProfilePicture: Scalars['Boolean']['output']
  /** Verifies a TOTP code to complete login for users with 2FA enabled. */
  verifyLoginTotp: Scalars['Boolean']['output']
  /** Verifies a passkey authentication response and creates a session. */
  verifyPasskeyAuthentication: Scalars['Boolean']['output']
  /** Verifies and saves a new passkey after browser attestation. */
  verifyPasskeyRegistration: Scalars['Boolean']['output']
}

export type MutationChangeNameArgs = {
  newName: Scalars['String']['input']
}

export type MutationChangePasswordArgs = {
  code?: InputMaybe<Scalars['String']['input']>
  newPassword: Scalars['String']['input']
  oldPassword: Scalars['String']['input']
}

export type MutationConfirmTotpArgs = {
  code: Scalars['String']['input']
}

export type MutationConvertItemArgs = {
  crop?: InputMaybe<CropInput>
  itemId: Scalars['ID']['input']
  targetType: FileType
}

export type MutationCreateKeywordArgs = {
  name: Scalars['String']['input']
}

export type MutationCreatePostArgs = {
  keywords?: InputMaybe<Array<Scalars['ID']['input']>>
  language: Language
  title: Scalars['String']['input']
}

export type MutationCropItemArgs = {
  crop: CropInput
  itemId: Scalars['ID']['input']
}

export type MutationDeleteItemArgs = {
  itemId: Scalars['ID']['input']
}

export type MutationDeleteKeywordArgs = {
  keywordId: Scalars['String']['input']
}

export type MutationDeletePasskeyArgs = {
  passkeyId: Scalars['String']['input']
}

export type MutationDeletePostArgs = {
  postId: Scalars['ID']['input']
}

export type MutationDeleteTemporaryFileArgs = {
  fileId: Scalars['String']['input']
}

export type MutationDisableTotpArgs = {
  code: Scalars['String']['input']
  password: Scalars['String']['input']
}

export type MutationDuplicateItemArgs = {
  itemId: Scalars['ID']['input']
}

export type MutationEditPostArgs = {
  items?: InputMaybe<Array<EditItemInput>>
  keywords: Array<Scalars['ID']['input']>
  language: Language
  newItems?: InputMaybe<Array<NewItemInput>>
  postId: Scalars['ID']['input']
  title: Scalars['String']['input']
}

export type MutationGeneratePasskeyRegistrationOptionsArgs = {
  name?: InputMaybe<Scalars['String']['input']>
}

export type MutationLinkTelegramArgs = {
  apiResponse: Scalars['String']['input']
}

export type MutationLoginArgs = {
  password: Scalars['String']['input']
  username: Scalars['String']['input']
}

export type MutationMergePostArgs = {
  mergeKeywords?: InputMaybe<Scalars['Boolean']['input']>
  sourcePostId: Scalars['ID']['input']
  targetPostId: Scalars['ID']['input']
}

export type MutationModifyItemArgs = {
  crop?: InputMaybe<CropInput>
  itemId: Scalars['ID']['input']
  normalize?: InputMaybe<NormalizeInput>
  trim?: InputMaybe<TrimInput>
}

export type MutationMoveItemArgs = {
  itemId: Scalars['ID']['input']
  keepEmptyPost?: InputMaybe<Scalars['Boolean']['input']>
  targetPostId: Scalars['ID']['input']
}

export type MutationNormalizeItemArgs = {
  itemId: Scalars['ID']['input']
  normalize: NormalizeInput
}

export type MutationRegenerateRecoveryCodesArgs = {
  code: Scalars['String']['input']
  password: Scalars['String']['input']
}

export type MutationRemoveModificationsArgs = {
  clearAllModifications?: InputMaybe<Scalars['Boolean']['input']>
  itemId: Scalars['ID']['input']
  removeModifications: Array<Scalars['String']['input']>
}

export type MutationRenamePasskeyArgs = {
  name: Scalars['String']['input']
  passkeyId: Scalars['String']['input']
}

export type MutationReorderItemArgs = {
  itemId: Scalars['ID']['input']
  newPosition: Scalars['Int']['input']
}

export type MutationReorderItemsArgs = {
  itemIds: Array<Scalars['ID']['input']>
  postId: Scalars['ID']['input']
}

export type MutationResetAndReprocessFileArgs = {
  itemId: Scalars['ID']['input']
}

export type MutationRevokeSessionArgs = {
  sessionId: Scalars['ID']['input']
}

export type MutationSetItemTemplateArgs = {
  itemId: Scalars['ID']['input']
  template?: InputMaybe<TemplateInput>
}

export type MutationSignupArgs = {
  name: Scalars['String']['input']
  password: Scalars['String']['input']
  username: Scalars['String']['input']
}

export type MutationTrimItemArgs = {
  itemId: Scalars['ID']['input']
  trim: TrimInput
}

export type MutationUploadItemFileArgs = {
  file: Scalars['Upload']['input']
  type?: InputMaybe<FileType>
}

export type MutationUploadProfilePictureArgs = {
  file: Scalars['Upload']['input']
}

export type MutationVerifyLoginTotpArgs = {
  code: Scalars['String']['input']
  pendingToken: Scalars['String']['input']
}

export type MutationVerifyPasskeyAuthenticationArgs = {
  response: Scalars['String']['input']
}

export type MutationVerifyPasskeyRegistrationArgs = {
  name?: InputMaybe<Scalars['String']['input']>
  response: Scalars['String']['input']
}

export type NewItemInput = {
  caption?: InputMaybe<Scalars['String']['input']>
  description?: InputMaybe<Scalars['String']['input']>
  /** A file to be added as a new item. */
  fileId: Scalars['String']['input']
}

/** An object with an ID */
export type Node = {
  /** The id of the object. */
  id: Scalars['ID']['output']
}

/** Input type for audio normalization parameters. */
export type NormalizeInput = {
  /** Whether audio normalization should be applied. */
  enabled: Scalars['Boolean']['input']
}

/** Metadata about an audio normalization modification. */
export type NormalizeMetadata = {
  __typename?: 'NormalizeMetadata'
  /** Whether audio normalization is applied. */
  enabled: Scalars['Boolean']['output']
}

export type Passkey = {
  __typename?: 'Passkey'
  backedUp: Scalars['Boolean']['output']
  createdAt: Scalars['DateTime']['output']
  deviceType: Scalars['String']['output']
  id: Scalars['String']['output']
  name: Scalars['String']['output']
  transports?: Maybe<Scalars['String']['output']>
}

/** A photo file. */
export type PhotoFile = File & {
  __typename?: 'PhotoFile'
  compressedPath: Scalars['String']['output']
  createdAt: Scalars['DateTime']['output']
  creator: User
  /** The file UUID */
  id: Scalars['String']['output']
  modifications?: Maybe<FileModifications>
  originalPath: Scalars['String']['output']
  originalType: FileType
  processingNotes?: Maybe<Scalars['String']['output']>
  processingProgress?: Maybe<Scalars['Int']['output']>
  processingStatus: FileProcessingStatus
  relativeHeight: Scalars['Float']['output']
  thumbnailPath?: Maybe<Scalars['String']['output']>
  unmodifiedCompressedPath?: Maybe<Scalars['String']['output']>
  updatedAt: Scalars['DateTime']['output']
}

/** A post. */
export type Post = Node & {
  __typename?: 'Post'
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output']
  creator: User
  /** The ID of an object */
  id: Scalars['ID']['output']
  /** Items in this post. */
  items: ItemConnection
  keywords: Array<Keyword>
  /** Language in which caption and title are written. */
  language: Language
  title: Scalars['String']['output']
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output']
}

/** A post. */
export type PostItemsArgs = {
  after?: InputMaybe<Scalars['String']['input']>
  before?: InputMaybe<Scalars['String']['input']>
  first?: InputMaybe<Scalars['Int']['input']>
  last?: InputMaybe<Scalars['Int']['input']>
}

/** A connection to a list of posts. */
export type PostConnection = {
  __typename?: 'PostConnection'
  /** When paginating forwards, the cursor to continue. */
  endCursor?: Maybe<Scalars['String']['output']>
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean']['output']
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean']['output']
  /** List of posts. */
  nodes: Array<Post>
  /** When paginating backwards, the cursor to continue. */
  startCursor?: Maybe<Scalars['String']['output']>
  /** Total number of posts. */
  totalCount: Scalars['Int']['output']
}

/** An item that is being processed. */
export type ProcessingItem = Item &
  Node & {
    __typename?: 'ProcessingItem'
    createdAt: Scalars['DateTime']['output']
    creator: User
    description: Scalars['String']['output']
    fileId: Scalars['ID']['output']
    /** The ID of an object */
    id: Scalars['ID']['output']
    position: Scalars['Int']['output']
    post: Post
    processingNotes?: Maybe<Scalars['String']['output']>
    processingProgress?: Maybe<Scalars['Int']['output']>
    processingStatus: FileProcessingStatus
    updatedAt: Scalars['DateTime']['output']
  }

/** A profile picture file. */
export type ProfilePictureFile = File & {
  __typename?: 'ProfilePictureFile'
  createdAt: Scalars['DateTime']['output']
  creator: User
  /** The file UUID */
  id: Scalars['String']['output']
  modifications?: Maybe<FileModifications>
  originalType: FileType
  processingNotes?: Maybe<Scalars['String']['output']>
  processingProgress?: Maybe<Scalars['Int']['output']>
  processingStatus: FileProcessingStatus
  profilePicture64: Scalars['String']['output']
  profilePicture256: Scalars['String']['output']
  unmodifiedCompressedPath?: Maybe<Scalars['String']['output']>
  updatedAt: Scalars['DateTime']['output']
}

export type Query = {
  __typename?: 'Query'
  /** Returns a list of posts. */
  items?: Maybe<ItemConnection>
  /** Returns a list of keywords. */
  keywords?: Maybe<KeywordConnection>
  /** Returns the currently authenticated user. */
  me?: Maybe<User>
  /** Fetches an object given its ID */
  node: Node
  /** Fetches objects given their IDs */
  nodes: Array<Maybe<Node>>
  /** Returns a list of posts. */
  posts?: Maybe<PostConnection>
  /** Returns whether new account signup is allowed on this server. */
  signupAllowed: Scalars['Boolean']['output']
  /** Returns user based on username */
  user?: Maybe<User>
  /** Returns a list of sessions of the the currently authenticated user. */
  userSessions: Array<Session>
  /** Returns a list of users. */
  users?: Maybe<UserConnection>
}

export type QueryItemsArgs = {
  after?: InputMaybe<Scalars['String']['input']>
  byContent?: InputMaybe<Scalars['String']['input']>
  byUsers?: InputMaybe<Array<Scalars['String']['input']>>
  first?: InputMaybe<Scalars['Int']['input']>
}

export type QueryKeywordsArgs = {
  after?: InputMaybe<Scalars['String']['input']>
  byName?: InputMaybe<Scalars['String']['input']>
  first?: InputMaybe<Scalars['Int']['input']>
  sortByPostCount?: InputMaybe<Scalars['Boolean']['input']>
}

export type QueryNodeArgs = {
  id: Scalars['ID']['input']
}

export type QueryNodesArgs = {
  ids: Array<Scalars['ID']['input']>
}

export type QueryPostsArgs = {
  after?: InputMaybe<Scalars['String']['input']>
  byContent?: InputMaybe<Scalars['String']['input']>
  byKeywords?: InputMaybe<Array<Scalars['ID']['input']>>
  byLanguage?: InputMaybe<Language>
  byTypes?: InputMaybe<Array<Format>>
  byUsers?: InputMaybe<Array<Scalars['String']['input']>>
  first?: InputMaybe<Scalars['Int']['input']>
}

export type QueryUserArgs = {
  username: Scalars['String']['input']
}

export type QueryUsersArgs = {
  after?: InputMaybe<Scalars['String']['input']>
  first?: InputMaybe<Scalars['Int']['input']>
  search?: InputMaybe<Scalars['String']['input']>
  sortByPostCount?: InputMaybe<Scalars['Boolean']['input']>
}

/** Represents a Session object of an user. */
export type Session = Node & {
  __typename?: 'Session'
  /** Identifies the date and time when the session was created. */
  createdAt: Scalars['DateTime']['output']
  /** Indicates if this is the current session. */
  current: Scalars['Boolean']['output']
  /** IP with which the session was created. */
  firstIp: Scalars['String']['output']
  /** The ID of an object */
  id: Scalars['ID']['output']
  /** Last IP that used this session. */
  latestIp: Scalars['String']['output']
  /** Identifies the date and time when the session was last used. */
  updatedAt: Scalars['DateTime']['output']
  /** User associated with that session */
  user?: Maybe<User>
  /** Last known User-Agent string of this session. */
  userAgent: Scalars['String']['output']
}

export type Subscription = {
  __typename?: 'Subscription'
  /** Returns updates from file processing. */
  fileProcessingUpdates: FileProcessingUpdate
}

export type SubscriptionFileProcessingUpdatesArgs = {
  ids: Array<Scalars['String']['input']>
}

/** A text overlay area within a template. */
export type TemplateArea = {
  __typename?: 'TemplateArea'
  alignH: Scalars['String']['output']
  alignV: Scalars['String']['output']
  backplateColor: Scalars['String']['output']
  backplateOpacity: Scalars['Int']['output']
  font: Scalars['String']['output']
  fontSize: Scalars['Int']['output']
  height: Scalars['Float']['output']
  id: Scalars['String']['output']
  overflow: Scalars['String']['output']
  rotation: Scalars['Float']['output']
  textColor: Scalars['String']['output']
  width: Scalars['Float']['output']
  x: Scalars['Float']['output']
  y: Scalars['Float']['output']
}

export type TemplateAreaInput = {
  alignH: Scalars['String']['input']
  alignV: Scalars['String']['input']
  backplateColor: Scalars['String']['input']
  backplateOpacity: Scalars['Int']['input']
  font: Scalars['String']['input']
  fontSize: Scalars['Int']['input']
  height: Scalars['Float']['input']
  id: Scalars['String']['input']
  overflow: Scalars['String']['input']
  rotation: Scalars['Float']['input']
  textColor: Scalars['String']['input']
  width: Scalars['Float']['input']
  x: Scalars['Float']['input']
  y: Scalars['Float']['input']
}

/** Template configuration for text overlay areas on an image. */
export type TemplateConfig = {
  __typename?: 'TemplateConfig'
  areas: Array<TemplateArea>
}

export type TemplateInput = {
  areas: Array<TemplateAreaInput>
}

export type TotpConfirmResult = {
  __typename?: 'TotpConfirmResult'
  recoveryCodes: Array<Scalars['String']['output']>
}

export type TotpSetupResult = {
  __typename?: 'TotpSetupResult'
  otpauthUrl: Scalars['String']['output']
  qrCodeDataUrl: Scalars['String']['output']
  secret: Scalars['String']['output']
}

export type TotpStatus = {
  __typename?: 'TotpStatus'
  enabled: Scalars['Boolean']['output']
  recoveryCodesRemaining: Scalars['Int']['output']
}

/**
 * Input type for trimming parameters. Defines a time range to trim from
 * video/audio files.
 */
export type TrimInput = {
  /** End time of the trim in seconds. */
  endTime: Scalars['Float']['input']
  /** Start time of the trim in seconds. */
  startTime: Scalars['Float']['input']
}

/** Metadata about a trim modification. */
export type TrimMetadata = {
  __typename?: 'TrimMetadata'
  /** End time of the trim in seconds. */
  endTime: Scalars['Float']['output']
  /** Start time of the trim in seconds. */
  startTime: Scalars['Float']['output']
}

/**
 * Enum that specifies if an update contains a new object, an update or if an
 * object has been deleted.
 */
export enum UpdateKind {
  /** Contains a changed object */
  Changed = 'CHANGED',
  /** Contains a new object */
  Created = 'CREATED',
  /** Contains a deleted object */
  Deleted = 'DELETED',
}

/** A user is an account that can make new content. */
export type User = Node & {
  __typename?: 'User'
  /** The ID of an object */
  id: Scalars['ID']['output']
  /** Shows if the user has a connected Telegram Account. */
  linkedTelegram?: Maybe<Scalars['Boolean']['output']>
  /** The user's profile name. */
  name: Scalars['String']['output']
  /** Registered passkeys. Only available for the current user via `me` query. */
  passkeys?: Maybe<Array<Passkey>>
  /** The number of posts created by this user. */
  postCount: Scalars['Int']['output']
  /** All Posts associated with this user. */
  posts?: Maybe<PostConnection>
  /** Profile picture file containing different sizes. */
  profilePicture?: Maybe<ProfilePictureFile>
  /**
   * Two-factor authentication status. Only available for the current user via
   * `me` query.
   */
  totpStatus?: Maybe<TotpStatus>
  /** The username used to login. */
  username: Scalars['String']['output']
}

/** A user is an account that can make new content. */
export type UserPostsArgs = {
  after?: InputMaybe<Scalars['String']['input']>
  before?: InputMaybe<Scalars['String']['input']>
  first?: InputMaybe<Scalars['Int']['input']>
  last?: InputMaybe<Scalars['Int']['input']>
}

/** A connection to a list of users. */
export type UserConnection = {
  __typename?: 'UserConnection'
  /** When paginating forwards, the cursor to continue. */
  endCursor?: Maybe<Scalars['String']['output']>
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean']['output']
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean']['output']
  /** List of users. */
  nodes: Array<User>
  /** When paginating backwards, the cursor to continue. */
  startCursor?: Maybe<Scalars['String']['output']>
  /** Total number of users. */
  totalCount: Scalars['Int']['output']
}

/** A video file. */
export type VideoFile = File & {
  __typename?: 'VideoFile'
  compressedPath: Scalars['String']['output']
  createdAt: Scalars['DateTime']['output']
  creator: User
  /** The file UUID */
  id: Scalars['String']['output']
  modifications?: Maybe<FileModifications>
  originalPath: Scalars['String']['output']
  originalType: FileType
  posterThumbnailPath?: Maybe<Scalars['String']['output']>
  processingNotes?: Maybe<Scalars['String']['output']>
  processingProgress?: Maybe<Scalars['Int']['output']>
  processingStatus: FileProcessingStatus
  relativeHeight: Scalars['Float']['output']
  thumbnailPath?: Maybe<Scalars['String']['output']>
  unmodifiedCompressedPath?: Maybe<Scalars['String']['output']>
  /** Path to the unmodified thumbnail poster (if modifications were applied). */
  unmodifiedThumbnailPosterPath?: Maybe<Scalars['String']['output']>
  updatedAt: Scalars['DateTime']['output']
}

/** A video item. */
export type VideoItem = Item &
  Node & {
    __typename?: 'VideoItem'
    caption: Scalars['String']['output']
    createdAt: Scalars['DateTime']['output']
    creator: User
    description: Scalars['String']['output']
    file: VideoFile
    hasCaptions: Scalars['Boolean']['output']
    /** The ID of an object */
    id: Scalars['ID']['output']
    position: Scalars['Int']['output']
    post: Post
    updatedAt: Scalars['DateTime']['output']
  }

export type WithIndex<TObject> = TObject & Record<string, any>
export type ResolversObject<TObject> = WithIndex<TObject>

export type ResolverTypeWrapper<T> = Promise<T> | T

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>
}
export type Resolver<
  TResult,
  TParent = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
  TArgs = Record<PropertyKey, never>,
> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => Promise<TResult> | TResult

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => TResult | Promise<TResult>

export interface SubscriptionSubscriberObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs,
> {
  subscribe: SubscriptionSubscribeFn<
    { [key in TKey]: TResult },
    TParent,
    TContext,
    TArgs
  >
  resolve?: SubscriptionResolveFn<
    TResult,
    { [key in TKey]: TResult },
    TContext,
    TArgs
  >
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>
}

export type SubscriptionObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs,
> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>

export type SubscriptionResolver<
  TResult,
  TKey extends string,
  TParent = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
  TArgs = Record<PropertyKey, never>,
> =
  | ((
      ...args: any[]
    ) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>

export type TypeResolveFn<
  TTypes,
  TParent = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo,
) => Maybe<TTypes> | Promise<Maybe<TTypes>>

export type IsTypeOfResolverFn<
  T = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
> = (
  obj: T,
  context: TContext,
  info: GraphQLResolveInfo,
) => boolean | Promise<boolean>

export type NextResolverFn<T> = () => Promise<T>

export type DirectiveResolverFn<
  TResult = Record<PropertyKey, never>,
  TParent = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
  TArgs = Record<PropertyKey, never>,
> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => TResult | Promise<TResult>

/** Mapping of interface types */
export type ResolversInterfaceTypes<_RefType extends Record<string, unknown>> =
  ResolversObject<{
    File:
      | (Omit<AudioFile, 'creator'> & { creator: _RefType['User'] })
      | (Omit<GifFile, 'creator'> & { creator: _RefType['User'] })
      | (Omit<PhotoFile, 'creator'> & { creator: _RefType['User'] })
      | (Omit<ProfilePictureFile, 'creator'> & { creator: _RefType['User'] })
      | (Omit<VideoFile, 'creator'> & { creator: _RefType['User'] })
    Item:
      | (Omit<AudioItem, 'creator' | 'file' | 'post'> & {
          creator: _RefType['User']
          file: _RefType['AudioFile']
          post: _RefType['Post']
        })
      | (Omit<GifItem, 'creator' | 'file' | 'post'> & {
          creator: _RefType['User']
          file: _RefType['GifFile']
          post: _RefType['Post']
        })
      | (Omit<ImageItem, 'creator' | 'file' | 'post'> & {
          creator: _RefType['User']
          file: _RefType['PhotoFile']
          post: _RefType['Post']
        })
      | (Omit<ProcessingItem, 'creator' | 'post'> & {
          creator: _RefType['User']
          post: _RefType['Post']
        })
      | (Omit<VideoItem, 'creator' | 'file' | 'post'> & {
          creator: _RefType['User']
          file: _RefType['VideoFile']
          post: _RefType['Post']
        })
    Node:
      | (Omit<AudioItem, 'creator' | 'file' | 'post'> & {
          creator: _RefType['User']
          file: _RefType['AudioFile']
          post: _RefType['Post']
        })
      | (Omit<GifItem, 'creator' | 'file' | 'post'> & {
          creator: _RefType['User']
          file: _RefType['GifFile']
          post: _RefType['Post']
        })
      | (Omit<ImageItem, 'creator' | 'file' | 'post'> & {
          creator: _RefType['User']
          file: _RefType['PhotoFile']
          post: _RefType['Post']
        })
      | KeywordExternal
      | PostExternal
      | (Omit<ProcessingItem, 'creator' | 'post'> & {
          creator: _RefType['User']
          post: _RefType['Post']
        })
      | SessionExternal
      | UserExternal
      | (Omit<VideoItem, 'creator' | 'file' | 'post'> & {
          creator: _RefType['User']
          file: _RefType['VideoFile']
          post: _RefType['Post']
        })
  }>

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  AffectedItem: ResolverTypeWrapper<AffectedItem>
  AudioFile: ResolverTypeWrapper<
    Omit<AudioFile, 'creator'> & { creator: ResolversTypes['User'] }
  >
  AudioItem: ResolverTypeWrapper<
    Omit<AudioItem, 'creator' | 'file' | 'post'> & {
      creator: ResolversTypes['User']
      file: ResolversTypes['AudioFile']
      post: ResolversTypes['Post']
    }
  >
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>
  CropInput: CropInput
  CropMetadata: ResolverTypeWrapper<CropMetadata>
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>
  EditItemInput: EditItemInput
  File: ResolverTypeWrapper<FileExternal>
  FileModifications: ResolverTypeWrapper<FileModifications>
  FileProcessingStatus: FileProcessingStatus
  FileProcessingUpdate: ResolverTypeWrapper<
    Omit<FileProcessingUpdate, 'file'> & { file: ResolversTypes['File'] }
  >
  FileType: FileType
  Float: ResolverTypeWrapper<Scalars['Float']['output']>
  Format: Format
  GifFile: ResolverTypeWrapper<
    Omit<GifFile, 'creator'> & { creator: ResolversTypes['User'] }
  >
  GifItem: ResolverTypeWrapper<
    Omit<GifItem, 'creator' | 'file' | 'post'> & {
      creator: ResolversTypes['User']
      file: ResolversTypes['GifFile']
      post: ResolversTypes['Post']
    }
  >
  ID: ResolverTypeWrapper<Scalars['ID']['output']>
  ImageItem: ResolverTypeWrapper<
    Omit<ImageItem, 'creator' | 'file' | 'post'> & {
      creator: ResolversTypes['User']
      file: ResolversTypes['PhotoFile']
      post: ResolversTypes['Post']
    }
  >
  Int: ResolverTypeWrapper<Scalars['Int']['output']>
  Item: ResolverTypeWrapper<ItemExternal>
  ItemConnection: ResolverTypeWrapper<
    Omit<ItemConnection, 'nodes'> & { nodes: Array<ResolversTypes['Item']> }
  >
  Keyword: ResolverTypeWrapper<KeywordExternal>
  KeywordConnection: ResolverTypeWrapper<
    Omit<KeywordConnection, 'nodes'> & {
      nodes: Array<ResolversTypes['Keyword']>
    }
  >
  Language: Language
  LoginResult: ResolverTypeWrapper<LoginResult>
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>
  NewItemInput: NewItemInput
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>
  NormalizeInput: NormalizeInput
  NormalizeMetadata: ResolverTypeWrapper<NormalizeMetadata>
  Passkey: ResolverTypeWrapper<Passkey>
  PhotoFile: ResolverTypeWrapper<
    Omit<PhotoFile, 'creator'> & { creator: ResolversTypes['User'] }
  >
  Post: ResolverTypeWrapper<PostExternal>
  PostConnection: ResolverTypeWrapper<
    Omit<PostConnection, 'nodes'> & { nodes: Array<ResolversTypes['Post']> }
  >
  ProcessingItem: ResolverTypeWrapper<
    Omit<ProcessingItem, 'creator' | 'post'> & {
      creator: ResolversTypes['User']
      post: ResolversTypes['Post']
    }
  >
  ProfilePictureFile: ResolverTypeWrapper<
    Omit<ProfilePictureFile, 'creator'> & { creator: ResolversTypes['User'] }
  >
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>
  Session: ResolverTypeWrapper<SessionExternal>
  String: ResolverTypeWrapper<Scalars['String']['output']>
  Subscription: ResolverTypeWrapper<Record<PropertyKey, never>>
  TemplateArea: ResolverTypeWrapper<TemplateArea>
  TemplateAreaInput: TemplateAreaInput
  TemplateConfig: ResolverTypeWrapper<TemplateConfig>
  TemplateInput: TemplateInput
  TotpConfirmResult: ResolverTypeWrapper<TotpConfirmResult>
  TotpSetupResult: ResolverTypeWrapper<TotpSetupResult>
  TotpStatus: ResolverTypeWrapper<TotpStatus>
  TrimInput: TrimInput
  TrimMetadata: ResolverTypeWrapper<TrimMetadata>
  UpdateKind: UpdateKind
  Upload: ResolverTypeWrapper<Scalars['Upload']['output']>
  User: ResolverTypeWrapper<UserExternal>
  UserConnection: ResolverTypeWrapper<
    Omit<UserConnection, 'nodes'> & { nodes: Array<ResolversTypes['User']> }
  >
  VideoFile: ResolverTypeWrapper<
    Omit<VideoFile, 'creator'> & { creator: ResolversTypes['User'] }
  >
  VideoItem: ResolverTypeWrapper<
    Omit<VideoItem, 'creator' | 'file' | 'post'> & {
      creator: ResolversTypes['User']
      file: ResolversTypes['VideoFile']
      post: ResolversTypes['Post']
    }
  >
}>

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  AffectedItem: AffectedItem
  AudioFile: Omit<AudioFile, 'creator'> & {
    creator: ResolversParentTypes['User']
  }
  AudioItem: Omit<AudioItem, 'creator' | 'file' | 'post'> & {
    creator: ResolversParentTypes['User']
    file: ResolversParentTypes['AudioFile']
    post: ResolversParentTypes['Post']
  }
  Boolean: Scalars['Boolean']['output']
  CropInput: CropInput
  CropMetadata: CropMetadata
  DateTime: Scalars['DateTime']['output']
  EditItemInput: EditItemInput
  File: FileExternal
  FileModifications: FileModifications
  FileProcessingUpdate: Omit<FileProcessingUpdate, 'file'> & {
    file: ResolversParentTypes['File']
  }
  Float: Scalars['Float']['output']
  GifFile: Omit<GifFile, 'creator'> & { creator: ResolversParentTypes['User'] }
  GifItem: Omit<GifItem, 'creator' | 'file' | 'post'> & {
    creator: ResolversParentTypes['User']
    file: ResolversParentTypes['GifFile']
    post: ResolversParentTypes['Post']
  }
  ID: Scalars['ID']['output']
  ImageItem: Omit<ImageItem, 'creator' | 'file' | 'post'> & {
    creator: ResolversParentTypes['User']
    file: ResolversParentTypes['PhotoFile']
    post: ResolversParentTypes['Post']
  }
  Int: Scalars['Int']['output']
  Item: ItemExternal
  ItemConnection: Omit<ItemConnection, 'nodes'> & {
    nodes: Array<ResolversParentTypes['Item']>
  }
  Keyword: KeywordExternal
  KeywordConnection: Omit<KeywordConnection, 'nodes'> & {
    nodes: Array<ResolversParentTypes['Keyword']>
  }
  LoginResult: LoginResult
  Mutation: Record<PropertyKey, never>
  NewItemInput: NewItemInput
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node']
  NormalizeInput: NormalizeInput
  NormalizeMetadata: NormalizeMetadata
  Passkey: Passkey
  PhotoFile: Omit<PhotoFile, 'creator'> & {
    creator: ResolversParentTypes['User']
  }
  Post: PostExternal
  PostConnection: Omit<PostConnection, 'nodes'> & {
    nodes: Array<ResolversParentTypes['Post']>
  }
  ProcessingItem: Omit<ProcessingItem, 'creator' | 'post'> & {
    creator: ResolversParentTypes['User']
    post: ResolversParentTypes['Post']
  }
  ProfilePictureFile: Omit<ProfilePictureFile, 'creator'> & {
    creator: ResolversParentTypes['User']
  }
  Query: Record<PropertyKey, never>
  Session: SessionExternal
  String: Scalars['String']['output']
  Subscription: Record<PropertyKey, never>
  TemplateArea: TemplateArea
  TemplateAreaInput: TemplateAreaInput
  TemplateConfig: TemplateConfig
  TemplateInput: TemplateInput
  TotpConfirmResult: TotpConfirmResult
  TotpSetupResult: TotpSetupResult
  TotpStatus: TotpStatus
  TrimInput: TrimInput
  TrimMetadata: TrimMetadata
  Upload: Scalars['Upload']['output']
  User: UserExternal
  UserConnection: Omit<UserConnection, 'nodes'> & {
    nodes: Array<ResolversParentTypes['User']>
  }
  VideoFile: Omit<VideoFile, 'creator'> & {
    creator: ResolversParentTypes['User']
  }
  VideoItem: Omit<VideoItem, 'creator' | 'file' | 'post'> & {
    creator: ResolversParentTypes['User']
    file: ResolversParentTypes['VideoFile']
    post: ResolversParentTypes['Post']
  }
}>

export type AffectedItemResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['AffectedItem'] =
    ResolversParentTypes['AffectedItem'],
> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>
  position?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>
  typename?: Resolver<ResolversTypes['String'], ParentType, ContextType>
}>

export type AudioFileResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['AudioFile'] =
    ResolversParentTypes['AudioFile'],
> = ResolversObject<{
  compressedPath?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  creator?: Resolver<ResolversTypes['User'], ParentType, ContextType>
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  modifications?: Resolver<
    Maybe<ResolversTypes['FileModifications']>,
    ParentType,
    ContextType
  >
  originalPath?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  originalType?: Resolver<ResolversTypes['FileType'], ParentType, ContextType>
  processingNotes?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  processingProgress?: Resolver<
    Maybe<ResolversTypes['Int']>,
    ParentType,
    ContextType
  >
  processingStatus?: Resolver<
    ResolversTypes['FileProcessingStatus'],
    ParentType,
    ContextType
  >
  unmodifiedCompressedPath?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  waveform?: Resolver<Array<ResolversTypes['Float']>, ParentType, ContextType>
  waveformThumbnail?: Resolver<
    Array<ResolversTypes['Float']>,
    ParentType,
    ContextType
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type AudioItemResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['AudioItem'] =
    ResolversParentTypes['AudioItem'],
> = ResolversObject<{
  caption?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  captionPreview?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  creator?: Resolver<ResolversTypes['User'], ParentType, ContextType>
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  file?: Resolver<ResolversTypes['AudioFile'], ParentType, ContextType>
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  post?: Resolver<ResolversTypes['Post'], ParentType, ContextType>
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type CropMetadataResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['CropMetadata'] =
    ResolversParentTypes['CropMetadata'],
> = ResolversObject<{
  bottom?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  left?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  right?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  top?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
}>

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<
  ResolversTypes['DateTime'],
  any
> {
  name: 'DateTime'
}

export type FileResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['File'] =
    ResolversParentTypes['File'],
> = ResolversObject<{
  __resolveType: TypeResolveFn<
    'AudioFile' | 'GifFile' | 'PhotoFile' | 'ProfilePictureFile' | 'VideoFile',
    ParentType,
    ContextType
  >
}>

export type FileModificationsResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['FileModifications'] =
    ResolversParentTypes['FileModifications'],
> = ResolversObject<{
  crop?: Resolver<
    Maybe<ResolversTypes['CropMetadata']>,
    ParentType,
    ContextType
  >
  fileType?: Resolver<
    Maybe<ResolversTypes['FileType']>,
    ParentType,
    ContextType
  >
  normalize?: Resolver<
    Maybe<ResolversTypes['NormalizeMetadata']>,
    ParentType,
    ContextType
  >
  template?: Resolver<
    Maybe<ResolversTypes['TemplateConfig']>,
    ParentType,
    ContextType
  >
  trim?: Resolver<
    Maybe<ResolversTypes['TrimMetadata']>,
    ParentType,
    ContextType
  >
}>

export type FileProcessingUpdateResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['FileProcessingUpdate'] =
    ResolversParentTypes['FileProcessingUpdate'],
> = ResolversObject<{
  affectedItems?: Resolver<
    Maybe<Array<ResolversTypes['AffectedItem']>>,
    ParentType,
    ContextType
  >
  file?: Resolver<ResolversTypes['File'], ParentType, ContextType>
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>
  kind?: Resolver<ResolversTypes['UpdateKind'], ParentType, ContextType>
}>

export type GifFileResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['GifFile'] =
    ResolversParentTypes['GifFile'],
> = ResolversObject<{
  compressedGifPath?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >
  compressedPath?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  creator?: Resolver<ResolversTypes['User'], ParentType, ContextType>
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  modifications?: Resolver<
    Maybe<ResolversTypes['FileModifications']>,
    ParentType,
    ContextType
  >
  originalPath?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  originalType?: Resolver<ResolversTypes['FileType'], ParentType, ContextType>
  processingNotes?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  processingProgress?: Resolver<
    Maybe<ResolversTypes['Int']>,
    ParentType,
    ContextType
  >
  processingStatus?: Resolver<
    ResolversTypes['FileProcessingStatus'],
    ParentType,
    ContextType
  >
  relativeHeight?: Resolver<ResolversTypes['Float'], ParentType, ContextType>
  thumbnailPath?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  unmodifiedCompressedPath?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type GifItemResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['GifItem'] =
    ResolversParentTypes['GifItem'],
> = ResolversObject<{
  caption?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  creator?: Resolver<ResolversTypes['User'], ParentType, ContextType>
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  file?: Resolver<ResolversTypes['GifFile'], ParentType, ContextType>
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  post?: Resolver<ResolversTypes['Post'], ParentType, ContextType>
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type ImageItemResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['ImageItem'] =
    ResolversParentTypes['ImageItem'],
> = ResolversObject<{
  caption?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  creator?: Resolver<ResolversTypes['User'], ParentType, ContextType>
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  file?: Resolver<ResolversTypes['PhotoFile'], ParentType, ContextType>
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  post?: Resolver<ResolversTypes['Post'], ParentType, ContextType>
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type ItemResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['Item'] =
    ResolversParentTypes['Item'],
> = ResolversObject<{
  __resolveType: TypeResolveFn<
    'AudioItem' | 'GifItem' | 'ImageItem' | 'ProcessingItem' | 'VideoItem',
    ParentType,
    ContextType
  >
}>

export type ItemConnectionResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['ItemConnection'] =
    ResolversParentTypes['ItemConnection'],
> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>
  nodes?: Resolver<Array<ResolversTypes['Item']>, ParentType, ContextType>
  startCursor?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
}>

export type KeywordResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['Keyword'] =
    ResolversParentTypes['Keyword'],
> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  postCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  posts?: Resolver<
    Maybe<ResolversTypes['PostConnection']>,
    ParentType,
    ContextType,
    Partial<KeywordPostsArgs>
  >
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type KeywordConnectionResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['KeywordConnection'] =
    ResolversParentTypes['KeywordConnection'],
> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>
  nodes?: Resolver<Array<ResolversTypes['Keyword']>, ParentType, ContextType>
  startCursor?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
}>

export type LoginResultResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['LoginResult'] =
    ResolversParentTypes['LoginResult'],
> = ResolversObject<{
  pendingToken?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  requiresTotp?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>
}>

export type MutationResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['Mutation'] =
    ResolversParentTypes['Mutation'],
> = ResolversObject<{
  cancelTotpSetup?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>
  changeName?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationChangeNameArgs, 'newName'>
  >
  changePassword?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationChangePasswordArgs, 'newPassword' | 'oldPassword'>
  >
  clearProfilePicture?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >
  confirmTotp?: Resolver<
    ResolversTypes['TotpConfirmResult'],
    ParentType,
    ContextType,
    RequireFields<MutationConfirmTotpArgs, 'code'>
  >
  convertItem?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType,
    RequireFields<MutationConvertItemArgs, 'itemId' | 'targetType'>
  >
  createKeyword?: Resolver<
    ResolversTypes['Keyword'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateKeywordArgs, 'name'>
  >
  createPost?: Resolver<
    ResolversTypes['Post'],
    ParentType,
    ContextType,
    RequireFields<MutationCreatePostArgs, 'language' | 'title'>
  >
  cropItem?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType,
    RequireFields<MutationCropItemArgs, 'crop' | 'itemId'>
  >
  deleteItem?: Resolver<
    ResolversTypes['ID'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteItemArgs, 'itemId'>
  >
  deleteKeyword?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteKeywordArgs, 'keywordId'>
  >
  deletePasskey?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationDeletePasskeyArgs, 'passkeyId'>
  >
  deletePost?: Resolver<
    ResolversTypes['ID'],
    ParentType,
    ContextType,
    RequireFields<MutationDeletePostArgs, 'postId'>
  >
  deleteTemporaryFile?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteTemporaryFileArgs, 'fileId'>
  >
  disableTotp?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationDisableTotpArgs, 'code' | 'password'>
  >
  duplicateItem?: Resolver<
    ResolversTypes['ID'],
    ParentType,
    ContextType,
    RequireFields<MutationDuplicateItemArgs, 'itemId'>
  >
  editPost?: Resolver<
    ResolversTypes['Post'],
    ParentType,
    ContextType,
    RequireFields<
      MutationEditPostArgs,
      'keywords' | 'language' | 'postId' | 'title'
    >
  >
  generatePasskeyAuthenticationOptions?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >
  generatePasskeyRegistrationOptions?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType,
    Partial<MutationGeneratePasskeyRegistrationOptionsArgs>
  >
  initTotp?: Resolver<
    ResolversTypes['TotpSetupResult'],
    ParentType,
    ContextType
  >
  linkTelegram?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationLinkTelegramArgs, 'apiResponse'>
  >
  login?: Resolver<
    ResolversTypes['LoginResult'],
    ParentType,
    ContextType,
    RequireFields<MutationLoginArgs, 'password' | 'username'>
  >
  logout?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>
  mergePost?: Resolver<
    ResolversTypes['Int'],
    ParentType,
    ContextType,
    RequireFields<
      MutationMergePostArgs,
      'mergeKeywords' | 'sourcePostId' | 'targetPostId'
    >
  >
  modifyItem?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType,
    RequireFields<MutationModifyItemArgs, 'itemId'>
  >
  moveItem?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<
      MutationMoveItemArgs,
      'itemId' | 'keepEmptyPost' | 'targetPostId'
    >
  >
  normalizeItem?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType,
    RequireFields<MutationNormalizeItemArgs, 'itemId' | 'normalize'>
  >
  regenerateRecoveryCodes?: Resolver<
    ResolversTypes['TotpConfirmResult'],
    ParentType,
    ContextType,
    RequireFields<MutationRegenerateRecoveryCodesArgs, 'code' | 'password'>
  >
  removeModifications?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType,
    RequireFields<
      MutationRemoveModificationsArgs,
      'itemId' | 'removeModifications'
    >
  >
  renamePasskey?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationRenamePasskeyArgs, 'name' | 'passkeyId'>
  >
  reorderItem?: Resolver<
    ResolversTypes['Int'],
    ParentType,
    ContextType,
    RequireFields<MutationReorderItemArgs, 'itemId' | 'newPosition'>
  >
  reorderItems?: Resolver<
    Array<ResolversTypes['ID']>,
    ParentType,
    ContextType,
    RequireFields<MutationReorderItemsArgs, 'itemIds' | 'postId'>
  >
  resetAndReprocessFile?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType,
    RequireFields<MutationResetAndReprocessFileArgs, 'itemId'>
  >
  revokeSession?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationRevokeSessionArgs, 'sessionId'>
  >
  setItemTemplate?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationSetItemTemplateArgs, 'itemId'>
  >
  signup?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationSignupArgs, 'name' | 'password' | 'username'>
  >
  trimItem?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType,
    RequireFields<MutationTrimItemArgs, 'itemId' | 'trim'>
  >
  unlinkTelegram?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>
  uploadItemFile?: Resolver<
    ResolversTypes['ID'],
    ParentType,
    ContextType,
    RequireFields<MutationUploadItemFileArgs, 'file'>
  >
  uploadProfilePicture?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationUploadProfilePictureArgs, 'file'>
  >
  verifyLoginTotp?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationVerifyLoginTotpArgs, 'code' | 'pendingToken'>
  >
  verifyPasskeyAuthentication?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationVerifyPasskeyAuthenticationArgs, 'response'>
  >
  verifyPasskeyRegistration?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationVerifyPasskeyRegistrationArgs, 'response'>
  >
}>

export type NodeResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['Node'] =
    ResolversParentTypes['Node'],
> = ResolversObject<{
  __resolveType: TypeResolveFn<
    | 'AudioItem'
    | 'GifItem'
    | 'ImageItem'
    | 'Keyword'
    | 'Post'
    | 'ProcessingItem'
    | 'Session'
    | 'User'
    | 'VideoItem',
    ParentType,
    ContextType
  >
}>

export type NormalizeMetadataResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['NormalizeMetadata'] =
    ResolversParentTypes['NormalizeMetadata'],
> = ResolversObject<{
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>
}>

export type PasskeyResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['Passkey'] =
    ResolversParentTypes['Passkey'],
> = ResolversObject<{
  backedUp?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  deviceType?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  transports?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
}>

export type PhotoFileResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['PhotoFile'] =
    ResolversParentTypes['PhotoFile'],
> = ResolversObject<{
  compressedPath?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  creator?: Resolver<ResolversTypes['User'], ParentType, ContextType>
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  modifications?: Resolver<
    Maybe<ResolversTypes['FileModifications']>,
    ParentType,
    ContextType
  >
  originalPath?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  originalType?: Resolver<ResolversTypes['FileType'], ParentType, ContextType>
  processingNotes?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  processingProgress?: Resolver<
    Maybe<ResolversTypes['Int']>,
    ParentType,
    ContextType
  >
  processingStatus?: Resolver<
    ResolversTypes['FileProcessingStatus'],
    ParentType,
    ContextType
  >
  relativeHeight?: Resolver<ResolversTypes['Float'], ParentType, ContextType>
  thumbnailPath?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  unmodifiedCompressedPath?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type PostResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['Post'] =
    ResolversParentTypes['Post'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  creator?: Resolver<ResolversTypes['User'], ParentType, ContextType>
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>
  items?: Resolver<
    ResolversTypes['ItemConnection'],
    ParentType,
    ContextType,
    Partial<PostItemsArgs>
  >
  keywords?: Resolver<Array<ResolversTypes['Keyword']>, ParentType, ContextType>
  language?: Resolver<ResolversTypes['Language'], ParentType, ContextType>
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type PostConnectionResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['PostConnection'] =
    ResolversParentTypes['PostConnection'],
> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>
  nodes?: Resolver<Array<ResolversTypes['Post']>, ParentType, ContextType>
  startCursor?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
}>

export type ProcessingItemResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['ProcessingItem'] =
    ResolversParentTypes['ProcessingItem'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  creator?: Resolver<ResolversTypes['User'], ParentType, ContextType>
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  fileId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  post?: Resolver<ResolversTypes['Post'], ParentType, ContextType>
  processingNotes?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  processingProgress?: Resolver<
    Maybe<ResolversTypes['Int']>,
    ParentType,
    ContextType
  >
  processingStatus?: Resolver<
    ResolversTypes['FileProcessingStatus'],
    ParentType,
    ContextType
  >
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type ProfilePictureFileResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['ProfilePictureFile'] =
    ResolversParentTypes['ProfilePictureFile'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  creator?: Resolver<ResolversTypes['User'], ParentType, ContextType>
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  modifications?: Resolver<
    Maybe<ResolversTypes['FileModifications']>,
    ParentType,
    ContextType
  >
  originalType?: Resolver<ResolversTypes['FileType'], ParentType, ContextType>
  processingNotes?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  processingProgress?: Resolver<
    Maybe<ResolversTypes['Int']>,
    ParentType,
    ContextType
  >
  processingStatus?: Resolver<
    ResolversTypes['FileProcessingStatus'],
    ParentType,
    ContextType
  >
  profilePicture64?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  profilePicture256?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >
  unmodifiedCompressedPath?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type QueryResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['Query'] =
    ResolversParentTypes['Query'],
> = ResolversObject<{
  items?: Resolver<
    Maybe<ResolversTypes['ItemConnection']>,
    ParentType,
    ContextType,
    Partial<QueryItemsArgs>
  >
  keywords?: Resolver<
    Maybe<ResolversTypes['KeywordConnection']>,
    ParentType,
    ContextType,
    Partial<QueryKeywordsArgs>
  >
  me?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>
  node?: Resolver<
    ResolversTypes['Node'],
    ParentType,
    ContextType,
    RequireFields<QueryNodeArgs, 'id'>
  >
  nodes?: Resolver<
    Array<Maybe<ResolversTypes['Node']>>,
    ParentType,
    ContextType,
    RequireFields<QueryNodesArgs, 'ids'>
  >
  posts?: Resolver<
    Maybe<ResolversTypes['PostConnection']>,
    ParentType,
    ContextType,
    Partial<QueryPostsArgs>
  >
  signupAllowed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>
  user?: Resolver<
    Maybe<ResolversTypes['User']>,
    ParentType,
    ContextType,
    RequireFields<QueryUserArgs, 'username'>
  >
  userSessions?: Resolver<
    Array<ResolversTypes['Session']>,
    ParentType,
    ContextType
  >
  users?: Resolver<
    Maybe<ResolversTypes['UserConnection']>,
    ParentType,
    ContextType,
    Partial<QueryUsersArgs>
  >
}>

export type SessionResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['Session'] =
    ResolversParentTypes['Session'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  current?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>
  firstIp?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>
  latestIp?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>
  userAgent?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type SubscriptionResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['Subscription'] =
    ResolversParentTypes['Subscription'],
> = ResolversObject<{
  fileProcessingUpdates?: SubscriptionResolver<
    ResolversTypes['FileProcessingUpdate'],
    'fileProcessingUpdates',
    ParentType,
    ContextType,
    RequireFields<SubscriptionFileProcessingUpdatesArgs, 'ids'>
  >
}>

export type TemplateAreaResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['TemplateArea'] =
    ResolversParentTypes['TemplateArea'],
> = ResolversObject<{
  alignH?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  alignV?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  backplateColor?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  backplateOpacity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  font?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  fontSize?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  height?: Resolver<ResolversTypes['Float'], ParentType, ContextType>
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  overflow?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  rotation?: Resolver<ResolversTypes['Float'], ParentType, ContextType>
  textColor?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  width?: Resolver<ResolversTypes['Float'], ParentType, ContextType>
  x?: Resolver<ResolversTypes['Float'], ParentType, ContextType>
  y?: Resolver<ResolversTypes['Float'], ParentType, ContextType>
}>

export type TemplateConfigResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['TemplateConfig'] =
    ResolversParentTypes['TemplateConfig'],
> = ResolversObject<{
  areas?: Resolver<
    Array<ResolversTypes['TemplateArea']>,
    ParentType,
    ContextType
  >
}>

export type TotpConfirmResultResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['TotpConfirmResult'] =
    ResolversParentTypes['TotpConfirmResult'],
> = ResolversObject<{
  recoveryCodes?: Resolver<
    Array<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
}>

export type TotpSetupResultResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['TotpSetupResult'] =
    ResolversParentTypes['TotpSetupResult'],
> = ResolversObject<{
  otpauthUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  qrCodeDataUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  secret?: Resolver<ResolversTypes['String'], ParentType, ContextType>
}>

export type TotpStatusResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['TotpStatus'] =
    ResolversParentTypes['TotpStatus'],
> = ResolversObject<{
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>
  recoveryCodesRemaining?: Resolver<
    ResolversTypes['Int'],
    ParentType,
    ContextType
  >
}>

export type TrimMetadataResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['TrimMetadata'] =
    ResolversParentTypes['TrimMetadata'],
> = ResolversObject<{
  endTime?: Resolver<ResolversTypes['Float'], ParentType, ContextType>
  startTime?: Resolver<ResolversTypes['Float'], ParentType, ContextType>
}>

export interface UploadScalarConfig extends GraphQLScalarTypeConfig<
  ResolversTypes['Upload'],
  any
> {
  name: 'Upload'
}

export type UserResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['User'] =
    ResolversParentTypes['User'],
> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>
  linkedTelegram?: Resolver<
    Maybe<ResolversTypes['Boolean']>,
    ParentType,
    ContextType
  >
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  passkeys?: Resolver<
    Maybe<Array<ResolversTypes['Passkey']>>,
    ParentType,
    ContextType
  >
  postCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  posts?: Resolver<
    Maybe<ResolversTypes['PostConnection']>,
    ParentType,
    ContextType,
    Partial<UserPostsArgs>
  >
  profilePicture?: Resolver<
    Maybe<ResolversTypes['ProfilePictureFile']>,
    ParentType,
    ContextType
  >
  totpStatus?: Resolver<
    Maybe<ResolversTypes['TotpStatus']>,
    ParentType,
    ContextType
  >
  username?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type UserConnectionResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['UserConnection'] =
    ResolversParentTypes['UserConnection'],
> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>
  nodes?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType>
  startCursor?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
}>

export type VideoFileResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['VideoFile'] =
    ResolversParentTypes['VideoFile'],
> = ResolversObject<{
  compressedPath?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  creator?: Resolver<ResolversTypes['User'], ParentType, ContextType>
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  modifications?: Resolver<
    Maybe<ResolversTypes['FileModifications']>,
    ParentType,
    ContextType
  >
  originalPath?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  originalType?: Resolver<ResolversTypes['FileType'], ParentType, ContextType>
  posterThumbnailPath?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  processingNotes?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  processingProgress?: Resolver<
    Maybe<ResolversTypes['Int']>,
    ParentType,
    ContextType
  >
  processingStatus?: Resolver<
    ResolversTypes['FileProcessingStatus'],
    ParentType,
    ContextType
  >
  relativeHeight?: Resolver<ResolversTypes['Float'], ParentType, ContextType>
  thumbnailPath?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  unmodifiedCompressedPath?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  unmodifiedThumbnailPosterPath?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type VideoItemResolvers<
  ContextType = Context,
  ParentType extends ResolversParentTypes['VideoItem'] =
    ResolversParentTypes['VideoItem'],
> = ResolversObject<{
  caption?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  creator?: Resolver<ResolversTypes['User'], ParentType, ContextType>
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  file?: Resolver<ResolversTypes['VideoFile'], ParentType, ContextType>
  hasCaptions?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>
  post?: Resolver<ResolversTypes['Post'], ParentType, ContextType>
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>
}>

export type Resolvers<ContextType = Context> = ResolversObject<{
  AffectedItem?: AffectedItemResolvers<ContextType>
  AudioFile?: AudioFileResolvers<ContextType>
  AudioItem?: AudioItemResolvers<ContextType>
  CropMetadata?: CropMetadataResolvers<ContextType>
  DateTime?: GraphQLScalarType
  File?: FileResolvers<ContextType>
  FileModifications?: FileModificationsResolvers<ContextType>
  FileProcessingUpdate?: FileProcessingUpdateResolvers<ContextType>
  GifFile?: GifFileResolvers<ContextType>
  GifItem?: GifItemResolvers<ContextType>
  ImageItem?: ImageItemResolvers<ContextType>
  Item?: ItemResolvers<ContextType>
  ItemConnection?: ItemConnectionResolvers<ContextType>
  Keyword?: KeywordResolvers<ContextType>
  KeywordConnection?: KeywordConnectionResolvers<ContextType>
  LoginResult?: LoginResultResolvers<ContextType>
  Mutation?: MutationResolvers<ContextType>
  Node?: NodeResolvers<ContextType>
  NormalizeMetadata?: NormalizeMetadataResolvers<ContextType>
  Passkey?: PasskeyResolvers<ContextType>
  PhotoFile?: PhotoFileResolvers<ContextType>
  Post?: PostResolvers<ContextType>
  PostConnection?: PostConnectionResolvers<ContextType>
  ProcessingItem?: ProcessingItemResolvers<ContextType>
  ProfilePictureFile?: ProfilePictureFileResolvers<ContextType>
  Query?: QueryResolvers<ContextType>
  Session?: SessionResolvers<ContextType>
  Subscription?: SubscriptionResolvers<ContextType>
  TemplateArea?: TemplateAreaResolvers<ContextType>
  TemplateConfig?: TemplateConfigResolvers<ContextType>
  TotpConfirmResult?: TotpConfirmResultResolvers<ContextType>
  TotpSetupResult?: TotpSetupResultResolvers<ContextType>
  TotpStatus?: TotpStatusResolvers<ContextType>
  TrimMetadata?: TrimMetadataResolvers<ContextType>
  Upload?: GraphQLScalarType
  User?: UserResolvers<ContextType>
  UserConnection?: UserConnectionResolvers<ContextType>
  VideoFile?: VideoFileResolvers<ContextType>
  VideoItem?: VideoItemResolvers<ContextType>
}>
