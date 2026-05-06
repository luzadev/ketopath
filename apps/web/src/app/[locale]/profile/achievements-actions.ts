'use server';

import { type AchievementKey } from '@ketopath/shared';
import { headers } from 'next/headers';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export interface UnlockedAchievement {
  key: AchievementKey;
  unlockedAt: string;
}

export async function fetchAchievements(): Promise<UnlockedAchievement[]> {
  const res = await fetch(`${API_URL}/me/achievements`, {
    headers: { cookie: headers().get('cookie') ?? '' },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const body = (await res.json()) as { unlocked: UnlockedAchievement[] };
  return body.unlocked;
}
