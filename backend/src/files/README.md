# File Processing Pipeline

Comprehensive documentation for the archive file processing system.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [File Lifecycle](#file-lifecycle)
- [Variant Management](#variant-management)
- [Modification System](#modification-system)
- [Reprocessing Flow](#reprocessing-flow)
- [Error Handling](#error-handling)
- [Troubleshooting](#troubleshooting)
- [Tools & Scripts](#tools--scripts)

## Architecture Overview

The file processing pipeline follows a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                        GraphQL API                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Mutations    │  │ Queries      │  │ Subscriptions│     │
│  │ (file ops)   │  │ (file data)  │  │ (updates)    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                       ItemActions                            │
│              (Authorization & Business Logic)                │
│  - Validates user permissions                                │
│  - Validates modification parameters before queueing         │
│  - Coordinates file modifications with items                 │
└─────────────────────────────────────────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                       FileActions                            │
│           (Database Operations & Coordination)               │
│  - Manages file records and variants in database             │
│  - Coordinates with FileStorage for physical files           │
│  - Publishes subscription updates (batched)                  │
│  - Maintains dataloader cache consistency                    │
└─────────────────────────────────────────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                       FileStorage                            │
│              (Physical File Management)                      │
│  - Queue management (priority, concurrency)                  │
│  - Temp directory for processing                             │
│  - Atomic file moves with rollback                           │
│  - Variant lifecycle management                              │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    FileProcessor                             │
│         (FFmpeg/Sharp Processing Logic)                      │
│  - Video transcoding, compression, thumbnails                │
│  - Image resizing, format conversion                         │
│  - Audio extraction, waveform generation                     │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

- **GraphQL API**: Entry point for all file operations
- **ItemActions**: Authorization and business logic layer
- **FileActions**: Database operations and coordination
- **FileStorage**: Physical file and queue management
- **FileProcessor**: Media processing (FFmpeg/Sharp)

## File Lifecycle

### 1. Upload → QUEUED

```typescript
// User uploads a file
uploadItemFile(file: Upload!) → fileId

// System creates:
// - File record in DB (status: QUEUED)
// - ORIGINAL variant on disk
// - Processing queued automatically
```

**Database State:**

- `processingStatus`: `QUEUED`
- `processingProgress`: 0
- `type`: Detected from file (VIDEO, IMAGE, etc.)

### 2. QUEUED → PROCESSING

```typescript
// FileStorage picks file from queue
checkQueue() → processQueuedFiles()

// System updates:
// - DB status to PROCESSING
// - Publishes subscription update
```

**Database State:**

- `processingStatus`: `PROCESSING`
- `processingProgress`: 0-99 (incremental)
- Processing happens in temp directory

### 3. PROCESSING → DONE/FAILED

```typescript
// Processing completes successfully
moveAndRegisterFileVariants()

// System creates:
// - COMPRESSED variant
// - THUMBNAIL variant
// - THUMBNAIL_POSTER variant (videos only)
// - Updates DB with DONE status
```

**Database State (DONE):**

- `processingStatus`: `DONE`
- `processingProgress`: 100
- All variants registered in `file_variant` table

**Database State (FAILED):**

- `processingStatus`: `FAILED`
- `processingNotes`: Error message
- Original file preserved, no variants created

## Variant Management

### Variant Types

| Variant                       | Purpose                          | When Created       | Can Be Modified |
| ----------------------------- | -------------------------------- | ------------------ | --------------- |
| `ORIGINAL`                    | Source file, never modified      | Initial upload     | ❌ Never        |
| `COMPRESSED`                  | Optimized for display            | Initial processing | ✅ Reprocessing |
| `COMPRESSED_GIF`              | GIF version of video             | GIF conversion     | ✅ Reprocessing |
| `THUMBNAIL`                   | Small preview image              | Initial processing | ✅ Reprocessing |
| `THUMBNAIL_POSTER`            | Video poster frame               | Video processing   | ✅ Reprocessing |
| `UNMODIFIED_COMPRESSED`       | Backup before first modification | First modification | ❌ Preserved    |
| `UNMODIFIED_THUMBNAIL_POSTER` | Backup before first modification | First modification | ❌ Preserved    |

### UNMODIFIED Variant Lifecycle

```
Initial Upload
├─> ORIGINAL (never changes)
├─> COMPRESSED
└─> THUMBNAIL_POSTER

First Modification (crop/trim)
├─> COMPRESSED → UNMODIFIED_COMPRESSED (backup)
├─> THUMBNAIL_POSTER → UNMODIFIED_THUMBNAIL_POSTER (backup)
├─> New COMPRESSED (modified)
└─> New THUMBNAIL_POSTER (modified)

Subsequent Modifications
├─> UNMODIFIED_* preserved
├─> COMPRESSED reprocessed from UNMODIFIED_COMPRESSED
└─> THUMBNAIL_POSTER reprocessed from UNMODIFIED_THUMBNAIL_POSTER

All Modifications Removed
├─> UNMODIFIED_* deleted automatically
├─> Reprocess from ORIGINAL
└─> Back to initial state
```

## Modification System

### Data Storage

Two fields store modification data with different purposes:

```typescript
// FILE TABLE SCHEMA
{
  // SOURCE OF TRUTH for GraphQL API
  // Contains ALL modifications (crop, trim, fileType)
  processingMeta: {
    crop?: { x, y, width, height },
    trim?: { start, end },
    fileType?: 'VIDEO' | 'AUDIO' | 'GIF'
  },

  // DERIVED for reprocessing efficiency
  // Contains only PERSISTENT modifications (crop, trim)
  // Automatically synced from processingMeta
  modifications: {
    crop?: { x, y, width, height },
    trim?: { start, end }
    // fileType NOT included (transient)
  }
}
```

**Why Two Fields?**

- `processingMeta`: Full data for GraphQL queries
- `modifications`: Persistent-only for efficient reprocessing
- System validates they stay in sync (auto-fixes if not)

### Applying Modifications

```typescript
// 1. Validate BEFORE queueing (fail fast)
mCropItem(itemId, crop)
  ├─> Check file type supports cropping
  ├─> Validate crop dimensions
  └─> Queue for processing if valid

// 2. First modification creates UNMODIFIED backups
queueFileForReprocessing()
  ├─> Detect first modification
  ├─> Rename COMPRESSED → UNMODIFIED_COMPRESSED
  ├─> Rename THUMBNAIL_POSTER → UNMODIFIED_THUMBNAIL_POSTER
  └─> Reprocess with modifications

// 3. Subsequent modifications reuse backups
queueFileForReprocessing()
  ├─> UNMODIFIED_* already exist
  ├─> Reprocess from UNMODIFIED_* with new modifications
  └─> No need to recreate backups
```

## Reprocessing Flow

### Standard Reprocessing

Used when modifications change (crop, trim, convert):

```
User Modifies
  ↓
_mModifyFile() updates DB
  ↓
queueFileForReprocessing()
  ├─> First mod? Create UNMODIFIED_* backups
  ├─> Queue with priority
  └─> checkQueue()
  ↓
processFile()
  ├─> Read from UNMODIFIED_* (if exists) or ORIGINAL
  ├─> Apply modifications
  ├─> Generate new variants in temp
  └─> moveAndRegisterFileVariants()
  ↓
Atomic Move + DB Insert
  ├─> Verify files exist
  ├─> UPSERT variants to DB
  ├─> If DB fails → cleanup moved files
  └─> If success → publish subscription update
```

### Factory Reset

Used to remove ALL modifications and start fresh:

```
resetAndReprocessFile()
  ↓
Clear DB modifications
  ├─> modifications = {}
  ├─> processingMeta = null
  ├─> type = originalType
  └─> status = QUEUED
  ↓
Delete ALL variants except ORIGINAL
  ├─> COMPRESSED (deleted)
  ├─> COMPRESSED_GIF (deleted)
  ├─> THUMBNAIL (deleted)
  ├─> THUMBNAIL_POSTER (deleted)
  ├─> UNMODIFIED_COMPRESSED (deleted)
  └─> UNMODIFIED_THUMBNAIL_POSTER (deleted)
  ↓
Reprocess from ORIGINAL
  ├─> Back to initial upload state
  └─> No modifications applied
```

## Error Handling

### Atomic DB-Disk Operations

**Problem**: File moves succeed but DB insert fails → orphaned files

**Solution**: Verify and rollback

```typescript
moveAndRegisterFileVariants()
  ├─> Step 1: Move files to permanent storage
  ├─> Step 2: Verify all files exist (fs.existsSync)
  │   └─> If missing → cleanup + throw
  ├─> Step 3: UPSERT to DB in try/catch
  │   └─> If DB fails → cleanup moved files + throw
  └─> Result: DB and disk always consistent
```

### UPSERT for Race Conditions

**Problem**: Concurrent modifications cause duplicate key errors

**Solution**: UPSERT instead of INSERT

```typescript
_mCreateFileVariants()
  ├─> INSERT ... ON CONFLICT DO UPDATE
  ├─> If variant exists → update metadata
  └─> No errors, no duplicates
```

### Validation Before Queueing

**Problem**: Invalid modifications fail during processing (slow feedback)

**Solution**: Validate in mutations (fail fast)

```typescript
mCropItem(itemId, crop)
  ├─> Check file.type in ['VIDEO', 'IMAGE', 'GIF']
  ├─> Check crop dimensions > 0
  ├─> If invalid → throw InputError immediately
  └─> User gets instant feedback
```

## Troubleshooting

### Common Issues

#### 1. "File marked DONE but no variants found"

**Symptom**: Warning in logs, file shows as done but variants missing

**Cause**: Processing completed but variant creation failed

**Fix**: Run reconciliation tool

```bash
npm run reconcile-files -- --fix
```

#### 2. "Modification mismatch detected"

**Symptom**: Error in logs about processingMeta vs modifications

**Cause**: Data inconsistency between two modification fields

**Fix**: System auto-fixes on detection. If recurring:

1. Check recent code changes
2. Verify getPersistentModifications() logic
3. Run database migration if schema changed

#### 3. "DB record exists but file missing on disk"

**Symptom**: Variants in database but files not on disk

**Cause**: Manual file deletion, disk corruption, or interrupted process

**Fix**:

```bash
# Dry run to see issues
npm run reconcile-files

# Fix by removing orphaned DB records
npm run reconcile-files -- --fix
```

#### 4. Processing stuck in PROCESSING status

**Symptom**: File never completes, status = PROCESSING forever

**Cause**: Worker crash during processing, queue stalled

**Fix**:

1. Check server logs for errors
2. Restart server to clear queue
3. Use `resetAndReprocessFile` mutation to retry

## Tools & Scripts

### Reconciliation Tool

Finds and fixes DB-disk inconsistencies:

```bash
# Safe check (no changes)
npm run reconcile-files

# Fix issues automatically
npm run reconcile-files -- --fix
```

**What it does:**

- Scans all file_variant records
- Checks if files exist on disk
- Deletes orphaned DB records (with --fix)
- Reports all issues found

**When to run:**

- After server crash
- Before/after major migrations
- Regular maintenance (weekly/monthly)
- When users report missing files

### GraphQL Mutations

#### Modify File

```graphql
mutation cropItem($itemId: ID!, $crop: CropInput!) {
  cropItem(itemId: $itemId, crop: $crop)
}

mutation trimItem($itemId: ID!, $trim: TrimInput!) {
  trimItem(itemId: $itemId, trim: $trim)
}

mutation convertItem($itemId: ID!, $targetType: FileType!) {
  convertItem(itemId: $itemId, targetType: $targetType)
}
```

#### Reset File

```graphql
mutation resetAndReprocessFile($itemId: ID!) {
  resetAndReprocessFile(itemId: $itemId)
}
```

#### Remove Modifications

```graphql
mutation removeModifications($itemId: ID!, $removeModifications: [String!]!) {
  removeModifications(
    itemId: $itemId
    removeModifications: $removeModifications
  )
}
```

### Subscriptions

Real-time processing updates:

```graphql
subscription fileProcessingUpdates($ids: [String!]!) {
  fileProcessingUpdates(ids: $ids) {
    kind
    file {
      id
      processingStatus
      processingProgress
      processingNotes
    }
    affectedItems {
      id
      typename # Updated automatically (no refetch needed!)
      position
    }
  }
}
```

**Batching**: Progress updates are batched (100ms) to reduce spam. Critical updates (DONE/FAILED) publish immediately.

## Performance Considerations

### Subscription Batching

- Progress updates batched with 100ms debounce
- Reduces messages by 80%+ during bulk operations
- Critical updates (DONE/FAILED) bypass batching
- Imperceptible to users, massive backend savings

### Dataloader Cache

- Aggressive caching for file and variant queries
- Must be cleared after mutations
- Pattern: `ctx.dataLoaders.file.getById.clear(fileId)`

### Queue Management

- Priority queue (reprocessing > initial processing)
- Concurrency limit prevents resource exhaustion
- Files processed in order of queueing

### Disk Space

- UNMODIFIED variants deleted when modifications cleared
- Automatic cleanup reclaims space
- Original files never deleted (safe)

---

**Last Updated**: 2026-01-08
**Maintainer**: Archive Team
