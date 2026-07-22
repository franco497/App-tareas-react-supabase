// netlify/functions/check-notifications.js
import { schedule } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// Configurar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Función para parsear fechas
function parseLocalDate(dateString) {
  if (!dateString) return null;
  if (dateString.includes("T")) return new Date(dateString);
  
  const parts = dateString.match(
    /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/,
  );
  if (parts) {
    const [_, year, month, day, hour, minute, second] = parts;
    return new Date(year, month - 1, day, hour, minute, second);
  }
  return new Date(dateString);
}

export const handler = schedule("*/1 * * * *", async (event, context) => {
  console.log("🔄 Verificando emails programados...");

  try {
    const now = new Date();
    
    // Buscar emails pendientes
    const { data: pending, error } = await supabase
      .from("scheduled_notifications")
      .select("*")
      .eq("status", "pending");

    if (error) throw error;

    if (!pending || pending.length === 0) {
      console.log("📭 No hay emails para enviar");
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "No hay emails" })
      };
    }

    // Filtrar los que ya deben enviarse
    const toSend = pending.filter((notif) => {
      const scheduledDate = parseLocalDate(notif.scheduled_for);
      return scheduledDate && scheduledDate <= now;
    });

    if (toSend.length === 0) {
      console.log("⏳ No hay emails para enviar en este momento");
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "No hay emails para ahora" })
      };
    }

    console.log(`📧 Enviando ${toSend.length} emails...`);

    let sent = 0;
    let failed = 0;

    for (const notification of toSend) {
      try {
        // ✅ VALIDAR DATOS ANTES DE ENVIAR
        if (!notification.user_email) {
          console.error(`❌ Error: notification.user_email es undefined para ${notification.task_name}`);
          failed++;
          continue;
        }

        // Extraer fecha y hora del scheduled_for
        const scheduledParts = notification.scheduled_for.split(" ");
        const scheduledDate = scheduledParts[0] || new Date().toISOString().split("T")[0];
        const scheduledTime = scheduledParts[1] || "00:00:00";

        // ✅ CREAR EL BODY CON TODOS LOS DATOS REQUERIDOS
        const requestBody = {
          taskName: notification.task_name || "Tarea sin nombre",
          taskId: notification.task_id || "sin-id",
          scheduledDate: scheduledDate,
          scheduledTime: scheduledTime.slice(0, 5), // "HH:MM"
          userEmail: notification.user_email,
          toEmail: notification.user_email, // ← Enviar al mismo usuario
        };

        console.log(`📨 Enviando a: ${requestBody.userEmail}`);
        console.log(`📋 Datos:`, requestBody);

        // ✅ LLAMAR A LA FUNCIÓN DE SUPABASE
        const response = await fetch(
          `${process.env.SUPABASE_URL}/functions/v1/send-email-gmail`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify(requestBody),
          }
        );

        const responseData = await response.json();

        if (response.ok) {
          // ✅ Marcar como enviado
          await supabase
            .from("scheduled_notifications")
            .update({ 
              status: "sent", 
              sent_at: new Date().toISOString() 
            })
            .eq("id", notification.id);
          
          sent++;
          console.log(`✅ Enviado: ${notification.task_name}`);
        } else {
          console.error(`❌ Error enviando ${notification.task_name}:`, responseData);
          failed++;
          
          // Marcar como fallido después de varios intentos
          if (notification.attempts >= 3) {
            await supabase
              .from("scheduled_notifications")
              .update({ status: "failed" })
              .eq("id", notification.id);
          } else {
            // Incrementar contador de intentos
            await supabase
              .from("scheduled_notifications")
              .update({ 
                attempts: (notification.attempts || 0) + 1 
              })
              .eq("id", notification.id);
          }
        }
      } catch (err) {
        console.error(`❌ Error con ${notification.task_name}:`, err.message);
        failed++;
      }
    }

    console.log(`📊 Resumen: ${sent} enviados, ${failed} fallidos`);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: `${sent} emails enviados de ${toSend.length}`,
        sent,
        failed
      })
    };

  } catch (error) {
    console.error("❌ Error en cron:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
});