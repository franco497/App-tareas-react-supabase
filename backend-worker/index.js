// backend-worker/index.js
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import nodemailer from "nodemailer";
import cron from "node-cron";
import dotenv from "dotenv";

dotenv.config();

// 🔧 CONFIGURAR ZONA HORARIA ARGENTINA
process.env.TZ = "America/Argentina/Buenos_Aires";
console.log("🕒 Zona horaria configurada:", process.env.TZ);
console.log("🕒 Hora actual:", new Date().toString());

// Función para convertir string local a Date (formato: "YYYY-MM-DD HH:MM:SS")
function parseLocalDate(dateString) {
  if (!dateString) return null;

  // Si ya es un objeto Date, devolverlo
  if (dateString instanceof Date) return dateString;

  // Manejar formato "2026-06-02 17:32:00"
  const parts = dateString.match(
    /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/,
  );
  if (parts) {
    const [_, year, month, day, hour, minute, second] = parts;
    // Crear fecha en hora local (Argentina)
    return new Date(year, month - 1, day, hour, minute, second);
  }

  // Si no, intentar con Date normal
  return new Date(dateString);
}

// Configuración Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Configuración Gmail
const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const FROM_EMAIL = process.env.GMAIL_FROM_EMAIL;

let transporter = null;

// Inicializar transporter de Gmail - VERSIÓN CORREGIDA
async function initTransporter() {
  try {
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
      // 🔧 AGREGAR ESTAS OPCIONES PARA EVITAR ERROR DE CERTIFICADO
      tls: {
        rejectUnauthorized: false,  // No rechazar certificados autofirmados
      },
      // Configuración adicional para evitar problemas de certificados
      debug: true,
      connectionTimeout: 10000,
    });

    // Verificar conexión
    await transporter.verify();
    console.log("✅ Transporter de Gmail inicializado correctamente");
  } catch (error) {
    console.error("❌ Error inicializando transporter:", error.message);
    throw error;
  }
}

// Verificar conexión a Supabase
async function checkSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from("scheduled_notifications")
      .select("count", { count: "exact", head: true });

    if (error) throw error;
    console.log("✅ Conexión a Supabase establecida");
    return true;
  } catch (error) {
    console.error("❌ Error conectando a Supabase:", error.message);
    return false;
  }
}

// Procesar emails pendientes
async function processPendingEmails() {
  const now = new Date();
  console.log(
    `\n⏰ [${now.toLocaleString()}] Verificando emails pendientes...`,
  );

  try {
    // Obtener todas las notificaciones pendientes
    const { data: pendingNotifications, error } = await supabase
      .from("scheduled_notifications")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(20);

    if (error) throw error;

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log("📭 No hay emails pendientes para enviar");
      return;
    }

    // Filtrar las que ya deben enviarse (comparación local)
    const toSend = [];
    for (const notification of pendingNotifications) {
      const scheduledDate = parseLocalDate(notification.scheduled_for);
      if (!scheduledDate) {
        console.log(`⚠️ Fecha inválida: ${notification.scheduled_for}`);
        continue;
      }

      const diffMinutes = (scheduledDate - now) / 60000;
      console.log(
        `📅 "${notification.task_name}": programado ${notification.scheduled_for} | diferencia: ${diffMinutes.toFixed(1)} min`,
      );

      if (scheduledDate <= now) {
        toSend.push(notification);
      }
    }

    if (toSend.length === 0) {
      console.log("📭 No hay emails para enviar en este momento");
      return;
    }

    console.log(`📧 Encontrados ${toSend.length} email(s) para enviar ahora`);

    let sentCount = 0;
    let failedCount = 0;

    for (const notification of toSend) {
      try {
        const scheduledDate = parseLocalDate(notification.scheduled_for);

        console.log(`\n--- Procesando: ${notification.task_name} ---`);
        console.log(`📨 Para: ${notification.user_email}`);
        console.log(
          `📅 Programado para: ${notification.scheduled_for} (hora Argentina)`,
        );

        // Formatear fecha para el email
        const formattedDate = scheduledDate.toLocaleString("es-ES", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head><meta charset="UTF-8"></head>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>📋 Recordatorio de Tarea</h2>
            <p><strong>Tarea:</strong> ${notification.task_name}</p>
            <p><strong>📅 Programada para (hora Argentina):</strong> ${formattedDate}</p>
            <p>¡No olvides completar esta tarea!</p>
            <hr>
            <small>App de Tareas - Recordatorio automático (hora Argentina UTC-3)</small>
          </body>
          </html>
        `;

        const mailOptions = {
          from: `"App de Tareas" <${FROM_EMAIL}>`,
          to: notification.user_email,
          subject: `📬 Recordatorio: ${notification.task_name}`,
          html: htmlContent,
        };

        const result = await transporter.sendMail(mailOptions);

        await supabase
          .from("scheduled_notifications")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("id", notification.id);

        console.log(
          `✅ Email enviado exitosamente! MessageId: ${result.messageId}`,
        );
        sentCount++;
      } catch (emailError) {
        console.error(`❌ Error enviando email:`, emailError.message);

        await supabase
          .from("scheduled_notifications")
          .update({ status: "failed" })
          .eq("id", notification.id);

        failedCount++;
      }
    }

    console.log(
      `\n📊 Resumen: Enviados: ${sentCount} | Fallidos: ${failedCount}`,
    );
  } catch (error) {
    console.error("❌ Error en processPendingEmails:", error.message);
  }
}

// Iniciar el worker
async function start() {
  console.log("🚀 INICIANDO BACKEND WORKER DE EMAILS");
  console.log("======================================\n");

  await initTransporter();

  const isConnected = await checkSupabaseConnection();
  if (!isConnected) {
    console.error("❌ No se pudo conectar a Supabase. Saliendo...");
    process.exit(1);
  }

  console.log("\n✅ Worker inicializado correctamente");
  console.log("⏰ Revisando emails CADA MINUTO");
  console.log("💡 Presiona Ctrl+C para detener\n");
  console.log("======================================\n");

  await processPendingEmails();

  cron.schedule("* * * * *", async () => {
    await processPendingEmails();
  });
}

process.on("SIGINT", () => {
  console.log("\n\n🛑 Deteniendo worker...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n\n🛑 Deteniendo worker...");
  process.exit(0);
});

start().catch(console.error);
