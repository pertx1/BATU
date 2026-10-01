// Genera las claves VAPID y un CRON_SECRET listos para pegar en Vercel (o en .env).
// Uso: npm run secrets
import { randomBytes } from "node:crypto";
import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log(`VAPID_SUBJECT=mailto:tu-email@ejemplo.com`);
console.log(`CRON_SECRET=${randomBytes(24).toString("hex")}`);
