import fs from 'fs'
import path from 'path'

/**
 * Resolves a sequence of path segments into an absolute path.
 *
 * This function uses the current working directory as the base path and appends
 * the provided path segments to it. It ensures that the resulting path is
 * normalized and absolute.
 *
 * @param parts - A sequence of path segments to resolve.
 * @returns The resolved absolute path as a string.
 */
export function resolvePath(...parts: string[]): string {
  return path.resolve(process.cwd(), ...parts)
}

/**
 * Asynchronously removes a file or directory at the specified path.
 *
 * This function uses `fs.promises.rm` to delete the target path. It supports
 * recursive deletion for directories and retries up to 3 times in case of
 * failure.
 *
 * @param targetPath - The path to the file or directory to be removed.
 * @returns A promise that resolves when the operation is complete.
 * @throws Will throw an error if the removal fails after the maximum retries.
 */
export async function removeAsync(targetPath: string): Promise<void> {
  try {
    await fs.promises.rm(targetPath, {
      recursive: true,
      force: true,
      maxRetries: 3,
    })
  } catch (err) {
    console.error('Error removing file:', err)
    throw err
  }
}

/**
 * Removes the specified file or directory at the given path.
 *
 * This function uses `fs.rmSync` to delete the target path recursively and
 * forcefully, with a maximum of 3 retries in case of failure.
 *
 * @param targetPath - The path to the file or directory to be removed.
 * @throws Will throw an error if the removal operation fails.
 */
export function remove(targetPath: string): void {
  try {
    fs.rmSync(targetPath, {
      recursive: true,
      force: true,
      maxRetries: 3,
    })
  } catch (err) {
    console.error('Error removing file:', err)
    throw err
  }
}

/**
 * Ensures that a directory exists at the specified path, optionally creating
 * it, emptying it, or setting its permissions.
 *
 * @param targetPath - The path of the directory to ensure.
 * @param criteria - Optional criteria for directory handling.
 * @param criteria.empty - If `true`, ensures the directory is empty by removing
 *   all its contents.
 * @param criteria.mode - The file mode (permissions) to set for the directory.
 *   Can be a number or an octal string.
 * @throws Will throw an error if the path exists but is not a directory, or if
 *   any file operation fails.
 */
export async function dirAsync(
  targetPath: string,
  criteria?: { empty?: boolean; mode?: number | string },
): Promise<void> {
  const { empty = false, mode } = criteria || {}

  try {
    // Ensure the directory exists, creating parent directories as needed
    await fs.promises.mkdir(targetPath, { recursive: true })

    // Check if the path is a directory
    const stats = await fs.promises.stat(targetPath)
    if (!stats.isDirectory()) {
      throw new Error(`Path "${targetPath}" exists but is not a directory.`)
    }

    // Ensure the directory is empty if required
    if (empty) {
      const files = await fs.promises.readdir(targetPath)
      for (const file of files) {
        const filePath = path.join(targetPath, file)
        await removeAsync(filePath)
      }
    }

    // Set the mode if specified
    if (mode !== undefined) {
      const numericMode = typeof mode === 'string' ? parseInt(mode, 8) : mode
      await fs.promises.chmod(targetPath, numericMode)
    }
  } catch (err) {
    console.error('Error ensuring directory:', err)
    throw err
  }
}

/**
 * Ensures that a directory exists at the specified path, optionally clearing
 * its contents and setting its permissions mode.
 *
 * @param targetPath - The path of the directory to ensure.
 * @param criteria - Optional criteria for the directory.
 * @param criteria.empty - If `true`, ensures the directory is empty by removing
 *   all its contents.
 * @param criteria.mode - The permissions mode to set for the directory. Can be
 *   a numeric value or an octal string.
 * @throws Will throw an error if the path exists but is not a directory, or if
 *   any filesystem operation fails.
 */
export function dir(
  targetPath: string,
  criteria?: { empty?: boolean; mode?: number | string },
): void {
  const { empty = false, mode } = criteria || {}

  try {
    // Ensure the directory exists, creating parent directories as needed
    fs.mkdirSync(targetPath, { recursive: true })

    // Check if the path is a directory
    const stats = fs.statSync(targetPath)
    if (!stats.isDirectory()) {
      throw new Error(`Path "${targetPath}" exists but is not a directory.`)
    }

    // Ensure the directory is empty if required
    if (empty) {
      const files = fs.readdirSync(targetPath)
      for (const file of files) {
        const filePath = path.join(targetPath, file)
        remove(filePath)
      }
    }

    // Set the mode if specified
    if (mode !== undefined) {
      const numericMode = typeof mode === 'string' ? parseInt(mode, 8) : mode
      fs.chmodSync(targetPath, numericMode)
    }
  } catch (err) {
    console.error('Error ensuring directory:', err)
    throw err
  }
}

/**
 * Moves a file or directory from one location to another.
 *
 * @param from - The source path of the file or directory to move.
 * @param to - The destination path where the file or directory should be moved.
 * @param options - Optional settings for the move operation.
 * @param options.overwrite - If `true`, overwrites the destination if it
 *   already exists. Default is `false`.
 * @throws Will throw an error if the move operation fails.
 */
export async function moveAsync(
  from: string,
  to: string,
  options?: { overwrite?: boolean },
): Promise<void> {
  const { overwrite = false } = options || {}

  try {
    if (overwrite) {
      await fs.promises.rm(to, { recursive: true, force: true })
    }
    await fs.promises.rename(from, to)
  } catch (err: any) {
    if (err.code === 'EXDEV') {
      // Cross-device move: fallback to copy and remove
      await fs.promises.copyFile(from, to)
      await removeAsync(from)
    } else {
      console.error('Error moving file:', err)
      throw err
    }
  }
}

/**
 * Moves a file or directory from one location to another synchronously.
 *
 * @param from - The source path of the file or directory to move.
 * @param to - The destination path where the file or directory should be moved.
 * @param options - Optional settings for the move operation.
 * @param options.overwrite - If `true`, overwrites the destination if it
 *   already exists. Default is `false`.
 * @throws Will throw an error if the move operation fails.
 */
export function move(
  from: string,
  to: string,
  options?: { overwrite?: boolean },
): void {
  const { overwrite = false } = options || {}

  try {
    if (overwrite) {
      fs.rmSync(to, { recursive: true, force: true })
    }
    fs.renameSync(from, to)
  } catch (err: any) {
    if (err.code === 'EXDEV') {
      // Cross-device move: fallback to copy and remove
      fs.copyFileSync(from, to)
      remove(from)
    } else {
      console.error('Error moving file:', err)
      throw err
    }
  }
}
