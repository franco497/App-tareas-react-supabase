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

    const magicLinkUrl = `${SITE_URL}/#/auth/callback?token=${token}`;

    // ✅ VERSIÓN TEXTO PLANO
    const textContent = `
Hola,

Has solicitado un enlace de acceso para tu cuenta en App de Tareas.

Inicia sesión aquí: ${magicLinkUrl}

Si el enlace no funciona, cópialo y pégalo en tu navegador.

Este enlace expirará en 15 minutos.

Si no solicitaste este enlace, ignora este correo.

© 2026 App de Tareas
`;

    // ✅ VERSIÓN HTML MEJORADA
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; margin: 20px auto; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <tr>
      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🔐 Enlace de acceso</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 20px;">
        <p style="font-size: 16px; line-height: 1.6; color: #333333;">Hola,</p>
        <p style="font-size: 16px; line-height: 1.6; color: #333333;">
          Has solicitado un enlace de acceso para tu cuenta en 
          <strong style="color: #667eea;">App de Tareas</strong>.
        </p>
        
        <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
          <tr>
            <td style="background-color: #2d6a4f; border-radius: 8px; text-align: center;">
              <a href="${magicLinkUrl}" 
                 style="display: inline-block; padding: 14px 35px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; border-radius: 8px; background-color: #2d6a4f;">
                Iniciar sesión
              </a>
            </td>
          </tr>
        </table>
        
        <p style="font-size: 14px; color: #666666; text-align: center;">
          Si el botón no funciona, copia este enlace en tu navegador:
        </p>
        <p style="word-break: break-all; background-color: #f0f0f0; padding: 12px; border-radius: 5px; font-size: 13px; color: #333333; text-align: center;">
          <a href="${magicLinkUrl}" style="color: #667eea; text-decoration: none;">${magicLinkUrl}</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;">
        <p style="font-size: 13px; color: #888888; text-align: center;">
          ⏰ Este enlace expirará en <strong>15 minutos</strong>.
        </p>
        <p style="font-size: 13px; color: #888888; text-align: center;">
          🔒 Si no solicitaste este enlace, ignora este correo.
        </p>
        <p style="font-size: 13px; color: #888888; text-align: center; margin-top: 15px;">
          💡 Agrega <strong style="color: #667eea;">${FROM_EMAIL}</strong> a tus contactos para asegurar la entrega.
        </p>
        <p style="font-size: 11px; color: #aaaaaa; text-align: center; margin-top: 10px;">
         Si no deseas recibir más correos de este tipo, 
        <a href="#" style="color: #aaaaaa; text-decoration: underline;">haz clic aquí</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #f8f8f8; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
        <p style="margin: 0; font-size: 12px; color: #aaaaaa;">
          © 2026 App de Tareas
        </p>
        <p style="margin: 5px 0 0; font-size: 12px; color: #cccccc;">
          Este es un correo automático, no responder a esta dirección.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    await transporter.sendMail({
      from: `"Franco De Vincentis - App Tareas" <${FROM_EMAIL}>`,
      to: email,
      subject: "🔐 Tu enlace de acceso a App de Tareas",
      text: textContent,
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

    // Configuración para DEMO (más permisivo)
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
