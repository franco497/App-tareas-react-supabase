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
        const params = new URLSearchParams(window.location.search);
        let token = params.get("token");

        if (!token && window.location.hash) {
          const hashParams = new URLSearchParams(
            window.location.hash.split("?")[1],
          );
          token = hashParams.get("token");
        }

        // ✅ DETECTAR SI ESTÁ EN LOCAL
        const isLocal =
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1" ||
          window.location.hostname === "5173";

        let data;
        let responseOk;

        if (isLocal) {
          // ✅ EN LOCAL: Usar sesión de Supabase directamente
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

          // ✅ RESTAURAR SESIÓN EN SUPABASE
          await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });
        } else {
          // ✅ EN PRODUCCIÓN: Usar Netlify Function
          if (!token) {
            setStatus("❌ Token no encontrado");
            setTimeout(() => {
              window.location.replace("/");
            }, 2000);
            return;
          }

          console.log("🚀 Modo producción: verificando con Netlify Function");
          console.log("🔍 Token recibido:", token);

          const response = await fetch(
            "https://sistema-tareas-recordatorios.netlify.app/.netlify/functions/verify-magic-link",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
            },
          );

          data = await response.json();
          responseOk = response.ok;

          console.log("📨 Respuesta de verify-magic-link:", {
            status: response.status,
            ok: responseOk,
            success: data.success,
            hasSession: !!data.session,
          });

          if (responseOk && data.session) {
            // ✅ Guardar sesión en localStorage
            localStorage.setItem(
              "supabaseSession",
              JSON.stringify(data.session),
            );
            console.log("✅ Sesión guardada en localStorage (producción)");
            console.log("👤 Usuario:", data.session.user.email);

            // ✅ RESTAURAR SESIÓN EN SUPABASE
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

            // ✅ Esperar un momento para que la sesión se propague
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        if (!responseOk || !data.success) {
          throw new Error(data.error || "Token inválido o expirado");
        }

        if (data.session) {
          console.log("🚀 Redirigiendo a dashboard...");
          // ✅ Usar window.location.href en lugar de replace para mejor compatibilidad
          window.location.href = "/dashboard";
        } else {
          throw new Error("No se recibió sesión del servidor");
        }
      } catch (error) {
        console.error("❌ Error en AuthCallback:", error);
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