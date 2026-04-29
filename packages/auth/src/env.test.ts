import { describe, expect, it } from 'vitest';

import { readAuthEnv } from './env.js';

const VALID_SECRET = 'a'.repeat(32);

describe('readAuthEnv', () => {
  it('accepts a valid configuration', () => {
    const env = readAuthEnv({
      BETTER_AUTH_SECRET: VALID_SECRET,
      BETTER_AUTH_URL: 'http://localhost:3000',
    } as NodeJS.ProcessEnv);

    expect(env.BETTER_AUTH_SECRET).toBe(VALID_SECRET);
    expect(env.BETTER_AUTH_URL).toBe('http://localhost:3000');
    expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
    expect(env.GOOGLE_CLIENT_SECRET).toBeUndefined();
  });

  it('rejects a secret shorter than 32 chars', () => {
    expect(() =>
      readAuthEnv({
        BETTER_AUTH_SECRET: 'troppo-corto',
        BETTER_AUTH_URL: 'http://localhost:3000',
      } as NodeJS.ProcessEnv),
    ).toThrow(/almeno 32/);
  });

  it('rejects a non-URL BETTER_AUTH_URL', () => {
    expect(() =>
      readAuthEnv({
        BETTER_AUTH_SECRET: VALID_SECRET,
        BETTER_AUTH_URL: 'not-a-url',
      } as NodeJS.ProcessEnv),
    ).toThrow();
  });

  it('preserves Google credentials when provided', () => {
    const env = readAuthEnv({
      BETTER_AUTH_SECRET: VALID_SECRET,
      BETTER_AUTH_URL: 'http://localhost:3000',
      GOOGLE_CLIENT_ID: 'cid',
      GOOGLE_CLIENT_SECRET: 'csec',
    } as NodeJS.ProcessEnv);
    expect(env.GOOGLE_CLIENT_ID).toBe('cid');
    expect(env.GOOGLE_CLIENT_SECRET).toBe('csec');
  });
});
