# ADR 0003 — Notifiche push (web ora, mobile dopo)

- **Status**: accepted
- **Date**: 2026-04-29
- **Decision makers**: Luciano (PO), Claude
- **Related**: PRD §5.6 (Notifiche & promemoria), CLAUDE.md ("Privacy first", "GDPR by design"), ADR 0001 (auth EU/self-hosted)

## Contesto

PRD §5.6 prevede promemoria settimanali (pesata, digiuno) e notifiche push lifecycle. Su web esiste lo standard W3C Push API; per il mobile (iOS, Android) si usano canali nativi (APNs, FCM). Il PO ha già escluso provider US‑centric quando possibile (vedi ADR 0001) e sa che è verosimile l'arrivo di un'app nativa post‑MVP.

L'ADR fissa **come spedire le push oggi** e **come restare facili da estendere domani**, senza vendor lock‑in.

## Opzioni considerate

### A) Web Push standard (VAPID, self‑hosted)

- Browser + Service Worker ricevono push da un endpoint VAPID gestito dall'API KetoPath. Nessun account terzo.
- Funziona su Chrome/Edge/Firefox. Su iOS funziona **solo se l'utente installa la PWA sulla Home** (iOS 16.4+).
- Costi: zero. Conforme GDPR, nessuna catena di custodia con terzi.

### B) Firebase Cloud Messaging (FCM) anche per web

- Web Push proxato attraverso FCM (legacy: spesso usato per uniformità con Android).
- Pro: una sola pipeline.
- Contro: dipendenza Google su tutto lo stack, stesso problema di residenza dei dati che abbiamo evitato in 0001.

### C) Servizi gestiti (OneSignal, Pusher Beams, Knock…)

- SaaS che astraggono web/iOS/Android.
- Pro: zero codice, multi‑canale.
- Contro: data residency, costi a scaglione, tracking di terze parti — fuori dai vincoli "Privacy first" di CLAUDE.md.

## Decisione

1. **Spedizione oggi**: Web Push standard con VAPID, spedito dall'API tramite la libreria `web-push`.
2. **Modellazione mobile‑ready**: nel DB la subscription si chiama `DeviceToken`, non `PushSubscription`, e ha un campo `platform` (`web` | `ios` | `android`). Per `web` valorizziamo `endpoint` + `p256dh` + `auth`; per le altre piattaforme useremo `token` (vedi struttura sotto). Tutto resta sullo stesso modello.
3. **Architettura sender**: l'API espone un'interfaccia `NotificationSender` con un metodo `send(token, payload)`. Implementazione iniziale unica `WebPushSender`. Le piattaforme mobile, quando arriveranno, saranno `ExpoPushSender` o `ApnsDirectSender` / `FcmSender` — _senza toccare la logica di scheduling, preferenze e opt‑in_.
4. **Scheduling**: per il MVP, `node-cron` in‑process per i promemoria settimanali. Niente coda Redis/BullMQ finché non avremo job paralleli o picchi.

## Schema (estratto)

```prisma
model DeviceToken {
  id         String   @id @default(cuid())
  userId     String   @map("user_id")
  platform   String   // 'web' | 'ios' | 'android'
  endpoint   String?  // Web Push: URL endpoint
  p256dh     String?  // Web Push key
  auth       String?  // Web Push auth secret
  token      String?  // iOS/Android device token (Expo/APNs/FCM)
  userAgent  String?  @map("user_agent")
  createdAt  DateTime @default(now()) @map("created_at")
  lastSeenAt DateTime @default(now()) @map("last_seen_at")
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, endpoint, token])
  @@map("device_tokens")
}
```

Le preferenze sono già su `Preferences.notificationSettings` (Json). Tipiamo i flag in un'interfaccia condivisa:

```ts
interface NotificationSettings {
  weeklyWeighIn: boolean; // PRD §5.6
  fastingMilestones: boolean; // PRD §5.6 — per iterazione futura
}
```

## Mobile readiness — cosa cambia il giorno X

| Capability   | Web (oggi) | iOS nativa            | Android nativa      | Cosa scrivo lato server                                |
| ------------ | ---------- | --------------------- | ------------------- | ------------------------------------------------------ |
| Trasporto    | VAPID/HTTP | APNs (via Expo o JWT) | FCM (via Expo)      | Nuovo `NotificationSender` da plug‑in al servizio core |
| Token format | endpoint   | device token Apple    | FCM token           | Nessun cambio schema (`platform` + colonna `token`)    |
| Permission   | Notif API  | UNUserNotifications   | NotificationManager | Nessun cambio backend                                  |
| Costo        | 0          | €99/anno Apple Dev    | $25 una tantum      | n/a                                                    |

Se scegliamo **Expo** per l'app cross‑platform, l'unico cambio backend è importare `expo-server-sdk` e aggiungere l'`ExpoPushSender`: nessuna migration, nessuna modifica di scheduling.

## Sicurezza & GDPR

- **VAPID private key**: solo in env API (`VAPID_PRIVATE_KEY`), mai committata, mai esposta al client.
- **Payload**: niente dati sanitari nel body della push (titolo + testo generico, l'utente apre l'app per i dettagli). Allinea con CLAUDE.md "niente log dei dati sanitari".
- **Consenso esplicito**: il toggle in `/profile` è opt‑in, default off. Niente notifiche di marketing senza consenso separato.
- **Cleanup automatico**: subscription che restituiscono 404/410 vengono cancellate dal DB nello stesso ciclo di invio.

## Conseguenze

- **+** Architettura pronta per l'app nativa con un solo `Sender` extra.
- **+** Zero costi e zero dipendenze di terze parti per il MVP.
- **+** Conforme alle direttive privacy che abbiamo già fissato.
- **−** Su iOS (web) la spedizione richiede che l'utente installi la PWA: per ora la documenteremo come limite noto, in attesa dell'app nativa.

## Riferimenti

- [Web Push libraries — Mozilla](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [`web-push`](https://github.com/web-push-libs/web-push) — libreria Node usata dal backend
- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Apple Developer — APNs](https://developer.apple.com/notifications/)
