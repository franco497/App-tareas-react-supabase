// src/pages/AuthCallback.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

console.log("🔥 AuthCallback.jsx se ha cargado (archivo)");

function AuthCallback() {
  console.log("🔥 AuthCallback componente renderizado");

  const [status, setStatus] = useState("Verificando tu enlace...");
  const [processed, setProcessed] = useState(false);

  // ✅ FUNCIÓN PARA EXTRAER TOKEN - VERSIÓN MEJORADA
  const extractTokenFromUrl = () => {
    const currentUrl = window.location.href;
    const currentSearch = window.location.search;
    const currentHash = window.location.hash;

    console.log("🔍 ===== EXTRACTANDO TOKEN =====");
    console.log("📍 URL actual:", currentUrl);
    console.log("📍 Search actual:", currentSearch);
    console.log("📍 Hash actual:", currentHash);
    console.log("📍 Pathname actual:", window.location.pathname);

    let token = null;

    // ✅ MÉTODO 1: URLSearchParams
    const params = new URLSearchParams(currentSearch);
    token = params.get("token");
    console.log("🔍 Método 1 (URLSearchParams):", token);

    // ✅ MÉTODO 2: Regex en URL completa
    if (!token) {
      const match = currentUrl.match(/[?&]token=([^&]+)/);
      if (match) {
        token = match[1];
        console.log("🔍 Método 2 (Regex URL):", token);
      }
    }

    // ✅ MÉTODO 3: Buscar en hash
    if (!token && currentHash) {
      const hashMatch = currentHash.match(/[?&]token=([^&]+)/);
      if (hashMatch) {
        token = hashMatch[1];
        console.log("🔍 Método 3 (Hash):", token);
      }
    }

    // ✅ MÉTODO 4: Intentar con URL API
    if (!token) {
      try {
        const urlObj = new URL(currentUrl);
        token = urlObj.searchParams.get("token");
        console.log("🔍 Método 4 (URL API):", token);
      } catch (e) {
        console.log("⚠️ Error usando URL API:", e);
      }
    }

    if (token) {
      console.log("🔍 TOKEN FINAL:", token.substring(0, 30) + "...");
      console.log("🔍 Longitud:", token.length);
    } else {
      console.error("❌ NO se encontró token en la URL");
    }

    return token;
  };

  useEffect(() => {
    console.log("🔥 useEffect de AuthCallback ejecutado");
    console.log("📌 processed:", processed);
    console.log("📍 URL en useEffect:", window.location.href);
    console.log("📍 Search en useEffect:", window.location.search);

    // ✅ VERIFICAR TOKEN EN LA URL - AHORA DENTRO DEL useEffect
    if (!window.location.search.includes('token')) {
      console.warn("⚠️ No hay token en la URL, forzando recarga...");
      window.location.reload();
      return;
    }

    const verifyToken = async () => {
      console.log("🚀 verifyToken() iniciado");

      if (processed) {
        console.log("⏳ Ya procesado, saliendo...");
        return;
      }
      setProcessed(true);
      console.log("✅ processed seteado a true");

      try {
        const token = extractTokenFromUrl();

        console.log("📤 Token extraído:", token ? token.substring(0, 30) + "..." : "null");

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

        const isLocal =
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1" ||
          window.location.port === "5175";

        console.log("🔧 Modo:", isLocal ? "LOCAL" : "PRODUCCIÓN");

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
          console.log("📤 Enviando token:", token.substring(0, 30) + "...");

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
                }
              );
              break;
            } catch (err) {
              retryCount++;
              console.log(`⚠️ Intento ${retryCount} falló:`, err);
              if (retryCount <= maxRetries) {
                await new Promise((resolve) =>
                  setTimeout(resolve, 1000 * retryCount)
                );
              } else {
                throw err;
              }
            }
          }

          const responseText = await response.text();
          console.log("📨 Respuesta raw:", responseText.substring(0, 200) + "...");

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
              JSON.stringify(data.session)
            );
            console.log("✅ Sesión guardada en localStorage");

            const { data: sessionData } = await supabase.auth.getSession();

            if (sessionData?.session) {
              console.log(
                "✅ Sesión activa en Supabase:",
                sessionData.session.user.email
              );
            } else {
              console.log(
                "⏳ La sesión se activará automáticamente con el evento SIGNED_IN"
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