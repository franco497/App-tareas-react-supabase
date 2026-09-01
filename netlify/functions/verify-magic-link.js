// netlify/functions/verify-magic-link.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export const handler = async (event) => {
  // CORS
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
    // 🔍 LOG 1: Verificar que la función se está ejecutando
    console.log("📨 === VERIFY-MAGIC-LINK INVOCADA ===");
    console.log("📋 Método HTTP:", event.httpMethod);
    console.log("📋 Headers:", JSON.stringify(event.headers, null, 2));
    console.log("📋 Body recibido:", event.body);

    const { token } = JSON.parse(event.body);

    console.log("🔍 Token recibido:", token);
    console.log("📏 Longitud del token:", token?.length);

    if (!token) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Token es requerido" }),
      };
    }

    // 🔍 LOG 2: Buscar el token en la base de datos SIN filtros
    console.log("🔍 Buscando token en la base de datos...");
    const { data: allTokens, error: allError } = await supabase
      .from("magic_links")
      .select("*")
      .eq("token", token);

    console.log("📊 Tokens encontrados (sin filtros):", allTokens?.length || 0);
    if (allTokens && allTokens.length > 0) {
      console.log("📋 Detalles del primer token encontrado:", {
        email: allTokens[0].email,
        is_used: allTokens[0].is_used,
        expires_at: allTokens[0].expires_at,
        created_at: allTokens[0].created_at,
        used_at: allTokens[0].used_at
      });
    }

    // ✅ Buscar token válido
    const now = new Date();
    console.log("🕒 Hora actual (UTC):", now.toISOString());
    console.log("🕒 Hora actual (Argentina):", now.toLocaleString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires"
    }));

    const { data: magicLink, error } = await supabase
      .from("magic_links")
      .select("*")
      .eq("token", token)
      .eq("is_used", false)
      .gte("expires_at", now.toISOString())
      .single();

    // ✅ Si no encuentra el token, verificar si fue invalidado
    if (error || !magicLink) {
      console.log("⚠️ Token no encontrado o expirado, verificando si fue invalidado...");
      console.log("🔍 Error de Supabase:", error);
      console.log("🔍 Token buscado:", token);

      // Verificar si hay un token con el mismo valor marcado como usado
      const { data: usedTokens, error: usedError } = await supabase
        .from("magic_links")
        .select("*")
        .eq("token", token)
        .eq("is_used", true)
        .order("used_at", { ascending: false })
        .limit(1);

      if (usedError) {
        console.error("❌ Error verificando tokens usados:", usedError);
      }

      if (usedTokens && usedTokens.length > 0) {
        console.log(`⚠️ Token ya fue usado o invalidado para ${usedTokens[0].email}`);
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ 
            error: "Este enlace ya fue utilizado o ha sido reemplazado por uno nuevo. Solicita un nuevo enlace." 
          }),
        };
      }

      console.log("❌ Token no encontrado en la base de datos");
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Token inválido o expirado" }),
      };
    }

    console.log("✅ Token válido para:", magicLink.email);
    console.log("📋 is_used:", magicLink.is_used);
    console.log("📋 expires_at:", magicLink.expires_at);
    console.log("📋 created_at:", magicLink.created_at);

    // ✅ CREAR SESIÓN PRIMERO
    const email = magicLink.email;
    const temporaryPassword = token + "magic_link_password_123";

    // Verificar si el usuario existe
    console.log("🔍 Verificando si el usuario existe:", email);
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    const existingUser = users?.users?.find((user) => user.email === email);

    // Si no existe, crearlo
    if (!existingUser) {
      console.log("👤 Usuario no existe, creando...");
      const { error: signUpError } = await supabase.auth.admin.createUser({
        email: email,
        password: temporaryPassword,
        email_confirm: true,
      });

      if (signUpError) {
        console.error("❌ Error creando usuario:", signUpError);
        return {
          statusCode: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ error: "Error creando usuario" }),
        };
      }
      console.log("✅ Usuario creado:", email);
    }

    // ✅ Iniciar sesión
    console.log("🔑 Iniciando sesión con:", email);
    const { data: session, error: loginError } = await supabase.auth.signInWithPassword({
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
          { password: temporaryPassword }
        );

        if (updateError) {
          console.error("❌ Error actualizando contraseña:", updateError);
          return {
            statusCode: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "Error actualizando contraseña" }),
          };
        }

        // Reintentar login
        const { data: retrySession, error: retryError } = await supabase.auth.signInWithPassword({
          email: email,
          password: temporaryPassword,
        });

        if (retryError) {
          console.error("❌ Error reintentando login:", retryError);
          return {
            statusCode: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "Error iniciando sesión" }),
          };
        }

        // ✅ MARCAR COMO USADO SOLO DESPUÉS DEL LOGIN EXITOSO
        await supabase
          .from("magic_links")
          .update({ is_used: true, used_at: new Date().toISOString() })
          .eq("id", magicLink.id);

        console.log("✅ Token marcado como usado (después del login)");
        console.log("✅ Sesión iniciada correctamente");

        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ success: true, session: retrySession }),
        };
      }

      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Error iniciando sesión" }),
      };
    }

    // ✅ MARCAR COMO USADO SOLO DESPUÉS DEL LOGIN EXITOSO
    await supabase
      .from("magic_links")
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq("id", magicLink.id);

    console.log("✅ Token marcado como usado (después del login)");
    console.log("✅ Sesión iniciada correctamente");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ success: true, session }),
    };
  } catch (error) {
    console.error("❌ Error en handler:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ 
        error: "Error interno del servidor", 
        details: error.message 
      }),
    };
  }
};