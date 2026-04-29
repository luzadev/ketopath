import { createAuthClient } from 'better-auth/react';

export function makeAuthClient(baseURL: string): ReturnType<typeof createAuthClient> {
  return createAuthClient({ baseURL });
}
