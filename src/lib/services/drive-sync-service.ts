import { Context, Effect, Layer } from 'effect'
import { mergeSnapshot } from '@/lib/sync/merge'
import type { Snapshot } from '@/lib/sync/types'
import { db } from './db'
import {
  forgetAccessToken,
  GoogleAuthExpiredError,
} from './google-auth-service'
import {
  createFile,
  DriveApiError,
  findFile,
  findOrCreateFolder,
  fileVersion,
  readFile,
  SYNC_BACKUP_FILE_NAME,
  SYNC_FILE_NAME,
  SYNC_FOLDER_NAME,
  updateFile,
  writeFile,
} from './google-drive'
import { applySnapshot, parseBackupFile, readSnapshot } from './snapshot'
import { deviceId } from './sync-meta'

const LAST_SYNCED_AT_KEY = 'driveLastSyncedAt'

/**
 * How many times to redo the merge when another device wrote to the file
 * first. Three is not a considered number so much as a bound: each retry only
 * happens when two devices press sync within a second or two of each other,
 * and a fourth collision in a row is better reported than looped on.
 */
const MAX_ATTEMPTS = 3

export interface SyncOutcome {
  syncedAt: number
  /**
   * How many memos had two different texts and lost one. The list of what was
   * set aside is PR-H's job; the count is here so the button can at least say
   * that it happened.
   */
  memoConflicts: number
}

/**
 * What the settings screen gets back. An expired token is an outcome rather
 * than an error: there is nothing wrong, the user simply has to press again,
 * and saying so needs a case the UI can recognise rather than a message.
 */
export type DriveSyncResult =
  | ({ kind: 'synced' } & SyncOutcome)
  | { kind: 'reauth-needed' }

export class SyncRaceLostError extends Error {}

export class DriveSyncService extends Context.Tag('DriveSyncService')<
  DriveSyncService,
  {
    readonly syncNow: (accessToken: string) => Effect.Effect<SyncOutcome, Error>
    readonly lastSyncedAt: () => Effect.Effect<number | null, Error>
  }
>() {}

function serialize(snapshot: Snapshot): string {
  return JSON.stringify(snapshot)
}

async function rememberSyncedAt(at: number): Promise<void> {
  await db.syncState.put({ key: LAST_SYNCED_AT_KEY, value: String(at) })
}

/**
 * Pull, merge, push -- once, and only if nothing changed underneath.
 *
 * Returns `null` when another device wrote to the file between reading it and
 * writing it back, which means the merge was done against a file that no
 * longer exists and has to be done again against the new one.
 */
async function attemptSync(
  token: string,
  folderId: string,
  origin: string,
): Promise<SyncOutcome | null> {
  const remote = await findFile(token, folderId, SYNC_FILE_NAME)

  // Nothing up there yet: this device seeds the file, and there is nothing to
  // merge against or to keep a previous generation of.
  if (remote === null) {
    await createFile(
      token,
      folderId,
      SYNC_FILE_NAME,
      serialize(await readSnapshot()),
    )
    const syncedAt = Date.now()
    await rememberSyncedAt(syncedAt)
    return { syncedAt, memoConflicts: 0 }
  }

  const remoteText = await readFile(token, remote.id)
  const { snapshot, memoConflicts } = mergeSnapshot(
    await readSnapshot(),
    parseBackupFile(remoteText, origin),
  )

  if ((await fileVersion(token, remote.id)) !== remote.version) {
    return null
  }

  // The last thing anyone agreed on, kept one generation back. If a bug in the
  // merge ever eats something, this is what it can be recovered from -- and
  // `drive.file` means the user can open and download it themselves.
  await writeFile(token, folderId, SYNC_BACKUP_FILE_NAME, remoteText)
  await updateFile(token, remote.id, serialize(snapshot))
  await applySnapshot(snapshot)

  const syncedAt = Date.now()
  await rememberSyncedAt(syncedAt)
  return { syncedAt, memoConflicts: memoConflicts.length }
}

export const DriveSyncServiceLive = Layer.succeed(DriveSyncService, {
  syncNow: (accessToken) =>
    Effect.tryPromise({
      try: async () => {
        const folderId = await findOrCreateFolder(accessToken, SYNC_FOLDER_NAME)
        const origin = await deviceId()

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
          const outcome = await attemptSync(accessToken, folderId, origin)
          if (outcome !== null) {
            return outcome
          }
        }

        throw new SyncRaceLostError(
          `Another device wrote to ${SYNC_FILE_NAME} on each of ${MAX_ATTEMPTS} attempts`,
        )
      },
      catch: (e) => {
        // The token was still in memory but Google had already retired it. A
        // replacement needs a gesture, and the one that started this sync is
        // over, so the honest answer is to ask for another press.
        if (e instanceof DriveApiError && e.status === 401) {
          forgetAccessToken()
          return new GoogleAuthExpiredError('The Google access token expired')
        }
        return e instanceof SyncRaceLostError
          ? e
          : new Error(`Failed to sync with Google Drive: ${e}`)
      },
    }),

  lastSyncedAt: () =>
    Effect.tryPromise({
      try: async () => {
        const row = await db.syncState.get(LAST_SYNCED_AT_KEY)
        if (row === undefined) {
          return null
        }
        const at = Number(row.value)
        return Number.isFinite(at) ? at : null
      },
      catch: (e) => new Error(`Failed to read the last sync time: ${e}`),
    }),
})
