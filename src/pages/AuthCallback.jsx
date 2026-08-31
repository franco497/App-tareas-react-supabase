// src/pages/AuthCallback.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function AuthCallback() {
  const [status, setStatus] = useState("Verificando tu enlace...");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        let token = params.get("token");

        if (!token && window.location.hash) {
          const hashParams = new URLSearchParams(
            window.location.hash.split("?")[1],
          );
          token = hashParams.get("token");
        }

        if (!token) {
          setStatus("❌ Token no encontrado");
          setTimeout(() => {
            window.location.replace("/");
          }, 2000);
          return;
        }

        console.log("🔍 Token recibido:", token);

        // ✅ Si ya hubo un reintento, esperar 1 segundo antes de intentar de nuevo
        if (retryCount > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        const response = await fetch(
          "https://sistema-tareas-recordatorios.netlify.app/.netlify/functions/verify-magic-link",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          },
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          // ✅ Mensajes más específicos
          if (
            data.error ===
            "Este enlace ya fue utilizado o ha sido reemplazado por uno nuevo. Solicita un nuevo enlace."
          ) {
            setStatus("⚠️ Este enlace ya fue reemplazado por uno nuevo");
            // No reintentar, redirigir directamente a login
            setTimeout(() => {
              window.location.replace("/");
            }, 2000);
            return;
          }

          // ✅ Si el error es "Token inválido o expirado" y es el primer intento, reintentar
          if (data.error === "Token inválido o expirado" && retryCount === 0) {
            console.log("🔄 Reintentando verificación del token...");
            setRetryCount(1);
            await verifyToken();
            return;
          }
          throw new Error(data.error || "Token inválido o expirado");
        }

        if (data.session) {
          // ✅ Guardar sesión en localStorage
          localStorage.setItem("supabaseSession", JSON.stringify(data.session));
          console.log("✅ Sesión guardada en localStorage");

          // ✅ Esperar un momento para que la sesión se propague
          await new Promise((resolve) => setTimeout(resolve, 500));

          window.location.replace("/dashboard");
        } else {
          throw new Error("No se recibió sesión del servidor");
        }
      } catch (error) {
        console.error("❌ Error:", error);
        setStatus(`❌ ${error.message || "Error de autenticación"}`);
        setTimeout(() => {
          window.location.replace("/");
        }, 3000);
      }
    };

    verifyToken();
  }, [retryCount]);

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
        {retryCount > 0 && (
          <p style={{ marginTop: "10px", color: "#ffc107" }}>
            Reintentando verificación...
          </p>
        )}
      </div>
    </div>
  );
}

export default AuthCallback;
