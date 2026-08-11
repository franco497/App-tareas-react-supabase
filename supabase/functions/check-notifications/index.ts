// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
);

// FUNCIÓN PARA OBTENER HORA ACTUAL EN ARGENTINA
function getNowInArgentina() {
  const now = new Date();
  return new Date(now.getTime() - 3 * 60 * 60 * 1000);
}

// FUNCIÓN PARA PARSEAR FECHA EN ARGENTINA
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

async function processEmails() {

  try {
    // USAR HORA ARGENTINA PARA LA COMPARACIÓN
    const now = getNowInArgentina();

    const { data: pending, error } = await supabase
      .from("scheduled_notifications")
      .select("*")
      .eq("status", "pending");

    if (error) throw error;
    if (!pending || pending.length === 0) {
      console.log("📭 No hay emails para enviar");
      return;
    }

    const toSend = pending.filter((notif) => {
      const scheduledDate = parseLocalDate(notif.scheduled_for);
      if (!scheduledDate) {
        console.log(`⚠️ Fecha inválida: ${notif.scheduled_for}`);
        return false;
      }

      const diffMs = scheduledDate.getTime() - now.getTime();
      const diffMinutes = diffMs / 60000;

      const shouldSend = scheduledDate <= now;
      console.log(`   ¿Enviar ahora?: ${shouldSend ? "✅ SI" : "❌ NO"}`);

      return shouldSend;
    });

    if (toSend.length === 0) {
      console.log("⏳ No hay emails para enviar en este momento");
      return;
    }

    let sent = 0;
    let failed = 0;

    for (const notification of toSend) {
      try {
        if (!notification.user_email) {
          console.error(
            `❌ Error: email es undefined para ${notification.task_name}`,
          );
          failed++;
          continue;
        }

        const scheduledParts = notification.scheduled_for.split(" ");
        const scheduledDate =
          scheduledParts[0] || new Date().toISOString().split("T")[0];
        const scheduledTime = scheduledParts[1] || "00:00:00";

        const scheduledDateObj = parseLocalDate(notification.scheduled_for);
        const formattedDate = scheduledDateObj
          ? scheduledDateObj.toLocaleString("es-ES", {
              timeZone: "America/Argentina/Buenos_Aires",
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Fecha no válida";

        const requestBody = {
          taskName: notification.task_name || "Tarea sin nombre",
          taskId: notification.task_id || "sin-id",
          scheduledDate: scheduledDate,
          scheduledTime: scheduledTime.slice(0, 5),
          userEmail: notification.user_email,
          toEmail: notification.user_email,
          formattedDate: formattedDate,
        };

        const response = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email-gmail`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify(requestBody),
          },
        );

        const responseData = await response.json();

        if (response.ok) {
          await supabase
            .from("scheduled_notifications")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
            })
            .eq("id", notification.id);

          sent++;
        } else {
          console.error(
            `❌ Error enviando ${notification.task_name}:`,
            responseData,
          );
          failed++;
        }
      } catch (err) {
        console.error(`❌ Error con ${notification.task_name}:`, err.message);
        failed++;
      }
    }

  } catch (error) {
    console.error("❌ Error en cron:", error);
  }
}

serve(async (req) => {

  try {
    await processEmails();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Emails procesados correctamente",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
