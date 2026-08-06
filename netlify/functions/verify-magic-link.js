// netlify/functions/verify-magic-link.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export const handler = async (event) => {
  // ✅ CORS
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
    const { token } = JSON.parse(event.body);

    console.log("🔍 Token recibido:", token);

    if (!token) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Token es requerido" }),
      };
    }

    // ✅ Buscar token válido
    const { data: magicLink, error } = await supabase
      .from("magic_links")
      .select("*")
      .eq("token", token)
      .eq("is_used", false)
      .gte("expires_at", new Date().toISOString())
      .single();

    if (error) {
      console.error("❌ Error buscando token:", error);
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Token inválido o expirado" }),
      };
    }

    if (!magicLink) {
      console.error("❌ Token no encontrado o expirado");
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Token inválido o expirado" }),
      };
    }

    console.log("✅ Token válido para:", magicLink.email);

    // ✅ Marcar como usado
    await supabase
      .from("magic_links")
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq("id", magicLink.id);

    console.log("✅ Token marcado como usado");

    // ✅ Crear sesión en Supabase
    const { data: session, error: sessionError } =
      await supabase.auth.signInWithPassword({
        email: magicLink.email,
        password: token,
      });

    if (sessionError) {
      console.error("❌ Error iniciando sesión:", sessionError);

      // Si el usuario no existe, crearlo
      const { error: signUpError } = await supabase.auth.signUp({
        email: magicLink.email,
        password: token,
      });

      if (signUpError) {
        console.error("❌ Error creando usuario:", signUpError);
        return {
          statusCode: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({ error: "Error creando usuario" }),
        };
      }

      const { data: newSession, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: magicLink.email,
          password: token,
        });

      if (loginError) {
        console.error(
          "❌ Error iniciando sesión después de crear usuario:",
          loginError,
        );
        return {
          statusCode: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({ error: "Error iniciando sesión" }),
        };
      }

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ success: true, session: newSession }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ success: true, session }),
    };
  } catch (error) {
    console.error("❌ Error en handler:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Error interno del servidor",
        details: error.message,
      }),
    };
  }
};
