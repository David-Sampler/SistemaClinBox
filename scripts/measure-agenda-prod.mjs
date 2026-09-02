import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { chromium } from "playwright";

const BASE = "https://sistemaclinbox.com.br";
const adminEmail = "qa-temp-perf-check2@clinbox.local";

await mongoose.connect(process.env.MONGODB_URI);
const Schema = new mongoose.Schema({}, { strict: false });
const User = mongoose.models.User || mongoose.model("User", Schema, "users");
await User.deleteOne({ email: adminEmail });
const passwordHash = await bcrypt.hash("TempQA123!", 10);
await User.create({ name: "QA Perf", email: adminEmail, passwordHash, role: "admin", active: true });
await mongoose.disconnect();

const browser = await chromium.launch();
const page = await browser.newPage();

const timings = [];
page.on("response", (res) => {
  const url = res.url();
  if (url.includes("/api/appointments") || url.includes("/api/permissions") || url.includes("/agenda")) {
    timings.push({ url: url.replace(BASE, ""), status: res.status() });
  }
});

const tLoginStart = Date.now();
await page.goto(`${BASE}/login`);
await page.fill("#email", adminEmail);
await page.fill("#password", "TempQA123!");
await page.click('button[type="submit"]');
await page.waitForURL(`${BASE}/`, { timeout: 20000 });
console.log("Login + redirect pro painel:", Date.now() - tLoginStart, "ms");

// Primeira visita à Agenda (pode ter cold start).
const t1 = Date.now();
const [resp1] = await Promise.all([
  page.waitForResponse((r) => r.url().includes("/api/appointments"), { timeout: 20000 }),
  page.goto(`${BASE}/agenda`),
]);
console.log("1ª visita à Agenda — página + primeira resposta de /api/appointments:", Date.now() - t1, "ms");
console.log("  status:", resp1.status());
const serverTiming1 = resp1.headers()["x-vercel-id"];
console.log("  x-vercel-id:", serverTiming1);

// Navega pro dia seguinte (dispara novo fetch) — mede warm.
const t2 = Date.now();
const [resp2] = await Promise.all([
  page.waitForResponse((r) => r.url().includes("/api/appointments"), { timeout: 20000 }),
  page.click('button[aria-label="Próximo dia"]'),
]);
console.log("Trocar de dia (fetch já com função 'quente'):", Date.now() - t2, "ms");
console.log("  x-vercel-id:", resp2.headers()["x-vercel-id"]);

// Troca pra visão semanal.
const t3 = Date.now();
const [resp3] = await Promise.all([
  page.waitForResponse((r) => r.url().includes("/api/appointments"), { timeout: 20000 }),
  page.click('button:has-text("Semana")'),
]);
console.log("Trocar pra visão semana:", Date.now() - t3, "ms");
console.log("  x-vercel-id:", resp3.headers()["x-vercel-id"]);

// Recarrega a página inteira (simula abrir de novo / F5).
const t4 = Date.now();
const [resp4] = await Promise.all([
  page.waitForResponse((r) => r.url().includes("/api/appointments"), { timeout: 20000 }),
  page.reload(),
]);
console.log("Recarregar a página (F5):", Date.now() - t4, "ms");
console.log("  x-vercel-id:", resp4.headers()["x-vercel-id"]);

await browser.close();
console.log("done");
