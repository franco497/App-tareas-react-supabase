// src/pages/AuthCallback.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

console.log("🔥 AuthCallback.jsx se ha cargado (archivo)");

function AuthCallback() {
  console.log("🔥 AuthCallback componente renderizado");

  const [status, setStatus] = useState("Verificando tu enlace...");
  const [processed, setProcessed] = useState(false);

  const extractTokenFromUrl = () => {
    // ✅ FORZAR LA LECTURA DIRECTA DE LA URL ACTUAL
    const url = window.location.href;
    const search = window.location.search;

    console.log("🔍 ===== EXTRACTANDO TOKEN =====");
    console.log("📍 URL actual (window.location.href):", url);
    console.log("📍 Search actual (window.location.search):", search);

    let token = null;

    // ✅ MÉTODO 1: URLSearchParams - EL MÁS CONFIABLE
    const params = new URLSearchParams(search);
    token = params.get("token");
    console.log("🔍 Método 1 (URLSearchParams):", token);

    // ✅ MÉTODO 2: Si no hay token en search, buscar en la URL completa
    if (!token) {
      const match = url.match(/[?&]token=([^&]+)/);
      if (match) {
        token = match[1];
        console.log("🔍 Método 2 (Regex URL):", token);
      }
    }

    // ✅ MÉTODO 3: Si hay hash, buscar allí
    if (!token && window.location.hash) {
      const hashMatch = window.location.hash.match(/[?&]token=([^&]+)/);
      if (hashMatch) {
        token = hashMatch[1];
        console.log("🔍 Método 3 (Hash):", token);
      }
    }

    // ✅ VERIFICACIÓN FINAL: ¿El token es el mismo que en la URL?
    console.log("🔍 TOKEN FINAL:", token);
    console.log("🔍 Longitud:", token?.length || 0);

    // ✅ Si el token es el VIEJO, esto se verá en los logs
    // Busca "bf964bd5" en los logs - si aparece, ese es el problema

    return token;
  };

  useEffect(() => {
    console.log("🔥 useEffect de AuthCallback ejecutado");
    console.log("📌 processed:", processed);

    const verifyToken = async () => {
      console.log("🚀 verifyToken() iniciado");

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

            // ✅ Verificar sesión activa
            const { data: sessionData } = await supabase.auth.getSession();

            if (sessionData?.session) {
              console.log(
                "✅ Sesión activa en Supabase:",
                sessionData.session.user.email,
              );
            } else {
              console.log(
                "⏳ La sesión se activará automáticamente con el evento SIGNED_IN",
              );
            }

            await new Promise((resolve) => setTimeout(resolve, 1500));
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

        setStatus(`❌ ${error.message || "Error de autenticación"}`);
        setTimeout(() => {
          window.location.replace("/");
        }, 3000);
      }
    };

    // ✅ EJECUTAR CON UN PEQUEÑO DELAY PARA ASEGURAR QUE LA URL ESTÉ COMPLETA
    const timer = setTimeout(() => {
      verifyToken();
    }, 100);

    return () => {
      clearTimeout(timer);
      console.log("🧹 Limpiando AuthCallback");
    };
  }, [processed]);

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
