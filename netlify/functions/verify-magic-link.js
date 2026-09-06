// netlify/functions/verify-magic-link.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ✅ FUNCIÓN PARA BUSCAR TOKEN CON REINTENTOS
const findTokenWithRetry = async (token, maxRetries = 5, delay = 2000) => {
  console.log(`🔍 Buscando token: ${token}`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🔍 Intento ${attempt} de ${maxRetries}...`);
    
    const { data, error } = await supabase
      .from("magic_links")
      .select("*")
      .eq("token", token)
      .gte("expires_at", new Date().toISOString())
      .single();

    if (data) {
      console.log(`✅ Token encontrado en intento ${attempt}`);
      return { data, error: null };
    }

    if (attempt < maxRetries) {
      console.log(`⏳ Token no encontrado (${error?.message || "sin datos"}), esperando ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Último intento: buscar sin filtro de expiración
  console.log("🔄 Último intento sin filtro de expiración...");
  const { data, error } = await supabase
    .from("magic_links")
    .select("*")
    .eq("token", token)
    .single();

  return { data, error };
};

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

    console.log("🔍 ===== VERIFY-MAGIC-LINK =====");
    console.log(`📝 Token recibido: ${token}`);

    // ✅ BUSCAR TOKEN CON REINTENTOS
    const { data: magicLink, error } = await findTokenWithRetry(token);

    if (error || !magicLink) {
      console.error("❌ Token no encontrado después de reintentos:", error);
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Token inválido o expirado" }),
      };
    }

    console.log(`✅ Token encontrado: ${magicLink.token}`);
    console.log(`📧 Email: ${magicLink.email}`);
    console.log(`🔒 Usado: ${magicLink.is_used}`);
    console.log(`⏰ Creado: ${magicLink.created_at}`);
    console.log(`⏰ Expira: ${magicLink.expires_at}`);

    // ✅ Si el token ya fue usado pero no expiró, permitirlo
    if (magicLink.is_used) {
      console.log("⚠️ Token ya usado, pero aún válido. Reutilizando...");
    } else {
      // ✅ Marcar como usado
      const { error: updateError } = await supabase
        .from("magic_links")
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq("id", magicLink.id);

      if (updateError) {
        console.error("❌ Error marcando token como usado:", updateError);
      } else {
        console.log("✅ Token marcado como usado");
      }
    }

    const email = magicLink.email;
    const temporaryPassword = token + "magic_link_password_123";

    // ✅ VERIFICAR SI EL USUARIO YA EXISTE
    const { data: users, error: listError } =
      await supabase.auth.admin.listUsers();

    if (listError) {
      console.error("❌ Error listando usuarios:", listError);
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Error verificando usuario" }),
      };
    }

    const existingUser = users?.users?.find((user) => user.email === email);

    // ✅ SI EL USUARIO NO EXISTE, CREARLO
    if (!existingUser) {
      console.log("🆕 Usuario no existe, creando...");
      const { data: newUser, error: signUpError } =
        await supabase.auth.admin.createUser({
          email: email,
          password: temporaryPassword,
          email_confirm: true,
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
      console.log(`✅ Usuario creado: ${email}`);
    }

    // ✅ INICIAR SESIÓN
    console.log("🔐 Iniciando sesión...");
    const { data: session, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: email,
        password: temporaryPassword,
      });

    if (loginError) {
      console.error("❌ Error iniciando sesión:", loginError);

      // Si el usuario existe pero la contraseña no funciona, actualizarla
      if (existingUser) {
        console.log("🔄 Reintentando con actualización de contraseña...");

        const { error: updateError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          { password: temporaryPassword },
        );

        if (updateError) {
          console.error("❌ Error actualizando contraseña:", updateError);
          return {
            statusCode: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({ error: "Error actualizando contraseña" }),
          };
        }

        // Reintentar login
        const { data: retrySession, error: retryError } =
          await supabase.auth.signInWithPassword({
            email: email,
            password: temporaryPassword,
          });

        if (retryError) {
          console.error("❌ Error reintentando login:", retryError);
          return {
            statusCode: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({ error: "Error iniciando sesión" }),
          };
        }

        console.log("✅ Sesión iniciada (reintento)");
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({ success: true, session: retrySession }),
        };
      }

      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Error iniciando sesión" }),
      };
    }

    console.log(`✅ Sesión iniciada: ${session.user.email}`);

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