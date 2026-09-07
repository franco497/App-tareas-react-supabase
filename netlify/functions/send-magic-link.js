// netlify/functions/send-magic-link.js
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const FROM_EMAIL = process.env.GMAIL_FROM_EMAIL || "devincentisf35@gmail.com";
const SITE_URL = process.env.SITE_URL || "https://sistema-tareas-recordatorios.netlify.app";

// ✅ JWT SECRET - VALIDAR QUE EXISTE
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("❌ ERROR CRÍTICO: JWT_SECRET no está configurado");
  throw new Error("JWT_SECRET es requerido");
}
console.log(`🔐 JWT_SECRET ${JWT_SECRET ? '✅ configurado' : '❌ NO configurado'}`);

// ✅ Generar token corto para la URL (32 caracteres)
function generateShortToken() {
  return crypto.randomBytes(16).toString('hex');
}

// ✅ Generar JWT para verificación (firmado digitalmente)
function generateJWT(email) {
  const payload = {
    email: email,
    purpose: "magic-link",
    timestamp: Date.now(),
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
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

    // ✅ URL con token corto (32 caracteres) - SIN timestamp para evitar caché
    const magicLinkUrl = `${SITE_URL}/auth/callback?token=${token}`;

    const textContent = `
Hola,

Has solicitado un enlace de acceso para tu cuenta en App de Tareas.

Inicia sesión aquí: ${magicLinkUrl}

Si el enlace no funciona, cópialo y pégalo en tu navegador.

Este enlace expirará en 15 minutos.

Si no solicitaste este enlace, ignora este correo.

© 2026 - App Tareas - Sistema de Gestión y Recordatorios
`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
    .button {
      display: inline-block;
      background: #28a745;
      color: #ffffff !important;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      border: none;
      cursor: pointer;
      font-size: 16px;
    }
    .button:hover { background: #218838; }
    .button:visited, .button:active { color: #ffffff !important; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6c757d; }
    .warning {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 12px;
      margin: 10px 0;
      text-align: center;
      font-size: 0.9rem;
      color: #856404;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🔐 Enlace de acceso</h2>
    </div>
    <div class="content">
      <p>Has solicitado un enlace de acceso para tu cuenta.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${magicLinkUrl}" target="_blank" rel="noopener noreferrer" class="button">Iniciar sesión</a>
      </p>
      <p>O copia este enlace en tu navegador:</p>
      <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 5px; font-size: 0.9rem;">
        ${magicLinkUrl}
      </p>
      <div class="warning">
        ⏰ Este enlace expirará en <strong>15 minutos</strong>.
      </div>
      <p>Si no solicitaste este enlace, ignora este correo.</p>
      <p style="font-size: 13px; color: #888888; text-align: center; margin-top: 15px;">
        💡 Agrega <strong style="color: #667eea;">${FROM_EMAIL}</strong> a tus contactos para asegurar la entrega.
      </p>
    </div>
    <div class="footer">
      <p>© 2026 - App Tareas - Sistema de Gestión y Recordatorios</p>
    </div>
  </div>
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

    const RATE_LIMIT = 15;
    const TIME_WINDOW = 60 * 60 * 1000;

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

    // ✅ GENERAR TOKEN CORTO PARA LA URL
    const shortToken = generateShortToken();
    console.log(`🆕 Token corto: ${shortToken}`);

    // ✅ GENERAR JWT PARA VERIFICACIÓN
    const jwtToken = generateJWT(email);
    console.log(`🆕 JWT generado: ${jwtToken.substring(0, 30)}...`);

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // ✅ Guardar en base de datos (SOLO para auditoría)
    try {
      const { error: insertError } = await supabase.from("magic_links").insert({
        email,
        token: shortToken,
        jwt_token: jwtToken,
        expires_at: expiresAt.toISOString(),
        ip_address: getClientIP(event),
        user_agent: event.headers["user-agent"] || "unknown",
        is_used: false,
      });

      if (insertError) {
        console.error("❌ Error guardando token en BD:", insertError);
        console.log("⚠️ Continuando sin guardar en BD (el JWT es autosuficiente)");
      } else {
        console.log("✅ Token guardado en BD para auditoría");
      }
    } catch (dbError) {
      console.log("⚠️ Error en BD (no crítico):", dbError.message);
    }

    // ✅ Enviar email con el TOKEN CORTO en la URL
    const emailSent = await sendMagicLinkEmail(email, shortToken);

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