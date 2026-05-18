import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';
import { isUserFolder, SpecialFolders } from '@/types/folders';

describe('Vitest project integration', () => {
  it('resolves source aliases across test directories', () => {
    expect(cn('px-2', 'py-4')).toContain('px-2');
    expect(isUserFolder('Custom Folder')).toBe(true);
    expect(isUserFolder(SpecialFolders.Hidden)).toBe(false);
  });
});
