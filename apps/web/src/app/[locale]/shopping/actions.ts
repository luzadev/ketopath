'use server';

import { headers } from 'next/headers';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export interface ShoppingLine {
  ingredientId: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  recipes: string[];
  priceAvgEur: number | null;
}

export interface ShoppingGroup {
  category: string;
  items: ShoppingLine[];
}

export interface ShoppingList {
  plan: { id: string; weekStart: string };
  groups: ShoppingGroup[];
}

function cookieHeader(): string {
  return headers().get('cookie') ?? '';
}

export async function fetchShoppingList(): Promise<ShoppingList | null> {
  const res = await fetch(`${API_URL}/me/shopping-list`, {
    headers: { cookie: cookieHeader() },
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`api_error_${res.status}`);
  return (await res.json()) as ShoppingList;
}
