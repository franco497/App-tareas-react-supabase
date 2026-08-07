// src/pages/AuthCallback.jsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

function AuthCallback() {
  const [status, setStatus] = useState("Verificando tu enlace...");
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    const log = (msg) => {
      console.log(msg);
      const logs = JSON.parse(sessionStorage.getItem("authLogs") || "[]");
      logs.push(msg);
      sessionStorage.setItem("authLogs", JSON.stringify(logs));
    };

    const verifyToken = async () => {
      try {
        log("🔍 Iniciando verificación...");
        log(`📍 URL actual: ${window.location.href}`);

        const params = new URLSearchParams(window.location.search);
        let token = params.get("token");

        if (!token && window.location.hash) {
          const hashParams = new URLSearchParams(
            window.location.hash.split("?")[1],
          );
          token = hashParams.get("token");
          log(`🔍 Token desde hash: ${token}`);
        }

        log(`🔍 Token final: ${token}`);

        if (!token) {
          log("❌ Token no encontrado");
          setStatus("❌ Token no encontrado");
          setTimeout(() => {
            window.location.href = "/";
          }, 2000);
          return;
        }

        log("📤 Verificando token con Netlify Function...");

        const response = await fetch(
          "https://sistema-tareas-recordatorios.netlify.app/.netlify/functions/verify-magic-link",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          },
        );

        const data = await response.json();
        log(`📨 Respuesta: ${JSON.stringify(data)}`);

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Token inválido o expirado");
        }

        // ✅ GUARDAR SESIÓN EN SESSIONSTORAGE
        if (data.session) {
          sessionStorage.setItem(
            "supabaseSession",
            JSON.stringify(data.session),
          );
          log("✅ Sesión guardada en sessionStorage");
          log(`👤 Usuario: ${data.session.user.email}`);
        } else {
          log("⚠️ No se recibió sesión de verify-magic-link");
          throw new Error("No se recibió sesión del servidor");
        }

        log("✅ ¡Acceso concedido!");
        setStatus("✅ ¡Acceso concedido!");

        // ✅ ACTIVAR REDIRECCIÓN CON NAVIGATE
        setShouldRedirect(true);
      } catch (error) {
        console.error("❌ Error:", error);
        log(`❌ Error: ${error.message}`);
        setStatus(`❌ ${error.message || "Error de autenticación"}`);
        setTimeout(() => {
          window.location.href = "/";
        }, 3000);
      }
    };

    verifyToken();
  }, []);

  // ✅ SI DEBE REDIRIGIR, USAR NAVIGATE DE REACT ROUTER
  if (shouldRedirect) {
    return <Navigate to="/dashboard" replace />;
  }

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
