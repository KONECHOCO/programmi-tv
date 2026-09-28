// Notifiche locali: sul telefono tramite @capacitor/local-notifications (arrivano anche ad app chiusa),
// sul web tramite Notification API finché la pagina è aperta.
import { LocalNotifications } from '@capacitor/local-notifications';
import { isNative, platform } from './platform';

const webTimers = new Map();
// iOS permette al massimo 64 notifiche in attesa: ne teniamo un margine.
export const MAX_PENDING = 60;

export function notificationId(programId) {
  let h = 0;
  for (let i = 0; i < programId.length; i++) h = (Math.imul(31, h) + programId.charCodeAt(i)) | 0;
  return Math.abs(h) % 2147483000 || 1;
}

export async function ensurePermission() {
  try {
    if (isNative) {
      let { display } = await LocalNotifications.checkPermissions();
      if (display === 'prompt' || display === 'prompt-with-rationale') ({ display } = await LocalNotifications.requestPermissions());
      return display === 'granted';
    }
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'default') await Notification.requestPermission();
    return Notification.permission === 'granted';
  } catch {
    return false;
  }
}

/**
 * Sincronizza le notifiche pianificate con la lista `items`
 * ([{ programId, at (sec), title, body }]). Cancella quelle non più presenti.
 */
export async function syncScheduled(items) {
  const now = Date.now() / 1000;
  const wanted = items
    .filter((it) => it.at > now + 5)
    .sort((a, b) => a.at - b.at)
    .slice(0, MAX_PENDING);
  const wantedIds = new Set(wanted.map((it) => notificationId(it.programId)));

  if (isNative) {
    try {
      const { notifications: pending } = await LocalNotifications.getPending();
      const stale = pending.filter((n) => !wantedIds.has(Number(n.id)));
      if (stale.length) await LocalNotifications.cancel({ notifications: stale.map((n) => ({ id: n.id })) });
      const pendingIds = new Set(pending.map((n) => Number(n.id)));
      const toAdd = wanted.filter((it) => !pendingIds.has(notificationId(it.programId)));
      if (toAdd.length) {
        await LocalNotifications.schedule({
          notifications: toAdd.map((it) => ({
            id: notificationId(it.programId),
            title: it.title,
            body: it.body,
            schedule: { at: new Date(it.at * 1000), allowWhileIdle: true },
            extra: { programId: it.programId },
            ...(platform === 'android' && { channelId: 'reminders', smallIcon: 'ic_stat_notify' }),
          })),
        });
      }
    } catch (err) {
      console.warn('Notifiche non pianificate:', err);
    }
    return;
  }

  // Web: timer in memoria (valgono solo con la pagina aperta).
  for (const [id, timer] of webTimers) {
    if (!wantedIds.has(id)) {
      clearTimeout(timer);
      webTimers.delete(id);
    }
  }
  for (const it of wanted) {
    const id = notificationId(it.programId);
    const delay = (it.at - now) * 1000;
    if (webTimers.has(id) || delay > 2 ** 31 - 1) continue;
    webTimers.set(id, setTimeout(() => {
      webTimers.delete(id);
      try {
        if ('Notification' in window && Notification.permission === 'granted') new Notification(it.title, { body: it.body });
      } catch {
        // ignora
      }
    }, delay));
  }
}

export async function setupNotificationChannel() {
  if (platform !== 'android') return;
  try {
    await LocalNotifications.createChannel({
      id: 'reminders',
      name: 'Promemoria programmi',
      description: 'Avvisi prima dell\'inizio dei programmi',
      importance: 4,
      visibility: 1,
      vibration: true,
    });
  } catch {
    // ignora
  }
}

export function onNotificationTap(handler) {
  if (!isNative) return () => {};
  const sub = LocalNotifications.addListener('localNotificationActionPerformed', (e) => {
    const id = e.notification?.extra?.programId;
    if (id) handler(id);
  });
  return () => sub.then((s) => s.remove());
}

/** Android 12+: le sveglie esatte vanno abilitate dall'utente, altrimenti l'avviso può ritardare. */
export async function exactAlarmStatus() {
  if (platform !== 'android') return 'granted';
  try {
    const { exact_alarm } = await LocalNotifications.checkExactNotificationSetting();
    return exact_alarm;
  } catch {
    return 'granted';
  }
}

export async function openExactAlarmSettings() {
  try {
    await LocalNotifications.changeExactNotificationSetting();
  } catch {
    // ignora
  }
}
