// netlify/functions/verify-magic-link.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

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
    const { token } = JSON.parse(event.body);

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

    if (error || !magicLink) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Token inválido o expirado" }),
      };
    }

    // ✅ Marcar como usado
    await supabase
      .from("magic_links")
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq("id", magicLink.id);

    // ✅ Crear sesión en Supabase
    const { data: session, error: sessionError } =
      await supabase.auth.signInWithPassword({
        email: magicLink.email,
        password: token,
      });

    if (sessionError) {
      // Si el usuario no existe, crearlo
      const { error: signUpError } = await supabase.auth.signUp({
        email: magicLink.email,
        password: token,
      });

      if (signUpError) throw signUpError;

      const { data: newSession, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: magicLink.email,
          password: token,
        });

      if (loginError) throw loginError;

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
