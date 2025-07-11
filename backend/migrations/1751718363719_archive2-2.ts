import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create variant_type enum
  pgm.createType('variant_type', ['ORIGINAL', 'THUMBNAIL', 'THUMBNAIL_POSTER', 'COMPRESSED', 'COMPRESSED_GIF', 'PROFILE_256', 'PROFILE_64']);

  // Create file_type enum
  pgm.createType('file_type', ['VIDEO', 'IMAGE', 'GIF', 'AUDIO', 'PROFILE_PICTURE']);

  // Create file table
  pgm.createTable('file', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    creator_id: { type: 'integer', notNull: true },
    type: { type: 'file_type', notNull: true },
    processing_status: { type: 'task_status', notNull: true, default: 'DONE' },
    processing_progress: { type: 'smallint' },
    processing_notes: { type: 'text' },
    expire_by: { type: 'bigint' },
    updated_at: { type: 'bigint', notNull: true, default: pgm.func('get_current_timestamp_ms()') },
    created_at: { type: 'bigint', notNull: true, default: pgm.func('get_current_timestamp_ms()') },
  });

  // Add foreign key constraint for file table
  pgm.addConstraint('file', 'file_creator_id_fkey', 'FOREIGN KEY (creator_id) REFERENCES "user"(id) ON DELETE CASCADE');

  // Create trigger for file table
  pgm.sql(`
    CREATE TRIGGER update_file_updated_at
    BEFORE UPDATE ON "file"
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
  `);

  // Create file_variant table
  pgm.createTable('file_variant', {
    file: { type: 'uuid', notNull: true },
    variant: { type: 'variant_type', notNull: true },
    mime_type: { type: 'varchar(100)', notNull: true },
    extension: { type: 'varchar(10)', notNull: true },
    size_bytes: { type: 'bigint', notNull: true, default: 0 },
    meta: { type: 'json', notNull: true, default: '{}' },
    updated_at: { type: 'bigint', notNull: true, default: pgm.func('get_current_timestamp_ms()') },
    created_at: { type: 'bigint', notNull: true, default: pgm.func('get_current_timestamp_ms()') },
  });

  // Add primary key and foreign key constraints for file_variant
  pgm.addConstraint('file_variant', 'file_variant_pkey', 'PRIMARY KEY (file, variant)');
  pgm.addConstraint('file_variant', 'file_variant_file_fkey', 'FOREIGN KEY (file) REFERENCES file(id) ON DELETE CASCADE');

  // Create trigger for file_variant table
  pgm.sql(`
    CREATE TRIGGER update_file_variant_updated_at
    BEFORE UPDATE ON "file_variant"
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
  `);

  // Create migration tracking table
  pgm.createTable('file_migration_log', {
    id: 'id',
    old_path: { type: 'varchar(512)', notNull: true },
    file_id: { type: 'uuid' },
    variant_type: { type: 'variant_type' },
    extension: { type: 'varchar(10)', notNull: true },
    migration_status: { type: 'varchar(20)', notNull: true, default: 'PENDING' },
    notes: { type: 'text' },
    created_at: { type: 'bigint', notNull: true, default: pgm.func('get_current_timestamp_ms()') },
  });

  // Add foreign key constraints for migration log
  pgm.addConstraint('file_migration_log', 'file_migration_log_file_id_fkey', 'FOREIGN KEY (file_id) REFERENCES file(id) ON DELETE SET NULL');
  pgm.addConstraint('file_migration_log', 'file_migration_log_file_variant_fkey', 'FOREIGN KEY (file_id, variant_type) REFERENCES file_variant(file, variant) ON DELETE SET NULL');

  // Helper function to get file extension from path
  pgm.sql(`
    CREATE OR REPLACE FUNCTION get_file_extension(file_path TEXT) RETURNS TEXT AS $$
    BEGIN
      IF file_path IS NULL OR file_path = '' THEN
        RETURN '';
      END IF;

      -- Extract extension from path (everything after the last dot)
      RETURN LOWER(SUBSTRING(file_path FROM '[^.]*$'));
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Helper function to infer MIME type
  pgm.sql(`
    CREATE OR REPLACE FUNCTION infer_mime_type(extension TEXT, variant_type TEXT) RETURNS TEXT AS $$
    BEGIN
      CASE
        WHEN variant_type = 'THUMBNAIL' THEN
          RETURN 'image/jpeg';
        WHEN variant_type IN ('PROFILE_256', 'PROFILE_64') THEN
          RETURN 'image/jpeg';
        WHEN variant_type = 'COMPRESSED' THEN
          CASE extension
            WHEN 'mp4' THEN RETURN 'video/mp4';
            WHEN 'gif' THEN RETURN 'video/mp4';
            ELSE RETURN 'image/jpeg';
          END CASE;
        WHEN variant_type = 'COMPRESSED_GIF' THEN
          RETURN 'image/gif';
        WHEN variant_type = 'ORIGINAL' THEN
          CASE extension
            WHEN 'mp4' THEN RETURN 'video/mp4';
            WHEN 'gif' THEN RETURN 'image/gif';
            WHEN 'jpg' THEN RETURN 'image/jpeg';
            WHEN 'jpeg' THEN RETURN 'image/jpeg';
            WHEN 'png' THEN RETURN 'image/png';
            WHEN 'webp' THEN RETURN 'image/webp';
            ELSE RETURN 'application/octet-stream';
          END CASE;
        ELSE
          RETURN 'application/octet-stream';
      END CASE;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Migrate profile pictures
  pgm.sql(`
    WITH profile_files AS (
      INSERT INTO file (creator_id, type, processing_status, processing_progress, processing_notes, updated_at, created_at)
      SELECT
        id,
        'PROFILE_PICTURE'::file_type,
        'DONE'::task_status,
        NULL,
        NULL,
        updated_at,
        created_at
      FROM "user"
      WHERE profile_picture IS NOT NULL AND profile_picture != ''
      RETURNING id, creator_id
    ),
    profile_variants AS (
      INSERT INTO file_variant (file, variant, mime_type, extension, size_bytes, meta, updated_at, created_at)
      SELECT
        pf.id,
        'PROFILE_256'::variant_type,
        'image/jpeg',
        'jpeg',
        0,
        '{}',
        u.updated_at,
        u.created_at
      FROM profile_files pf
      JOIN "user" u ON pf.creator_id = u.id
      RETURNING file, variant
    )
    INSERT INTO file_migration_log (old_path, file_id, variant_type, extension, migration_status)
    SELECT
      'upic/' || u.profile_picture || '-256.jpeg',
      pf.id,
      'PROFILE_256'::variant_type,
      'jpeg',
      'PENDING'
    FROM profile_files pf
    JOIN "user" u ON pf.creator_id = u.id;
  `);

  // Create PROFILE_64 variants (to be resized from PROFILE_256 during file migration)
  pgm.sql(`
    INSERT INTO file_variant (file, variant, mime_type, extension, size_bytes, meta, updated_at, created_at)
    SELECT
      f.id,
      'PROFILE_64'::variant_type,
      'image/jpeg',
      'jpeg',
      0,
      '{}',
      u.updated_at,
      u.created_at
    FROM "user" u
    JOIN file f ON f.creator_id = u.id
    WHERE u.profile_picture IS NOT NULL AND u.profile_picture != ''
    AND EXISTS (
      SELECT 1 FROM file_variant fv
      WHERE fv.file = f.id AND fv.variant = 'PROFILE_256'::variant_type
    );
  `);

  // Add migration log entries for profile picture variants that need to be generated
  pgm.sql(`
    INSERT INTO file_migration_log (old_path, file_id, variant_type, extension, migration_status)
    SELECT
      'upic/' || u.profile_picture || '-256.jpeg',
      f.id,
      'PROFILE_64'::variant_type,
      'jpeg',
      'PENDING'
    FROM "user" u
    JOIN file f ON f.creator_id = u.id
    WHERE u.profile_picture IS NOT NULL AND u.profile_picture != ''
    AND EXISTS (
      SELECT 1 FROM file_variant fv
      WHERE fv.file = f.id AND fv.variant = 'PROFILE_256'::variant_type
    );
  `);

  // Add migration log entries for profile variants to be deleted
  pgm.sql(`
    INSERT INTO file_migration_log (old_path, file_id, variant_type, extension, migration_status)
    SELECT
      'upic/' || profile_picture || '-' || size || '.jpeg',
      NULL,
      NULL,
      'jpeg',
      'DELETE'
    FROM "user"
    CROSS JOIN (VALUES (32), (80)) AS sizes(size)
    WHERE profile_picture IS NOT NULL AND profile_picture != '';
  `);

  // Migrate item files - create one file per item
  pgm.sql(`
    INSERT INTO file (creator_id, type, processing_status, processing_progress, processing_notes, updated_at, created_at)
    SELECT
      creator_id,
      CASE
        WHEN type = 'VIDEO' THEN 'VIDEO'::file_type
        WHEN type = 'IMAGE' THEN 'IMAGE'::file_type
        WHEN type = 'GIF' THEN 'GIF'::file_type
        WHEN type = 'AUDIO' THEN 'AUDIO'::file_type
        ELSE 'IMAGE'::file_type  -- fallback for any unknown types
      END,
      COALESCE(task_status, 'DONE'::task_status),
      task_progress,
      task_notes,
      updated_at,
      created_at
    FROM item
    WHERE original_path IS NOT NULL OR compressed_path IS NOT NULL OR thumbnail_path IS NOT NULL;
  `);

  // Create temporary table to map items to their files
  pgm.sql(`
    CREATE TEMPORARY TABLE temp_item_file_mapping AS
    SELECT
      i.id as item_id,
      f.id as file_id,
      i.original_path,
      i.compressed_path,
      i.thumbnail_path,
      i.relative_height,
      i.type,
      i.updated_at,
      i.created_at
    FROM item i
    JOIN file f ON (
      f.creator_id = i.creator_id AND
      f.updated_at = i.updated_at AND
      f.created_at = i.created_at AND
      COALESCE(f.processing_status, 'DONE'::task_status) = COALESCE(i.task_status, 'DONE'::task_status) AND
      COALESCE(f.processing_progress, 0) = COALESCE(i.task_progress, 0)
    )
    WHERE i.original_path IS NOT NULL OR i.compressed_path IS NOT NULL OR i.thumbnail_path IS NOT NULL;
  `);

  // Insert original variants
  pgm.sql(`
    INSERT INTO file_variant (file, variant, mime_type, extension, size_bytes, meta, updated_at, created_at)
    SELECT
      mapping.file_id,
      'ORIGINAL'::variant_type,
      infer_mime_type(get_file_extension(mapping.original_path), 'ORIGINAL'),
      COALESCE(get_file_extension(mapping.original_path), ''),
      0,
      '{}',
      mapping.updated_at,
      mapping.created_at
    FROM temp_item_file_mapping mapping
    WHERE mapping.original_path IS NOT NULL AND mapping.original_path != '';
  `);

  // Insert thumbnail variants
  pgm.sql(`
    INSERT INTO file_variant (file, variant, mime_type, extension, size_bytes, meta, updated_at, created_at)
    SELECT
      mapping.file_id,
      'THUMBNAIL'::variant_type,
      'image/jpeg',
      'jpeg',
      0,
      CASE
        WHEN mapping.relative_height IS NOT NULL THEN
          json_build_object('relative_height', mapping.relative_height::text::float)
        ELSE '{}'::json
      END,
      mapping.updated_at,
      mapping.created_at
    FROM temp_item_file_mapping mapping
    WHERE mapping.thumbnail_path IS NOT NULL AND mapping.thumbnail_path != '';
  `);

  // Insert compressed variants
  pgm.sql(`
    INSERT INTO file_variant (file, variant, mime_type, extension, size_bytes, meta, updated_at, created_at)
    SELECT
      mapping.file_id,
      'COMPRESSED'::variant_type,
      infer_mime_type(get_file_extension(mapping.original_path), 'COMPRESSED'),
      CASE
        WHEN mapping.type = 'GIF' THEN 'mp4'
        WHEN mapping.type = 'VIDEO' THEN 'mp4'
        ELSE 'jpeg'
      END,
      0,
      CASE
        WHEN mapping.relative_height IS NOT NULL THEN
          json_build_object('relative_height', mapping.relative_height::text::float)
        ELSE '{}'::json
      END,
      mapping.updated_at,
      mapping.created_at
    FROM temp_item_file_mapping mapping
    WHERE mapping.compressed_path IS NOT NULL AND mapping.compressed_path != '';
  `);

  // Insert compressed GIF variants (only for GIF items)
  pgm.sql(`
    INSERT INTO file_variant (file, variant, mime_type, extension, size_bytes, meta, updated_at, created_at)
    SELECT
      mapping.file_id,
      'COMPRESSED_GIF'::variant_type,
      'image/gif',
      'gif',
      0,
      CASE
        WHEN mapping.relative_height IS NOT NULL THEN
          json_build_object('relative_height', mapping.relative_height::text::float)
        ELSE '{}'::json
      END,
      mapping.updated_at,
      mapping.created_at
    FROM temp_item_file_mapping mapping
    WHERE mapping.compressed_path IS NOT NULL AND mapping.compressed_path != '' AND mapping.type = 'GIF';
  `);

  // Create migration log entries for item files
  pgm.sql(`
    INSERT INTO file_migration_log (old_path, file_id, variant_type, extension, migration_status)
    SELECT old_path, file_id, variant_type::variant_type, extension, 'PENDING'
    FROM (
      -- Original files
      SELECT
        mapping.original_path as old_path,
        mapping.file_id,
        'ORIGINAL' as variant_type,
        get_file_extension(mapping.original_path) as extension
      FROM temp_item_file_mapping mapping
      WHERE mapping.original_path IS NOT NULL AND mapping.original_path != ''

      UNION ALL

      -- Thumbnail files
      SELECT
        mapping.thumbnail_path as old_path,
        mapping.file_id,
        'THUMBNAIL' as variant_type,
        'jpeg' as extension
      FROM temp_item_file_mapping mapping
      WHERE mapping.thumbnail_path IS NOT NULL AND mapping.thumbnail_path != ''

      UNION ALL

      -- Compressed files
      SELECT
        mapping.compressed_path as old_path,
        mapping.file_id,
        'COMPRESSED' as variant_type,
        CASE
          WHEN mapping.type = 'GIF' THEN 'mp4'
          WHEN mapping.type = 'VIDEO' THEN 'mp4'
          ELSE 'jpeg'
        END as extension
      FROM temp_item_file_mapping mapping
      WHERE mapping.compressed_path IS NOT NULL AND mapping.compressed_path != ''

      UNION ALL

      -- Compressed GIF files (only for GIF items)
      SELECT
        mapping.compressed_path as old_path,
        mapping.file_id,
        'COMPRESSED_GIF' as variant_type,
        'gif' as extension
      FROM temp_item_file_mapping mapping
      WHERE mapping.compressed_path IS NOT NULL AND mapping.compressed_path != '' AND mapping.type = 'GIF'
    ) migration_entries;
  `);

  // Add new file_id column to item table
  pgm.addColumn('item', {
    file_id: { type: 'uuid' }
  });

  // Add foreign key constraint
  pgm.addConstraint('item', 'item_file_id_fkey', 'FOREIGN KEY (file_id) REFERENCES file(id) ON DELETE SET NULL');

  // Update item table with file_id references
  pgm.sql(`
    UPDATE item
    SET file_id = mapping.file_id
    FROM temp_item_file_mapping mapping
    WHERE item.id = mapping.item_id;
  `);

  // Add new profile_picture_file_id column to user table
  pgm.addColumn('user', {
    profile_picture_file_id: { type: 'uuid' }
  });

  // Add foreign key constraint
  pgm.addConstraint('user', 'user_profile_picture_file_id_fkey', 'FOREIGN KEY (profile_picture_file_id) REFERENCES file(id) ON DELETE SET NULL');

  // Update user table with profile picture file references
  pgm.sql(`
    UPDATE "user"
    SET profile_picture_file_id = f.id
    FROM file f
    WHERE f.creator_id = "user".id
    AND "user".profile_picture IS NOT NULL
    AND "user".profile_picture != '';
  `);

  // Remove old file path columns from item table
  pgm.dropColumn('item', 'original_path');
  pgm.dropColumn('item', 'compressed_path');
  pgm.dropColumn('item', 'thumbnail_path');
  pgm.dropColumn('item', 'relative_height');
  pgm.dropColumn('item', 'task_notes');
  pgm.dropColumn('item', 'task_status');
  pgm.dropColumn('item', 'task_progress');
  pgm.dropColumn('item', 'audio_amp_thumbnail');
  pgm.dropColumn('item', 'type');

  // Remove old profile picture column from user table
  pgm.dropColumn('user', 'profile_picture');

  // Drop the format enum since item type is now stored in file table
  pgm.dropType('format');

  // Clean up helper functions (they were only needed for the migration)
  pgm.sql('DROP FUNCTION IF EXISTS infer_mime_type(TEXT, TEXT)');
  pgm.sql('DROP FUNCTION IF EXISTS get_file_extension(TEXT)');
}

export async function down(_pgm: MigrationBuilder): Promise<void> {
  throw new Error('This migration cannot be reversed. File system restructuring is not reversible.');
}
