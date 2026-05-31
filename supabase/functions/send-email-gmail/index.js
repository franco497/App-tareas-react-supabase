// supabase/functions/send-email-gmail/index.js
import { google } from "https://esm.sh/googleapis@172.0.0";
import nodemailer from "https://esm.sh/nodemailer@8.0.9";

Deno.serve(async (req) => {
  // Habilitar CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    // Obtener datos del body
    const {
      taskName,
      taskId,
      scheduledDate,
      scheduledTime,
      userEmail,
      toEmail,
    } = await req.json();

    // Validar datos requeridos
    if (!taskName || !scheduledDate || !scheduledTime || !userEmail) {
      return new Response(
        JSON.stringify({ error: "Faltan datos requeridos" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Obtener credenciales de variables de entorno
    const CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID");
    const CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET");
    const REDIRECT_URI = Deno.env.get("GMAIL_REDIRECT_URI");
    const REFRESH_TOKEN = Deno.env.get("GMAIL_REFRESH_TOKEN");
    const FROM_EMAIL =
      Deno.env.get("GMAIL_FROM_EMAIL") || "devincentisf35@gmail.com";
    const TO_EMAIL =
      toEmail || Deno.env.get("GMAIL_TO_EMAIL") || "devincentisf35@gmail.com";

    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
      console.error("Faltan credenciales de Gmail");
      return new Response(
        JSON.stringify({ error: "Error de configuración del servidor" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Configurar OAuth2
    const oAuth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI,
    );
    oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

    // Formatear fecha para mostrar bonito
    const formattedDate = new Date(
      `${scheduledDate}T${scheduledTime}`,
    ).toLocaleString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Crear HTML del email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .task { background: white; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0; border-radius: 5px; }
          .date { background: #e9ecef; padding: 10px; border-radius: 5px; text-align: center; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>📋 Recordatorio de Tarea</h2>
          </div>
          <div class="content">
            <p>Hola,</p>
            <p>Has programado un recordatorio para la siguiente tarea:</p>
            
            <div class="task">
              <strong>✅ Tarea:</strong> ${taskName}
            </div>
            
            <div class="date">
              📅 <strong>Fecha y hora programada:</strong><br>
              ${formattedDate}
            </div>
            
            <p>No olvides completar esta tarea a tiempo.</p>
            <p>¡Éxito con tus actividades! 🚀</p>
          </div>
          <div class="footer">
            <p>Este es un recordatorio automático de tu app de tareas.</p>
            <p>© 2025 - Mi App de Tareas</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Obtener access token y enviar email
    const accessToken = await oAuth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: FROM_EMAIL,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: `"App de Tareas" <${FROM_EMAIL}>`,
      to: TO_EMAIL,
      subject: `📬 Recordatorio: ${taskName}`,
      html: htmlContent,
    };

    const result = await transporter.sendMail(mailOptions);

    console.log("Email enviado:", result.messageId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notificación enviada correctamente",
        messageId: result.messageId,
        to: TO_EMAIL,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (error) {
    console.error("Error en Edge Function:", error);
    return new Response(
      JSON.stringify({
        error: "Error interno del servidor",
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
});
