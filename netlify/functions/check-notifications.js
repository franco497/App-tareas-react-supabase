// netlify/functions/check-notifications.js
import { schedule } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import nodemailer from "nodemailer";

// Función para parsear fecha local (Argentina UTC-3)
function parseLocalDate(dateString) {
  console.log(`🔍 Parseando fecha: ${dateString}`);

  // Formato esperado: "2026-06-07 22:00:00" (local)
  const parts = dateString.match(
    /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/,
  );
  if (parts) {
    const [_, year, month, day, hour, minute, second] = parts;
    // Crear fecha directamente en hora local (no convertir)
    // Los timestamps en la BD ya están en hora Argentina
    const date = new Date(year, month - 1, day, hour, minute, second);
    console.log(`   → Parseado local: ${date.toLocaleString()}`);
    return date;
  }

  // Si viene en formato ISO (con T), convertir a local
  if (dateString && dateString.includes("T")) {
    const utcDate = new Date(dateString);
    console.log(`   → Parseado ISO UTC: ${utcDate.toLocaleString()}`);
    console.log(`   → IMPORTANTE: Este formato no debería existir en la BD`);
    return utcDate;
  }

  console.log(`   → Formato desconocido: ${dateString}`);
  return new Date(dateString);
}

// Configuración de Supabase (desde variables de entorno)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Configuración de Gmail (desde variables de entorno)
const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const FROM_EMAIL = process.env.GMAIL_FROM_EMAIL;

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI,
  );
  oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
  const accessToken = await oAuth2Client.getAccessToken();

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: FROM_EMAIL,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      refreshToken: REFRESH_TOKEN,
      accessToken: accessToken.token,
    },
    tls: { rejectUnauthorized: false },
  });

  return transporter;
}

async function processEmails() {
  // Obtener hora actual en Argentina
  const now = new Date();
  const argentinaNow = new Date(now);
  // No modificar, solo usar para comparación

  console.log(`⏰ Hora actual Argentina: ${argentinaNow.toLocaleString()}`);
  console.log(`⏰ Hora actual UTC: ${now.toISOString()}`);

  try {
    const { data: pending, error } = await supabase
      .from("scheduled_notifications")
      .select("*")
      .eq("status", "pending");

    if (error) throw error;
    if (!pending || pending.length === 0) {
      console.log("📭 No hay emails pendientes");
      return;
    }

    console.log(`📋 Total pendientes encontrados: ${pending.length}`);

    // Mostrar detalles de cada tarea pendiente
    for (const notif of pending) {
      const scheduledDate = parseLocalDate(notif.scheduled_for);
      const diffMinutes = (scheduledDate - argentinaNow) / 60000;
      console.log(`📅 "${notif.task_name}":`);
      console.log(`   scheduled_for (original): ${notif.scheduled_for}`);
      console.log(`   parseado como: ${scheduledDate.toLocaleString()}`);
      console.log(`   diferencia: ${diffMinutes.toFixed(1)} minutos`);
      console.log(
        `   debe enviar ahora?: ${scheduledDate <= argentinaNow ? "✅ SI" : "⏳ NO"}`,
      );
    }

    // Filtrar las que ya deben enviarse
    const toSend = pending.filter((notif) => {
      const scheduledDate = parseLocalDate(notif.scheduled_for);
      return scheduledDate <= argentinaNow;
    });

    if (toSend.length === 0) {
      console.log("📭 No hay emails para enviar en este momento");
      return;
    }

    console.log(`📧 Preparando envío de ${toSend.length} email(s)...`);
    const mailTransporter = await getTransporter();

    for (const notification of toSend) {
      try {
        const scheduledDate = parseLocalDate(notification.scheduled_for);
        const formattedDate = scheduledDate.toLocaleString("es-ES", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        const htmlContent = `
          <h2>📋 Recordatorio de Tarea</h2>
          <p><strong>Tarea:</strong> ${notification.task_name}</p>
          <p><strong>📅 Programada para:</strong> ${formattedDate} (hora Argentina)</p>
          <p>¡No olvides completar esta tarea!</p>
          <small>App de Tareas - Recordatorio automático</small>
        `;

        await mailTransporter.sendMail({
          from: `"App de Tareas" <${FROM_EMAIL}>`,
          to: notification.user_email,
          subject: `📬 Recordatorio: ${notification.task_name}`,
          html: htmlContent,
        });

        await supabase
          .from("scheduled_notifications")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", notification.id);

        console.log(`✅ Email enviado: ${notification.task_name}`);
      } catch (err) {
        console.error(`❌ Error: ${notification.task_name}`, err.message);
        await supabase
          .from("scheduled_notifications")
          .update({ status: "failed" })
          .eq("id", notification.id);
      }
    }
  } catch (err) {
    console.error("❌ Error en worker:", err.message);
  }
}

// Programar cada 1 minuto
export const handler = schedule("* * * * *", async () => {
  await processEmails();
  return { statusCode: 200 };
});
