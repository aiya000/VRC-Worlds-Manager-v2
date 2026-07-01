import { Effect } from 'effect'
import { AppLayer } from '@/lib/services/layers'
import { PreferencesService } from '@/lib/services/preferences'
import { FolderService } from '@/lib/services/folder-service'
import { WorldService } from '@/lib/services/world-service'
import { MemoService } from '@/lib/services/memo-service'
import { CustomTagsService } from '@/lib/services/custom-tags-service'
import { AuthService } from '@/lib/services/auth-service'
import { BackupService } from '@/lib/services/backup-service'
import { MigrationService } from '@/lib/services/migration-service'
import { InitService } from '@/lib/services/init-service'
import { ExternalDataService } from '@/lib/services/external-data-service'
import { ShareService } from '@/lib/services/share-service'
import { TaskService } from '@/lib/services/task-service'
import { VRChatApiService } from '@/lib/services/vrchat-api'
import type {
  Result,
  BackupMetaData,
  CardSize,
  FilterItemSelectorStarredType,
  FolderData,
  FolderRemovalPreference,
  GroupInstancePermissionInfo,
  InstanceInfo,
  InstanceRegion,
  LocalizedChanges,
  PatreonData,
  PatreonVRChatNames,
  PreviousMetadata,
  TaskStatus,
  UserGroup,
  WorldBlacklist,
  WorldDetails,
  WorldDisplayData,
  TaskStatusChanged,
} from '@/lib/types'

 
function run<A>(
  effect: Effect.Effect<A, unknown, unknown>,
): Promise<Result<A, string>> {
  const provided = Effect.provide(effect, AppLayer) as Effect.Effect<
    A,
    unknown,
    never
  >
  return Effect.runPromise(
    provided.pipe(
      Effect.map((data): Result<A, string> => ({ status: 'ok', data })),
      Effect.catchAll((e: unknown) =>
        Effect.succeed({
          status: 'error' as const,
          error: e instanceof Error ? e.message : String(e),
        }),
      ),
    ),
  )
}

 
function runVoid(
  effect: Effect.Effect<void, unknown, unknown>,
): Promise<Result<null, string>> {
  const provided = Effect.provide(effect, AppLayer) as Effect.Effect<
    void,
    unknown,
    never
  >
  return Effect.runPromise(
    provided.pipe(
      Effect.map((): Result<null, string> => ({ status: 'ok', data: null })),
      Effect.catchAll((e: unknown) =>
        Effect.succeed({
          status: 'error' as const,
          error: e instanceof Error ? e.message : String(e),
        }),
      ),
    ),
  )
}

export const commands = {
  async fetchPatreonData(): Promise<Result<PatreonData, string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* ExternalDataService
        return yield* svc.fetchPatreonData()
      }),
    )
  },

  async fetchPatreonVrchatNames(): Promise<Result<PatreonVRChatNames, string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* ExternalDataService
        return yield* svc.fetchPatreonVrchatNames()
      }),
    )
  },

  async fetchBlacklist(): Promise<Result<WorldBlacklist, string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* ExternalDataService
        return yield* svc.fetchBlacklist()
      }),
    )
  },

  async getChangelog(): Promise<Result<LocalizedChanges[], string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* ExternalDataService
        return yield* svc.getChangelog()
      }),
    )
  },

  async getTaskStatus(id: string): Promise<Result<TaskStatus, string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* TaskService
        return yield* svc.getTaskStatus(id)
      }),
    )
  },

  async cancelTaskRequest(id: string): Promise<Result<TaskStatus, string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* TaskService
        return yield* svc.cancelTaskRequest(id)
      }),
    )
  },

  async getTaskError(id: string): Promise<Result<string | null, string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* TaskService
        return yield* svc.getTaskError(id)
      }),
    )
  },

  async checkForUpdate(): Promise<Result<boolean, string>> {
    return { status: 'ok', data: false }
  },

  async downloadUpdate(): Promise<Result<string, string>> {
    return { status: 'ok', data: '' }
  },

  async installUpdate(): Promise<Result<null, string>> {
    return { status: 'ok', data: null }
  },

  async doNotNotifyUpdate(): Promise<Result<boolean, string>> {
    return { status: 'ok', data: true }
  },

  async addWorldToFolder(
    folderName: string,
    worldId: string,
  ): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const svc = yield* WorldService
        yield* svc.addWorldToFolder(folderName, worldId)
      }),
    )
  },

  async removeWorldFromFolder(
    folderName: string,
    worldId: string,
  ): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const svc = yield* WorldService
        yield* svc.removeWorldFromFolder(folderName, worldId)
      }),
    )
  },

  async hideWorld(worldId: string): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const svc = yield* WorldService
        yield* svc.hideWorld(worldId)
      }),
    )
  },

  async unhideWorld(worldId: string): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const svc = yield* WorldService
        yield* svc.unhideWorld(worldId)
      }),
    )
  },

  async getFolders(): Promise<Result<FolderData[], string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* FolderService
        return yield* svc.getFolders()
      }),
    )
  },

  async createFolder(name: string): Promise<Result<string, string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* FolderService
        return yield* svc.createFolder(name)
      }),
    )
  },

  async deleteFolder(name: string): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const svc = yield* FolderService
        yield* svc.deleteFolder(name)
      }),
    )
  },

  async moveFolder(
    folderName: string,
    newIndex: number,
  ): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const svc = yield* FolderService
        yield* svc.moveFolder(folderName, newIndex)
      }),
    )
  },

  async renameFolder(
    oldName: string,
    newName: string,
  ): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const svc = yield* FolderService
        yield* svc.renameFolder(oldName, newName)
      }),
    )
  },

  async getWorlds(
    folderName: string,
  ): Promise<Result<WorldDisplayData[], string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* WorldService
        return yield* svc.getWorlds(folderName)
      }),
    )
  },

  async getAllWorlds(): Promise<Result<WorldDisplayData[], string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* WorldService
        return yield* svc.getAllWorlds()
      }),
    )
  },

  async getUnclassifiedWorlds(): Promise<Result<WorldDisplayData[], string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* WorldService
        return yield* svc.getUnclassifiedWorlds()
      }),
    )
  },

  async getHiddenWorlds(): Promise<Result<WorldDisplayData[], string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* WorldService
        return yield* svc.getHiddenWorlds()
      }),
    )
  },

  async getTagsByCount(): Promise<Result<string[], string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* CustomTagsService
        return yield* svc.getTagsByCount()
      }),
    )
  },

  async getAuthorsByCount(): Promise<Result<string[], string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* CustomTagsService
        return yield* svc.getAuthorsByCount()
      }),
    )
  },

  async deleteWorld(worldId: string): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const svc = yield* WorldService
        yield* svc.deleteWorld(worldId)
      }),
    )
  },

  async getFoldersForWorld(worldId: string): Promise<Result<string[], string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* FolderService
        return yield* svc.getFoldersForWorld(worldId)
      }),
    )
  },

  async getCustomTags(worldId: string): Promise<Result<string[], string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* CustomTagsService
        return yield* svc.getCustomTags(worldId)
      }),
    )
  },

  async setCustomTags(
    worldId: string,
    tags: string[],
  ): Promise<Result<string[], string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* CustomTagsService
        return yield* svc.setCustomTags(worldId, tags)
      }),
    )
  },

  async shareFolder(folderName: string): Promise<Result<string, string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* ShareService
        return yield* svc.shareFolder(folderName)
      }),
    )
  },

  async updateFolderShare(
    folderName: string,
  ): Promise<Result<string | null, string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* ShareService
        return yield* svc.updateFolderShare(folderName)
      }),
    )
  },

  async downloadFolder(
    shareId: string,
  ): Promise<Result<[string, WorldDisplayData[]], string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* ShareService
        return yield* svc.downloadFolder(shareId)
      }),
    )
  },

  async getTheme(): Promise<Result<string, string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* PreferencesService
        return yield* svc.getTheme()
      }),
    )
  },

  async setTheme(theme: string): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const svc = yield* PreferencesService
        yield* svc.setTheme(theme)
      }),
    )
  },

  async getLanguage(): Promise<Result<string, string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* PreferencesService
        return yield* svc.getLanguage()
      }),
    )
  },

  async setLanguage(language: string): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const svc = yield* PreferencesService
        yield* svc.setLanguage(language)
      }),
    )
  },

  async getCardSize(): Promise<Result<CardSize, string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* PreferencesService
        return yield* svc.getCardSize()
      }),
    )
  },

  async setCardSize(cardSize: CardSize): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const svc = yield* PreferencesService
        yield* svc.setCardSize(cardSize)
      }),
    )
  },

  async getRegion(): Promise<Result<InstanceRegion, string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* PreferencesService
        return yield* svc.getRegion()
      }),
    )
  },

  async setRegion(region: InstanceRegion): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const svc = yield* PreferencesService
        yield* svc.setRegion(region)
      }),
    )
  },

  async getStarredFilterItems(
    id: FilterItemSelectorStarredType,
  ): Promise<Result<string[], string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* PreferencesService
        return yield* svc.getStarredFilterItems(id)
      }),
    )
  },

  async setStarredFilterItems(
    id: FilterItemSelectorStarredType,
    values: string[],
  ): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const svc = yield* PreferencesService
        yield* svc.setStarredFilterItems(id, values)
      }),
    )
  },

  async getFolderRemovalPreference(): Promise<
    Result<FolderRemovalPreference, string>
  > {
    return run(
      Effect.gen(function* () {
        const svc = yield* PreferencesService
        return yield* svc.getFolderRemovalPreference()
      }),
    )
  },

  async setFolderRemovalPreference(
    dontShowRemoveFromFolder: FolderRemovalPreference,
  ): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const svc = yield* PreferencesService
        yield* svc.setFolderRemovalPreference(dontShowRemoveFromFolder)
      }),
    )
  },

  async getUpdateChannel(): Promise<Result<string, string>> {
    return { status: 'ok', data: 'stable' }
  },

  async setUpdateChannel(_channel: string): Promise<Result<null, string>> {
    return { status: 'ok', data: null }
  },

  async getSortPreferences(): Promise<Result<[string, string], string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* PreferencesService
        return yield* svc.getSortPreferences()
      }),
    )
  },

  async setSortPreferences(
    sortField: string,
    sortDirection: string,
  ): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const svc = yield* PreferencesService
        yield* svc.setSortPreferences(sortField, sortDirection)
      }),
    )
  },

  async tryLogin(): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const svc = yield* VRChatApiService
        yield* svc.tryLogin()
      }),
    )
  },

  async loginWithCredentials(
    username: string,
    password: string,
  ): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const svc = yield* VRChatApiService
        yield* svc.loginWithCredentials(username, password)
      }),
    )
  },

  async loginWith2fa(
    code: string,
    twoFactorType: string,
  ): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const svc = yield* VRChatApiService
        yield* svc.loginWith2fa(code, twoFactorType)
      }),
    )
  },

  async logout(): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const api = yield* VRChatApiService
        const auth = yield* AuthService
        yield* api.logout()
        yield* auth.clearAuth()
      }),
    )
  },

  async getFavoriteWorlds(): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const svc = yield* VRChatApiService
        yield* svc.getFavoriteWorlds()
      }),
    )
  },

  async getWorld(
    worldId: string,
    dontSaveToLocal: boolean | null,
  ): Promise<Result<WorldDetails, string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* WorldService
        return yield* svc.getWorld(worldId, dontSaveToLocal)
      }),
    )
  },

  async checkWorldInfo(worldId: string): Promise<Result<WorldDetails, string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* VRChatApiService
        return yield* svc.checkWorldInfo(worldId)
      }),
    )
  },

  async getRecentlyVisitedWorlds(): Promise<
    Result<WorldDisplayData[], string>
  > {
    return run(
      Effect.gen(function* () {
        const svc = yield* VRChatApiService
        return yield* svc.getRecentlyVisitedWorlds()
      }),
    )
  },

  async searchWorlds(
    sort: string,
    tags: string[],
    excludeTags: string[],
    search: string,
    page: number,
  ): Promise<Result<WorldDisplayData[], string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* VRChatApiService
        return yield* svc.searchWorlds(sort, tags, excludeTags, search, page)
      }),
    )
  },

  async createWorldInstance(
    worldId: string,
    instanceTypeStr: string,
    regionStr: string,
  ): Promise<Result<InstanceInfo, string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* VRChatApiService
        return yield* svc.createWorldInstance(
          worldId,
          instanceTypeStr,
          regionStr,
        )
      }),
    )
  },

  async getUserGroups(): Promise<Result<UserGroup[], string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* VRChatApiService
        return yield* svc.getUserGroups()
      }),
    )
  },

  async getPermissionForCreateGroupInstance(
    groupId: string,
  ): Promise<Result<GroupInstancePermissionInfo, string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* VRChatApiService
        return yield* svc.getPermissionForCreateGroupInstance(groupId)
      }),
    )
  },

  async createGroupInstance(
    worldId: string,
    groupId: string,
    instanceTypeStr: string,
    allowedRoles: string[] | null,
    regionStr: string,
    queueEnabled: boolean,
  ): Promise<Result<InstanceInfo, string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* VRChatApiService
        return yield* svc.createGroupInstance(
          worldId,
          groupId,
          instanceTypeStr,
          allowedRoles,
          regionStr,
          queueEnabled,
        )
      }),
    )
  },

  async openInstanceInClient(
    worldId: string,
    instanceId: string,
  ): Promise<Result<string, string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* VRChatApiService
        return yield* svc.openInstanceInClient(worldId, instanceId)
      }),
    )
  },

  async openLogsDirectory(): Promise<Result<null, string>> {
    return { status: 'ok', data: null }
  },

  async openFolderDirectory(): Promise<Result<null, string>> {
    return { status: 'ok', data: null }
  },

  async requireInitialSetup(): Promise<boolean> {
    const result = await run(
      Effect.gen(function* () {
        const svc = yield* InitService
        return yield* svc.requireInitialSetup()
      }),
    )
    return result.status === 'ok' ? result.data : true
  },

  async checkFilesLoaded(): Promise<Result<boolean, string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* InitService
        return yield* svc.checkFilesLoaded()
      }),
    )
  },

  async detectOldInstallation(): Promise<Result<[string, string], string>> {
    return { status: 'error', error: 'Not available in web version' }
  },

  async passPaths(): Promise<Result<string, string>> {
    return { status: 'ok', data: '' }
  },

  async checkExistingData(): Promise<Result<[boolean, boolean], string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* InitService
        return yield* svc.checkExistingData()
      }),
    )
  },

  async getBackupMetadata(
    _backupPath: string,
  ): Promise<Result<BackupMetaData, string>> {
    return {
      status: 'error',
      error: 'Use getBackupMetadataFromFile for web version',
    }
  },

  async getBackupMetadataFromFile(
    file: File,
  ): Promise<Result<BackupMetaData, string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* BackupService
        return yield* svc.getBackupMetadataFromFile(file)
      }),
    )
  },

  async getMigrationMetadata(
    _worldsPath: string,
    _foldersPath: string,
  ): Promise<Result<PreviousMetadata, string>> {
    return {
      status: 'error',
      error: 'Use getMigrationMetadataFromFiles for web version',
    }
  },

  async getMigrationMetadataFromFiles(
    worldsFile: File,
    foldersFile: File,
  ): Promise<Result<PreviousMetadata, string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* MigrationService
        return yield* svc.getMigrationMetadata(worldsFile, foldersFile)
      }),
    )
  },

  async createEmptyAuth(): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const svc = yield* InitService
        yield* svc.createEmptyAuth()
      }),
    )
  },

  async createEmptyFiles(): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const svc = yield* InitService
        yield* svc.createEmptyFiles()
      }),
    )
  },

  async createBackup(_backupPath?: string): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const svc = yield* BackupService
        yield* svc.createBackup()
      }),
    )
  },

  async restoreFromBackup(
    _backupPathOrFile: string | File,
  ): Promise<Result<null, string>> {
    return {
      status: 'error',
      error: 'Use restoreFromBackupFile for web version',
    }
  },

  async restoreFromBackupFile(file: File): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const svc = yield* BackupService
        yield* svc.restoreFromBackup(file)
      }),
    )
  },

  async exportToPortalLibrarySystem(
    folders: string[],
    sortField: string,
    sortDirection: string,
  ): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const svc = yield* BackupService
        yield* svc.exportToPortalLibrarySystem(
          folders,
          sortField,
          sortDirection,
        )
      }),
    )
  },

  async migrateOldData(
    _worldsPath: string,
    _foldersPath: string,
  ): Promise<Result<null, string>> {
    return {
      status: 'error',
      error: 'Use migrateOldDataFromFiles for web version',
    }
  },

  async migrateOldDataFromFiles(
    worldsFile: File,
    foldersFile: File,
  ): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const svc = yield* MigrationService
        yield* svc.migrateOldData(worldsFile, foldersFile)
      }),
    )
  },

  async deleteData(): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const svc = yield* InitService
        yield* svc.deleteData()
      }),
    )
  },

  async getMemo(worldId: string): Promise<Result<string, string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* MemoService
        return yield* svc.getMemo(worldId)
      }),
    )
  },

  async setMemoAndSave(
    worldId: string,
    memo: string,
  ): Promise<Result<null, string>> {
    return runVoid(
      Effect.gen(function* () {
        const svc = yield* MemoService
        yield* svc.setMemoAndSave(worldId, memo)
      }),
    )
  },

  async searchMemoText(searchText: string): Promise<Result<string[], string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* MemoService
        return yield* svc.searchMemoText(searchText)
      }),
    )
  },

  async sortWorldsDisplay(
    worlds: WorldDisplayData[],
    sortField: string,
    sortDirection: string,
  ): Promise<Result<WorldDisplayData[], string>> {
    return run(
      Effect.gen(function* () {
        const svc = yield* WorldService
        return yield* svc.sortWorldsDisplay(worlds, sortField, sortDirection)
      }),
    )
  },
}

// Web-compatible events using EventTarget
const eventTarget = new EventTarget()

export const events = {
  taskStatusChanged: {
    listen: (
      cb: (event: { payload: TaskStatusChanged }) => void,
    ): (() => void) => {
      const handler = (e: Event) => {
        cb({ payload: (e as CustomEvent).detail })
      }
      eventTarget.addEventListener('taskStatusChanged', handler)
      return () => {
        eventTarget.removeEventListener('taskStatusChanged', handler)
      }
    },
    once: (
      cb: (event: { payload: TaskStatusChanged }) => void,
    ): (() => void) => {
      const handler = (e: Event) => {
        cb({ payload: (e as CustomEvent).detail })
      }
      eventTarget.addEventListener('taskStatusChanged', handler, {
        once: true,
      })
      return () => {
        eventTarget.removeEventListener('taskStatusChanged', handler)
      }
    },
    emit: (payload: TaskStatusChanged): void => {
      eventTarget.dispatchEvent(
        new CustomEvent('taskStatusChanged', { detail: payload }),
      )
    },
  },
  updateProgress: {
    listen: (
      cb: (event: { payload: { progress: number } }) => void,
    ): (() => void) => {
      const handler = (e: Event) => {
        cb({ payload: (e as CustomEvent).detail })
      }
      eventTarget.addEventListener('updateProgress', handler)
      return () => {
        eventTarget.removeEventListener('updateProgress', handler)
      }
    },
    once: (
      cb: (event: { payload: { progress: number } }) => void,
    ): (() => void) => {
      const handler = (e: Event) => {
        cb({ payload: (e as CustomEvent).detail })
      }
      eventTarget.addEventListener('updateProgress', handler, {
        once: true,
      })
      return () => {
        eventTarget.removeEventListener('updateProgress', handler)
      }
    },
    emit: (payload: { progress: number }): void => {
      eventTarget.dispatchEvent(
        new CustomEvent('updateProgress', { detail: payload }),
      )
    },
  },
}

// Re-export all types for compatibility
export type {
  Result,
  BackupMetaData,
  CardSize,
  FilterItemSelectorStarredType,
  FolderData,
  FolderRemovalPreference,
  GroupInstanceCreateAllowedType,
  GroupInstanceCreatePermission,
  GroupInstancePermissionInfo,
  GroupMemberVisibility,
  GroupPermission,
  GroupRole,
  InstanceInfo,
  InstanceRegion,
  LocalizedChanges,
  PatreonData,
  PatreonVRChatNames,
  Platform,
  PreviousMetadata,
  TaskStatus,
  TaskStatusChanged,
  UpdateChannel,
  UpdateProgress,
  UserGroup,
  WorldBlacklist,
  WorldDetails,
  WorldDisplayData,
} from '@/lib/types'
