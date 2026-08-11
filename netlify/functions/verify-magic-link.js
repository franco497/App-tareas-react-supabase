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

    // Buscar token válido
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

    //  Marcar como usado
    await supabase
      .from("magic_links")
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq("id", magicLink.id);


    const email = magicLink.email;
    const temporaryPassword = token + "magic_link_password_123";

    // VERIFICAR SI EL USUARIO YA EXISTE EN SUPABASE AUTH
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

    // SI EL USUARIO NO EXISTE, CREARLO
    if (!existingUser) {

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

    }

    // INICIAR SESIÓN

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
