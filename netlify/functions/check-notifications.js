// netlify/functions/check-notifications.js
import { schedule } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// ✅ FORZAR ZONA HORARIA ARGENTINA
process.env.TZ = "America/Argentina/Buenos_Aires";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function parseLocalDate(dateString) {
  if (!dateString) return null;
  
  // Si es un string ISO (con T), convertirlo a Date
  if (dateString.includes("T")) {
    return new Date(dateString);
  }
  
  // Formato: "2024-07-24 15:11:00"
  const parts = dateString.match(
    /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/
  );
  if (parts) {
    const [_, year, month, day, hour, minute, second] = parts;
    // ✅ Crear fecha en hora local Argentina
    return new Date(year, month - 1, day, hour, minute, second);
  }
  
  return new Date(dateString);
}

export const handler = schedule("*/1 * * * *", async (event, context) => {
  console.log("🔄 Verificando emails programados...");
  console.log("🕒 Zona horaria:", process.env.TZ);
  console.log("🕒 Hora actual:", new Date().toString());

  try {
    const now = new Date();
    console.log(`⏰ Hora actual Argentina: ${now.toLocaleString()}`);
    
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

    // ✅ FILTRAR CORRECTAMENTE POR FECHA
    const toSend = pending.filter((notif) => {
      const scheduledDate = parseLocalDate(notif.scheduled_for);
      if (!scheduledDate) {
        console.log(`⚠️ Fecha inválida: ${notif.scheduled_for}`);
        return false;
      }
      
      // ✅ COMPARAR EN LA MISMA ZONA HORARIA
      const diffMs = scheduledDate - now;
      const diffMinutes = diffMs / 60000;
      
      console.log(`📅 "${notif.task_name}":`);
      console.log(`   Programado: ${notif.scheduled_for}`);
      console.log(`   Parseado: ${scheduledDate.toLocaleString()}`);
      console.log(`   Diferencia: ${diffMinutes.toFixed(1)} minutos`);
      console.log(`   ¿Enviar ahora?: ${scheduledDate <= now ? "✅ SI" : "❌ NO"}`);
      
      return scheduledDate <= now;
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
        // ✅ VALIDAR DATOS
        if (!notification.user_email) {
          console.error(`❌ Error: email es undefined para ${notification.task_name}`);
          failed++;
          continue;
        }

        const scheduledParts = notification.scheduled_for.split(" ");
        const scheduledDate = scheduledParts[0] || new Date().toISOString().split("T")[0];
        const scheduledTime = scheduledParts[1] || "00:00:00";

        // ✅ FORMATO CORRECTO PARA EL EMAIL
        const scheduledDateObj = parseLocalDate(notification.scheduled_for);
        const formattedDate = scheduledDateObj ? scheduledDateObj.toLocaleString("es-ES", {
          timeZone: "America/Argentina/Buenos_Aires",
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }) : "Fecha no válida";

        const requestBody = {
          taskName: notification.task_name || "Tarea sin nombre",
          taskId: notification.task_id || "sin-id",
          scheduledDate: scheduledDate,
          scheduledTime: scheduledTime.slice(0, 5),
          userEmail: notification.user_email,
          toEmail: notification.user_email,
          // ✅ PASAR LA FECHA FORMATEADA PARA EL EMAIL
          formattedDate: formattedDate,
        };

        console.log(`📨 Enviando a: ${requestBody.userEmail}`);
        console.log(`📋 Fecha programada: ${formattedDate}`);

        // ✅ LLAMAR A SUPABASE CON DATOS COMPLETOS
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