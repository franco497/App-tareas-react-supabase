// src/pages/AuthCallback.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function AuthCallback() {
  const [status, setStatus] = useState("Verificando tu enlace...");
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      // ✅ Evitar procesamiento múltiple
      if (processed) return;
      setProcessed(true);

      try {
        // ============================================
        // 🔍 LOG 1: URL COMPLETA
        // ============================================
        console.log("🔍 ===== AUTH CALLBACK INICIADO =====");
        console.log("📍 URL completa:", window.location.href);
        console.log("📍 Pathname:", window.location.pathname);
        console.log("📍 Search:", window.location.search);
        console.log("📍 Hash:", window.location.hash);
        console.log("📍 Hostname:", window.location.hostname);
        console.log("📍 Port:", window.location.port);

        // ============================================
        // 🔍 LOG 2: EXTRACCIÓN DEL TOKEN
        // ============================================
        const params = new URLSearchParams(window.location.search);
        let token = params.get("token");

        console.log("🔍 Token desde search params:", token);

        // ✅ Si no está en search, buscar en hash
        if (!token && window.location.hash) {
          console.log("🔍 Buscando token en hash...");
          console.log("🔍 Hash completo:", window.location.hash);
          
          // Intentar diferentes formas de extraer del hash
          let hashToken = null;
          
          // Forma 1: Hash con ?token=XXX
          const hashParams = new URLSearchParams(
            window.location.hash.split("?")[1]
          );
          hashToken = hashParams.get("token");
          console.log("🔍 Token desde hash (forma 1):", hashToken);
          
          // Forma 2: Hash con #/auth/callback?token=XXX
          if (!hashToken && window.location.hash.includes("?")) {
            const hashParts = window.location.hash.split("?");
            if (hashParts.length > 1) {
              const hashSearch = new URLSearchParams(hashParts[1]);
              hashToken = hashSearch.get("token");
              console.log("🔍 Token desde hash (forma 2):", hashToken);
            }
          }
          
          // Forma 3: Buscar token con regex en el hash completo
          if (!hashToken) {
            const match = window.location.hash.match(/[?&]token=([^&]+)/);
            if (match) {
              hashToken = match[1];
              console.log("🔍 Token desde hash (regex):", hashToken);
            }
          }
          
          token = hashToken || token;
        }

        console.log("🔍 TOKEN FINAL:", token);
        console.log("🔍 Longitud del token:", token?.length || 0);

        // ============================================
        // 🔍 LOG 3: VERIFICACIÓN DEL TOKEN
        // ============================================
        if (!token) {
          console.error("❌ TOKEN NO ENCONTRADO en la URL");
          console.log("📝 URL completa:", window.location.href);
          console.log("📝 Search:", window.location.search);
          console.log("📝 Hash:", window.location.hash);
          
          setStatus("❌ Token no encontrado");
          setTimeout(() => {
            window.location.replace("/");
          }, 2000);
          return;
        }

        // ✅ DETECTAR SI ESTÁ EN LOCAL
        const isLocal =
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1" ||
          window.location.hostname === "5173";

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
          console.log("📤 Enviando token a verify-magic-link:", token);

          // ============================================
          // 🔍 LOG 4: PETICIÓN A verify-magic-link
          // ============================================
          const startTime = Date.now();
          
          const response = await fetch(
            "https://sistema-tareas-recordatorios.netlify.app/.netlify/functions/verify-magic-link",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
            },
          );

          const elapsedTime = Date.now() - startTime;
          console.log(`⏱️ Tiempo de respuesta: ${elapsedTime}ms`);

          data = await response.json();
          responseOk = response.ok;

          console.log("📨 Respuesta de verify-magic-link:", {
            status: response.status,
            statusText: response.statusText,
            ok: responseOk,
            success: data.success,
            hasSession: !!data.session,
            error: data.error,
            data: data,
          });

          if (responseOk && data.session) {
            console.log("✅ Sesión recibida correctamente");
            console.log("👤 Usuario:", data.session.user.email);
            console.log("🆔 User ID:", data.session.user.id);
            
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
          } else {
            console.error("❌ Respuesta fallida:", data);
          }
        }

        if (!responseOk || !data.success) {
          console.error("❌ Error en la verificación:", data.error);
          throw new Error(data.error || "Token inválido o expirado");
        }

        if (data.session) {
          console.log("🚀 Redirigiendo a dashboard...");
          console.log("📍 URL de destino: /dashboard");
          window.location.href = "/dashboard";
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

    verifyToken();
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