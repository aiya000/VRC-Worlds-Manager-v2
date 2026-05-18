import { describe, expect, it } from 'vitest';
import { isUserFolder, SpecialFolders } from '@/types/folders';

describe('isUserFolder', () => {
  it('returns false for special folders', () => {
    expect(isUserFolder(SpecialFolders.All)).toBe(false);
    expect(isUserFolder(SpecialFolders.Unclassified)).toBe(false);
  });

  it('returns true for user-created folders', () => {
    expect(isUserFolder('Favorites')).toBe(true);
  });
});
