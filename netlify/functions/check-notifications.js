// netlify/functions/check-notifications.js
import { schedule } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// ✅ Usar la misma función de Supabase para enviar emails
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export const handler = schedule("*/1 * * * *", async (event, context) => {
  console.log("🔄 Verificando emails programados...");

  try {
    const now = new Date();
    
    // Buscar emails pendientes que ya deben enviarse
    const { data: pending, error } = await supabase
      .from("scheduled_notifications")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", now.toISOString());

    if (error) throw error;

    if (!pending || pending.length === 0) {
      console.log("📭 No hay emails para enviar");
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "No hay emails" })
      };
    }

    console.log(`📧 Enviando ${pending.length} emails...`);

    let sent = 0;
    for (const notification of pending) {
      try {
        // ✅ LLAMAR A LA FUNCIÓN DE SUPABASE PARA ENVIAR
        const response = await fetch(
          `${process.env.SUPABASE_URL}/functions/v1/send-email-gmail`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              taskName: notification.task_name,
              taskId: notification.task_id,
              scheduledDate: notification.scheduled_for.split(" ")[0],
              scheduledTime: notification.scheduled_for.split(" ")[1],
              userEmail: notification.user_email,
              toEmail: notification.user_email,
            }),
          }
        );

        if (response.ok) {
          // ✅ Marcar como enviado
          await supabase
            .from("scheduled_notifications")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", notification.id);
          sent++;
          console.log(`✅ Enviado: ${notification.task_name}`);
        } else {
          const errorData = await response.json();
          console.error(`❌ Error enviando ${notification.task_name}:`, errorData);
        }
      } catch (err) {
        console.error(`❌ Error con ${notification.task_name}:`, err.message);
      }
    }

    console.log(`📊 Resumen: ${sent} de ${pending.length} enviados`);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: `${sent} emails enviados de ${pending.length}` 
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