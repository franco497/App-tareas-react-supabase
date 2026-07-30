// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.0";
import { google } from "https://esm.sh/googleapis@172.0.0";
import nodemailer from "https://esm.sh/nodemailer@8.0.9";

const TZ = "America/Argentina/Buenos_Aires";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
);

const CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET");
const REDIRECT_URI = Deno.env.get("GMAIL_REDIRECT_URI");
const REFRESH_TOKEN = Deno.env.get("GMAIL_REFRESH_TOKEN");
const FROM_EMAIL = Deno.env.get("GMAIL_FROM_EMAIL") || "devincentisf35@gmail.com";

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

function parseLocalDate(dateString) {
  if (!dateString) return null;
  if (dateString.includes("T")) return new Date(dateString);
  
  const parts = dateString.match(
    /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/
  );
  if (parts) {
    const [_, year, month, day, hour, minute, second] = parts;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  }
  return new Date(dateString);
}

async function processEmails() {
  console.log(`🕒 [${new Date().toISOString()}] Verificando emails programados...`);

  try {
    const now = new Date();
    console.log(`⏰ Hora actual Argentina: ${now.toLocaleString("es-AR", { timeZone: TZ })}`);

    const { data: pending, error } = await supabase
      .from("scheduled_notifications")
      .select("*")
      .eq("status", "pending");

    if (error) throw error;
    if (!pending || pending.length === 0) {
      console.log("📭 No hay emails para enviar");
      return;
    }

    console.log(`📋 Total pendientes: ${pending.length}`);

    const toSend = pending.filter((notif) => {
      const scheduledDate = parseLocalDate(notif.scheduled_for);
      if (!scheduledDate) {
        console.log(`⚠️ Fecha inválida: ${notif.scheduled_for}`);
        return false;
      }
      
      const diffMs = scheduledDate.getTime() - now.getTime();
      const diffMinutes = diffMs / 60000;
      
      console.log(`📅 "${notif.task_name}":`);
      console.log(`   Programado: ${notif.scheduled_for}`);
      console.log(`   Parseado: ${scheduledDate.toLocaleString("es-AR", { timeZone: TZ })}`);
      console.log(`   Diferencia: ${diffMinutes.toFixed(1)} minutos`);
      
      const shouldSend = scheduledDate <= now;
      console.log(`   ¿Enviar ahora?: ${shouldSend ? "✅ SI" : "❌ NO"}`);
      
      return shouldSend;
    });

    if (toSend.length === 0) {
      console.log("⏳ No hay emails para enviar en este momento");
      return;
    }

    console.log(`📧 Enviando ${toSend.length} emails...`);
    const mailTransporter = await getTransporter();

    let sent = 0;
    let failed = 0;

    for (const notification of toSend) {
      try {
        if (!notification.user_email) {
          console.error(`❌ Error: email es undefined para ${notification.task_name}`);
          failed++;
          continue;
        }

        const scheduledParts = notification.scheduled_for.split(" ");
        const scheduledDate = scheduledParts[0] || new Date().toISOString().split("T")[0];
        const scheduledTime = scheduledParts[1] || "00:00:00";

        const scheduledDateObj = parseLocalDate(notification.scheduled_for);
        const formattedDate = scheduledDateObj ? scheduledDateObj.toLocaleString("es-ES", {
          timeZone: TZ,
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }) : "Fecha no válida";

        await mailTransporter.sendMail({
          from: `"App de Tareas" <${FROM_EMAIL}>`,
          to: notification.user_email,
          subject: `📬 Recordatorio: ${notification.task_name}`,
          html: `
            <h2>📋 Recordatorio de Tarea</h2>
            <p><strong>Tarea:</strong> ${notification.task_name}</p>
            <p><strong>📅 Programada para:</strong> ${formattedDate}</p>
            <p>¡No olvides completar esta tarea!</p>
            <small>App de Tareas - Recordatorio automático</small>
          `,
        });

        await supabase
          .from("scheduled_notifications")
          .update({ 
            status: "sent", 
            sent_at: new Date().toISOString() 
          })
          .eq("id", notification.id);

        sent++;
        console.log(`✅ Enviado: ${notification.task_name}`);
      } catch (err) {
        console.error(`❌ Error enviando ${notification.task_name}:`, err.message);
        failed++;
        
        const attempts = (notification.attempts || 0) + 1;
        if (attempts >= 3) {
          await supabase
            .from("scheduled_notifications")
            .update({ status: "failed" })
            .eq("id", notification.id);
        } else {
          await supabase
            .from("scheduled_notifications")
            .update({ attempts: attempts })
            .eq("id", notification.id);
        }
      }
    }

    console.log(`📊 Resumen: ${sent} enviados, ${failed} fallidos`);

  } catch (error) {
    console.error("❌ Error en processEmails:", error);
  }
}

// ✅ VERSIÓN SIMPLIFICADA - SIN AUTENTICACIÓN
serve(async (req) => {
  console.log("📨 === NUEVA PETICIÓN RECIBIDA ===");
  
  try {
    await processEmails();
    
    return new Response(
      JSON.stringify({ success: true, message: "Emails procesados correctamente" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});