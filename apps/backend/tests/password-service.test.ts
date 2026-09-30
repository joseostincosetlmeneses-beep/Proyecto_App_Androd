import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../src/modules/auth/password.service.js';
import { createVerificationToken, hashVerificationToken } from '../src/modules/auth/token.service.js';

describe('authentication cryptography', () => {
  it('hashes and verifies passwords without storing the original value', async () => {
    const password = 'A-strong-password-2026';
    const stored = await hashPassword(password);

    expect(stored).not.toContain(password);
    expect(await verifyPassword(password, stored)).toBe(true);
    expect(await verifyPassword('incorrect-password', stored)).toBe(false);
  });

  it('creates single-purpose verification token hashes', () => {
    const first = createVerificationToken();
    const second = createVerificationToken();

    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).toBe(hashVerificationToken(first.token));
    expect(first.tokenHash).not.toContain(first.token);
  });
});

