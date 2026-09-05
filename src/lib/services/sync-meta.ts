import {
  db,
  FOLDER_ORDER_KEY,
  isActive,
  isMember,
  type FolderRecord,
  type FolderRef,
  type SyncMeta,
  type TagRef,
  type WorldRecord,
} from './db'

const DEVICE_ID_KEY = 'deviceId'

let deviceIdPromise: Promise<string> | null = null

/**
 * A stable id for this browser, recorded on every row it writes.
 *
 * It settles merges where two devices changed the same field at the same
 * millisecond, which would otherwise resolve differently depending on which
 * device happened to run the merge.
 */
export async function deviceId(): Promise<string> {
  if (deviceIdPromise === null) {
    deviceIdPromise = (async () => {
      const stored = await db.syncState.get(DEVICE_ID_KEY)
      if (stored !== undefined) {
        return stored.value
      }
      const created = crypto.randomUUID()
      await db.syncState.put({ key: DEVICE_ID_KEY, value: created })
      return created
    })()
  }
  return deviceIdPromise
}

/** Bookkeeping for a row being written now. */
export async function touched(): Promise<SyncMeta> {
  return { updatedAt: Date.now(), deletedAt: null, origin: await deviceId() }
}

/** Bookkeeping for a row being deleted now. The row itself is kept. */
export async function tombstoned(): Promise<SyncMeta> {
  const now = Date.now()
  return { updatedAt: now, deletedAt: now, origin: await deviceId() }
}

export async function activeFolders(): Promise<FolderRecord[]> {
  const folders = (await db.foldersById.toArray()).filter(isActive)
  const order = await db.folderOrder.get(FOLDER_ORDER_KEY)
  if (order === undefined) {
    return folders
  }

  const byId = new Map(folders.map((folder) => [folder.id, folder]))
  const ordered: FolderRecord[] = []
  for (const id of order.ids) {
    const folder = byId.get(id)
    if (folder !== undefined) {
      ordered.push(folder)
      byId.delete(id)
    }
  }
  // A folder the order row has not caught up with still has to be listed.
  return [...ordered, ...byId.values()]
}

export async function activeFolderByName(
  name: string,
): Promise<FolderRecord | undefined> {
  const folder = await db.foldersById.where('name').equals(name).first()
  if (folder === undefined || !isActive(folder)) {
    return undefined
  }
  return folder
}

export function folderNamesById(folders: FolderRecord[]): Map<string, string> {
  return new Map(folders.map((folder) => [folder.id, folder.name]))
}

export function memberFolderIds(world: WorldRecord): string[] {
  return world.folderRefs.filter(isMember).map((ref) => ref.folderId)
}

/**
 * The folder names a world is in, in the order the folders are listed.
 *
 * The rest of the app talks in folder names, so ids stay inside this layer.
 */
export function folderNamesOf(
  world: WorldRecord,
  nameById: Map<string, string>,
): string[] {
  const names: string[] = []
  for (const id of memberFolderIds(world)) {
    const name = nameById.get(id)
    if (name !== undefined) {
      names.push(name)
    }
  }
  return names
}

/** Adds an element to a set, or brings back one that had been removed. */
export function withMember<
  T extends { addedAt: number; removedAt: number | null },
>(
  refs: T[],
  matches: (ref: T) => boolean,
  create: (addedAt: number) => T,
  now: number,
): T[] {
  const existing = refs.find(matches)
  if (existing === undefined) {
    return [...refs, create(now)]
  }
  return refs.map((ref) =>
    matches(ref) ? { ...ref, addedAt: now, removedAt: null } : ref,
  )
}

/** Records that an element left the set, without forgetting it ever existed. */
export function withoutMember<
  T extends { addedAt: number; removedAt: number | null },
>(refs: T[], matches: (ref: T) => boolean, now: number): T[] {
  return refs.map((ref) => (matches(ref) ? { ...ref, removedAt: now } : ref))
}

export function folderRefFor(folderId: string, now: number): FolderRef {
  return { folderId, addedAt: now, removedAt: null }
}

export function tagRefFor(name: string, now: number): TagRef {
  return { name, addedAt: now, removedAt: null }
}

export function memberTagNames(tagRefs: TagRef[]): string[] {
  return tagRefs.filter(isMember).map((ref) => ref.name)
}
