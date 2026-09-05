// src/pages/AuthCallback.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// 🔥 LOG DE CARGA DEL ARCHIVO
console.log("🔥 AuthCallback.jsx se ha cargado (archivo)");

function AuthCallback() {
  // 🔥 LOG DE RENDERIZADO DEL COMPONENTE
  console.log("🔥 AuthCallback componente renderizado");

  const [status, setStatus] = useState("Verificando tu enlace...");
  const [processed, setProcessed] = useState(false);

  // ✅ FUNCIÓN PARA EXTRAER TOKEN DE LA URL
  const extractTokenFromUrl = () => {
    console.log("🔍 extractTokenFromUrl() llamada");

    const url = window.location.href;
    const search = window.location.search;
    const hash = window.location.hash;
    const pathname = window.location.pathname;

    console.log("🔍 ===== EXTRACTANDO TOKEN =====");
    console.log("📍 URL completa:", url);
    console.log("📍 Pathname:", pathname);
    console.log("📍 Search:", search);
    console.log("📍 Hash:", hash);

    let token = null;

    // ✅ MÉTODO 1: URLSearchParams
    const params = new URLSearchParams(search);
    token = params.get("token");
    console.log("🔍 Método 1 (URLSearchParams):", token);

    // ✅ MÉTODO 2: Regex en URL completa
    if (!token) {
      const match = url.match(/[?&]token=([^&]+)/);
      if (match) {
        token = match[1];
        console.log("🔍 Método 2 (Regex URL):", token);
      }
    }

    // ✅ MÉTODO 3: Buscar en hash
    if (!token && hash) {
      const hashMatch = hash.match(/[?&]token=([^&]+)/);
      if (hashMatch) {
        token = hashMatch[1];
        console.log("🔍 Método 3 (Hash):", token);
      }
    }

    console.log("🔍 TOKEN FINAL:", token);
    console.log("🔍 Longitud:", token?.length || 0);

    return token;
  };

  useEffect(() => {
    console.log("🔥 useEffect de AuthCallback ejecutado");
    console.log("📌 processed:", processed);

    const verifyToken = async () => {
      console.log("🚀 verifyToken() iniciado");

      // ✅ Evitar procesamiento múltiple
      if (processed) {
        console.log("⏳ Ya procesado, saliendo...");
        return;
      }
      setProcessed(true);
      console.log("✅ processed seteado a true");

      try {
        // ✅ EXTRAER TOKEN
        const token = extractTokenFromUrl();

        console.log("📤 Token extraído:", token);

        if (!token) {
          console.error("❌ TOKEN NO ENCONTRADO");
          console.log("📝 URL completa:", window.location.href);
          console.log("📝 Search:", window.location.search);

          setStatus("❌ Token no encontrado en la URL");
          setTimeout(() => {
            window.location.replace("/");
          }, 3000);
          return;
        }

        // ✅ DETECTAR SI ESTÁ EN LOCAL
        const isLocal =
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1" ||
          window.location.port === "5175";

        console.log("🔧 Modo:", isLocal ? "LOCAL" : "PRODUCCIÓN");
        console.log("📤 Token a verificar:", token);

        let data;
        let responseOk;

        if (isLocal) {
          console.log("🔧 Modo local: usando Supabase directamente");
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();
          if (error) throw error;
          if (!session) throw new Error("No hay sesión");

          data = { success: true, session };
          responseOk = true;
          localStorage.setItem("supabaseSession", JSON.stringify(session));

          await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });
        } else {
          console.log("🚀 Modo producción: verificando con Netlify Function");
          console.log("📤 Enviando token:", token);

          // ✅ INTENTAR CON RETRY
          let response;
          let retryCount = 0;
          const maxRetries = 2;

          while (retryCount <= maxRetries) {
            try {
              response = await fetch(
                "https://sistema-tareas-recordatorios.netlify.app/.netlify/functions/verify-magic-link",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                  },
                  body: JSON.stringify({ token }),
                },
              );
              break;
            } catch (err) {
              retryCount++;
              console.log(`⚠️ Intento ${retryCount} falló:`, err);
              if (retryCount <= maxRetries) {
                await new Promise((resolve) =>
                  setTimeout(resolve, 1000 * retryCount),
                );
              } else {
                throw err;
              }
            }
          }

          const responseText = await response.text();
          console.log("📨 Respuesta raw:", responseText);

          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error("❌ Error parseando respuesta:", parseError);
            console.log("📝 Respuesta raw:", responseText);
            throw new Error("El servidor no respondió correctamente");
          }

          responseOk = response.ok;

          console.log("📨 Respuesta de verify-magic-link:", {
            status: response.status,
            ok: responseOk,
            success: data.success,
            hasSession: !!data.session,
            error: data.error,
          });

          if (responseOk && data.session) {
            console.log("✅ Sesión recibida correctamente");
            console.log("👤 Usuario:", data.session.user.email);

            localStorage.setItem(
              "supabaseSession",
              JSON.stringify(data.session),
            );
            console.log("✅ Sesión guardada en localStorage");

            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            });

            if (setSessionError) {
              console.error(
                "❌ Error restaurando sesión en Supabase:",
                setSessionError,
              );
            } else {
              console.log("✅ Sesión restaurada en Supabase");
            }

            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        if (!responseOk || !data.success) {
          console.error("❌ Error en la verificación:", data.error);
          throw new Error(data.error || "Token inválido o expirado");
        }

        if (data.session) {
          console.log("🚀 Redirigiendo a dashboard...");
          window.location.replace("/dashboard");
        } else {
          throw new Error("No se recibió sesión del servidor");
        }
      } catch (error) {
        console.error("❌ Error en AuthCallback:", error);
        console.error("📝 Stack:", error.stack);

        // ✅ ESTO CONGELARÁ LA PANTALLA PARA VER LOS LOGS
        debugger; // ← La ejecución se pausa aquí

        setStatus(`❌ ${error.message || "Error de autenticación"}`);
        setTimeout(() => {
          window.location.replace("/");
        }, 3000);
      }
    };

    // ✅ EJECUTAR INMEDIATAMENTE, SIN DELAY
    verifyToken();

    // ✅ LIMPIAR
    return () => {
      console.log("🧹 Limpiando AuthCallback");
    };
  }, [processed]); // ✅ Dependencia correcta

  return (
    <div className="auth-callback-container">
      <div className="auth-callback-content">
        <div
          style={{
            width: "50px",
            height: "50px",
            border: "4px solid #f3f3f3",
            borderTop: "4px solid #3498db",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 20px",
          }}
        />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>

        <h2 className="auth-callback-status">{status}</h2>
      </div>
    </div>
  );
}

export default AuthCallback;
