// netlify/functions/verify-magic-link.js
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("❌ ERROR CRÍTICO: JWT_SECRET no está configurado");
  throw new Error("JWT_SECRET es requerido");
}
console.log(`🔐 JWT_SECRET ${JWT_SECRET ? '✅ configurado' : '❌ NO configurado'}`);

// ✅ VERIFICAR JWT
function verifyJWT(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.purpose !== "magic-link") {
      return { valid: false, error: "Propósito inválido" };
    }
    return { valid: true, email: decoded.email, decoded };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// ✅ FUNCIÓN PARA INICIAR SESIÓN CON REINTENTOS
const loginWithRetry = async (email, password, maxRetries = 5, delay = 2000) => {
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
        if (error.message?.includes("Invalid login credentials") && attempt < maxRetries) {
          console.log(`⏳ Esperando ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        return { data: null, error };
      }
    } catch (err) {
      console.log(`⚠️ Intento ${attempt} falló:`, err);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        return { data: null, error: err };
      }
    }
  }
  return { data: null, error: new Error("Máximo de reintentos") };
};

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

    console.log("🔍 ===== VERIFY-MAGIC-LINK =====");
    console.log(`📝 Token recibido: ${token.substring(0, 30)}...`);

    // ✅ BUSCAR EL TOKEN EN LA BD
    const { data: magicLink, error } = await supabase
      .from("magic_links")
      .select("*")
      .eq("token", token)
      .gte("expires_at", new Date().toISOString())
      .single();

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

    // ✅ VERIFICAR EL JWT ASOCIADO
    if (!magicLink.jwt_token) {
      console.error("❌ No hay JWT asociado");
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Token inválido" }),
      };
    }

    const { valid, email, decoded } = verifyJWT(magicLink.jwt_token);
    
    if (!valid) {
      console.error("❌ JWT inválido:", decoded);
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Token inválido o expirado" }),
      };
    }

    console.log(`✅ JWT válido para: ${email}`);

    // ✅ Marcar como usado
    if (!magicLink.is_used) {
      await supabase
        .from("magic_links")
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq("id", magicLink.id);
      console.log("✅ Token marcado como usado");
    }

    // ============================================
    // ✅ GENERAR CONTRASEÑA TEMPORAL CORTA
    // ============================================
    // Usamos el token que llega (puede ser JWT largo)
    // Pero tomamos solo los primeros 20 caracteres + timestamp
    // Longitud: ~30 caracteres - ✅ DENTRO DEL LÍMITE DE SUPABASE
    const temporaryPassword = "Temp_" + token.substring(0, 20) + "_" + Date.now().toString().slice(-6);
    console.log(`🔐 Contraseña temporal generada (${temporaryPassword.length} caracteres)`);
    console.log(`🔐 Password: ${temporaryPassword}`);

    // ✅ VERIFICAR SI EL USUARIO YA EXISTE
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

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
      const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
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
        console.log(`📝 Error details:`, updateError);
        return {
          statusCode: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({ 
            error: "Error actualizando contraseña",
            details: updateError.message 
          }),
        };
      }
      console.log("✅ Contraseña actualizada");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // ✅ INICIAR SESIÓN CON REINTENTOS
    const { data: session, error: loginError } = await loginWithRetry(
      email,
      temporaryPassword,
      5,
      2000
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