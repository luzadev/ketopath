'use client';

import { makeAuthClient } from '@ketopath/auth/client';

const baseURL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const authClient = makeAuthClient(baseURL);
