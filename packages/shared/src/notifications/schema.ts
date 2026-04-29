import { z } from 'zod';

// PRD §5.6 — flag opt-in per i promemoria. Default off, tutti.
export const notificationSettingsSchema = z
  .object({
    weeklyWeighIn: z.boolean().default(false),
    fastingMilestones: z.boolean().default(false),
  })
  .strict();

export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  weeklyWeighIn: false,
  fastingMilestones: false,
};

// Body inviato dal client al backend per registrare una subscription web.
export const webPushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().max(512).optional(),
});

export type WebPushSubscriptionInput = z.infer<typeof webPushSubscriptionSchema>;
