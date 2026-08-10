// src/pages/AuthCallback.jsx
import { useEffect, useState } from "react";

function AuthCallback() {
  const [status, setStatus] = useState("Verificando tu enlace...");

  useEffect(() => {
    // ✅ Función para guardar logs en localStorage
    const log = (msg, data = null) => {
      const timestamp = new Date().toISOString();
      const logEntry = { timestamp, msg, data };
      
      // Guardar en localStorage
      const logs = JSON.parse(localStorage.getItem("authLogs") || "[]");
      logs.push(logEntry);
      localStorage.setItem("authLogs", JSON.stringify(logs));
      
      // También mostrar en consola
      console.log(msg, data || "");
    };

    const verifyToken = async () => {
      try {
        log("🔍 1. Iniciando verificación...");
        log("📍 URL actual:", window.location.href);
        
        // Obtener token de la URL
        const params = new URLSearchParams(window.location.search);
        let token = params.get("token");

        log("🔍 2. Token de search:", token);

        if (!token && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
          token = hashParams.get("token");
          log("🔍 3. Token desde hash:", token);
        }

        log("🔍 4. Token final:", token);

        if (!token) {
          log("❌ 5. Token no encontrado");
          setStatus("❌ Token no encontrado");
          setTimeout(() => {
            window.location.replace("/");
          }, 2000);
          return;
        }

        log("📤 6. Verificando token con Netlify Function...");

        const response = await fetch(
          "https://sistema-tareas-recordatorios.netlify.app/.netlify/functions/verify-magic-link",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          }
        );

        log("📨 7. Respuesta status:", response.status);
        
        const data = await response.json();
        log("📨 8. Datos de respuesta (resumido):", {
          success: data.success,
          hasSession: !!data.session,
          email: data.session?.user?.email || "No email"
        });

        if (!response.ok || !data.success) {
          log("❌ 9. Error en respuesta:", data.error);
          throw new Error(data.error || "Token inválido o expirado");
        }

        log("✅ 10. Sesión recibida: SÍ");

        if (data.session) {
          log("👤 11. Usuario:", data.session.user.email);
          
          // ✅ Guardar sesión
          const sessionData = {
            email: data.session.user.email,
            access_token: data.session.session.access_token,
            refresh_token: data.session.session.refresh_token,
            expires_at: data.session.session.expires_at,
          };
          
          log("💾 12. Guardando en localStorage...");
          
          localStorage.setItem("supabaseSession", JSON.stringify(sessionData));
          
          // ✅ Verificar que se guardó
          const stored = localStorage.getItem("supabaseSession");
          log("🔍 13. Verificación localStorage:", stored ? "✅ GUARDADO" : "❌ VACÍO");
          
          if (stored) {
            log("✅ 14. Sesión guardada correctamente");
          } else {
            log("❌ 15. ERROR: No se pudo guardar en localStorage");
          }

          // ✅ Redirigir
          log("🔄 16. Redirigiendo a /dashboard");
          
          // ⚠️ Guardar un flag para saber que la redirección fue exitosa
          localStorage.setItem("redirectAttempted", "true");
          
          window.location.replace("/dashboard");
        } else {
          log("❌ 17. No se recibió sesión");
          throw new Error("No se recibió sesión del servidor");
        }

      } catch (error) {
        log("❌ Error capturado:", error.message);
        setStatus(`❌ ${error.message || "Error de autenticación"}`);
        setTimeout(() => {
          window.location.replace("/");
        }, 3000);
      }
    };

    verifyToken();
  }, []);

  return (
    <div className="auth-callback-container">
      <div className="auth-callback-content">
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }} />
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