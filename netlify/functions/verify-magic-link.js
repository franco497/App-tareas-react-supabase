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
      console.log(`⏳ Token no encontrado, esperando ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.log("🔄 Último intento sin filtro de expiración...");
  const { data, error } = await supabase
    .from("magic_links")
    .select("*")
    .eq("token", token)
    .single();

  return { data, error };
};

// ✅ FUNCIÓN PARA INICIAR SESIÓN CON REINTENTOS
const loginWithRetry = async (email, password, maxRetries = 3, delay = 2000) => {
  console.log(`🔐 Intentando iniciar sesión para: ${email}`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🔐 Intento ${attempt} de ${maxRetries}...`);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data?.session) {
        console.log(`✅ Sesión iniciada en intento ${attempt}`);
        return { data, error: null };
      }

      if (error) {
        console.log(`⚠️ Intento ${attempt} falló: ${error.message}`);
        
        // ✅ Si es error de credenciales y no es el último intento, esperar
        if (error.message?.includes("Invalid login credentials") && attempt < maxRetries) {
          console.log(`⏳ Esperando ${delay}ms antes de reintentar...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        return { data: null, error };
      }
    } catch (err) {
      console.log(`⚠️ Intento ${attempt} falló con excepción:`, err);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        return { data: null, error: err };
      }
    }
  }

  return { data: null, error: new Error("Máximo de reintentos alcanzado") };
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

    // ✅ BUSCAR TOKEN
    const { data: magicLink, error } = await findTokenWithRetry(token);

    if (error || !magicLink) {
      console.error("❌ Token no encontrado:", error);
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

    // ✅ Marcar como usado (si no lo estaba)
    if (!magicLink.is_used) {
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
      
      // ✅ Esperar un momento para que el usuario se propague
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      // ✅ SI EL USUARIO YA EXISTE, ACTUALIZAR SU CONTRASEÑA
      console.log("👤 Usuario ya existe, actualizando contraseña...");
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { password: temporaryPassword }
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
      console.log("✅ Contraseña actualizada");
      
      // ✅ Esperar un momento para que la contraseña se propague
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // ✅ INICIAR SESIÓN CON REINTENTOS
    const { data: session, error: loginError } = await loginWithRetry(
      email,
      temporaryPassword,
      5, // Max retries
      2000 // Delay entre intentos
    );

    if (loginError || !session?.session) {
      console.error("❌ Error iniciando sesión después de reintentos:", loginError);
      
      // ✅ ÚLTIMO RECURSO: Intentar con la contraseña actual sin actualizar
      console.log("🔄 Último recurso: intentando login sin actualizar contraseña...");
      const { data: lastTry, error: lastError } = await supabase.auth.signInWithPassword({
        email,
        password: temporaryPassword,
      });

      if (lastError || !lastTry?.session) {
        console.error("❌ Error final al iniciar sesión:", lastError);
        return {
          statusCode: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({ error: "Error iniciando sesión" }),
        };
      }

      console.log("✅ Sesión iniciada (último recurso)");
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ success: true, session: lastTry.session }),
      };
    }

    console.log(`✅ Sesión iniciada: ${session.session.user.email}`);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ success: true, session: session.session }),
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