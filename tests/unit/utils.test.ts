import { describe, expect, it } from 'vitest';

import { cn } from '@/lib/utils';

describe('cn', () => {
  it('merges Tailwind classes predictably', () => {
    // `false && 'hidden'` simulates a conditional class (e.g. `isHidden && 'hidden'`),
    // verifying that falsy values are filtered out by cn().
    expect(cn('px-2 py-1', 'px-4', ['text-sm', false && 'hidden'])).toBe(
      'py-1 px-4 text-sm',
    );
  });
});
