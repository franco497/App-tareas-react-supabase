// netlify/functions/verify-magic-link.js
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ✅ JWT SECRET - VALIDAR QUE EXISTE
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("❌ ERROR CRÍTICO: JWT_SECRET no está configurado");
  throw new Error("JWT_SECRET es requerido");
}
console.log(`🔐 JWT_SECRET ${JWT_SECRET ? '✅ configurado' : '❌ NO configurado'}`);

// ✅ Verificar JWT (sin consultar la base de datos)
function verifyMagicLinkToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.purpose !== "magic-link") {
      return { valid: false, error: "Propósito inválido" };
    }
    
    return { 
      valid: true, 
      email: decoded.email, 
      decoded,
      error: null 
    };
  } catch (error) {
    return { 
      valid: false, 
      error: error.message,
      email: null,
      decoded: null 
    };
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
    console.log(`📝 Token recibido: ${token.substring(0, 20)}...`);

    // ✅ VERIFICAR JWT (sin consultar la base de datos)
    const { valid, email, decoded, error } = verifyMagicLinkToken(token);

    if (!valid) {
      console.error("❌ JWT inválido:", error);
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
    console.log(`📝 Payload:`, decoded);

    // ✅ Opcional: Verificar en base de datos para auditoría
    try {
      const { data: magicLink } = await supabase
        .from("magic_links")
        .select("*")
        .eq("token", token)
        .single();

      if (magicLink && !magicLink.is_used) {
        await supabase
          .from("magic_links")
          .update({ is_used: true, used_at: new Date().toISOString() })
          .eq("id", magicLink.id);
        console.log("✅ Token marcado como usado en BD");
      } else if (magicLink && magicLink.is_used) {
        console.log("⚠️ Token ya estaba marcado como usado en BD");
      } else {
        console.log("⚠️ Token no encontrado en BD (solo JWT válido)");
      }
    } catch (dbError) {
      console.log("⚠️ No se pudo actualizar la BD:", dbError.message);
    }

    // ✅ CONTINUAR CON LOGIN
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