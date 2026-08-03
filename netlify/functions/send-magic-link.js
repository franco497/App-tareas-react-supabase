// netlify/functions/send-magic-link.js
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import nodemailer from "nodemailer";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const FROM_EMAIL = process.env.GMAIL_FROM_EMAIL || "devincentisf35@gmail.com";
const SITE_URL = process.env.SITE_URL || "https://tudominio.netlify.app";

function generateToken() {
  const crypto = globalThis.crypto;
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function getClientIP(event) {
  const forwarded = event.headers["x-forwarded-for"];
  return forwarded ? forwarded.split(",")[0] : "unknown";
}

async function sendMagicLinkEmail(email, token) {
  try {
    const oAuth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI,
    );
    oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
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
      tls: { rejectUnauthorized: false },
    });

    const magicLinkUrl = `${SITE_URL}/auth/callback?token=${token}`;

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
          .button { display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🔐 Enlace de acceso</h2>
          </div>
          <div class="content">
            <p>Hola,</p>
            <p>Has solicitado un enlace de acceso para tu cuenta.</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${magicLinkUrl}" class="button">Iniciar sesión</a>
            </p>
            <p>O copia este enlace en tu navegador:</p>
            <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 5px; font-size: 0.9rem;">
              ${magicLinkUrl}
            </p>
            <p>El enlace expirará en <strong>15 minutos</strong>.</p>
            <p>Si no solicitaste este enlace, ignora este correo.</p>
          </div>
          <div class="footer">
            <p>© 2025 - Mi App de Tareas</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"App de Tareas" <${FROM_EMAIL}>`,
      to: email,
      subject: "🔐 Tu enlace de acceso",
      html: htmlContent,
    });

    return true;
  } catch (error) {
    console.error("❌ Error enviando email:", error);
    return false;
  }
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: "",
    };
  }

  try {
    const { email } = JSON.parse(event.body);

    if (!email) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Email es requerido" }),
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Email inválido" }),
      };
    }

    // ✅ Configuración para DEMO (más permisivo)
    const RATE_LIMIT = 15; // 15 intentos por hora
    const TIME_WINDOW = 60 * 60 * 1000; // 1 hora

    // Verificar límite
    const timeAgo = new Date(Date.now() - TIME_WINDOW);
    const { count, error: countError } = await supabase
      .from("magic_links")
      .select("*", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", timeAgo.toISOString());

    if (countError) throw countError;

    if (count && count >= RATE_LIMIT) {
      return {
        statusCode: 429,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: `Demasiados intentos. Espera una hora. (Límite: ${RATE_LIMIT} intentos por hora)`,
        }),
      };
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const { error: insertError } = await supabase.from("magic_links").insert({
      email,
      token,
      expires_at: expiresAt.toISOString(),
      ip_address: getClientIP(event),
      user_agent: event.headers["user-agent"] || "unknown",
    });

    if (insertError) throw insertError;

    const emailSent = await sendMagicLinkEmail(email, token);

    if (!emailSent) {
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Error al enviar el email" }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: true,
        message: "Enlace de acceso enviado",
      }),
    };
  } catch (error) {
    console.error("❌ Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Error interno del servidor" }),
    };
  }
};
