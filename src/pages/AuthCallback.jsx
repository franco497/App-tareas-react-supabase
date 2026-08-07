
// src/pages/AuthCallback.jsx
import { useEffect, useState } from "react";

function AuthCallback() {
  const [status, setStatus] = useState("Verificando tu enlace...");
  const [countdown, setCountdown] = useState(3);

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
          const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
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
          }
        );

        const data = await response.json();
        log(`📨 Respuesta: ${JSON.stringify(data)}`);

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Token inválido o expirado");
        }

        // ✅ GUARDAR SESIÓN EN SESSIONSTORAGE (FORZADO)
        if (data.session) {
          sessionStorage.setItem("supabaseSession", JSON.stringify(data.session));
          log("✅ Sesión guardada en sessionStorage");
          log(`👤 Usuario: ${data.session.user.email}`);
          
          // ✅ VERIFICAR QUE SE GUARDÓ CORRECTAMENTE
          const verifyStored = sessionStorage.getItem("supabaseSession");
          if (verifyStored) {
            log("✅ Verificación: sesión guardada correctamente");
          } else {
            log("⚠️ ADVERTENCIA: La sesión no se guardó correctamente");
          }
        } else {
          log("⚠️ No se recibió sesión de verify-magic-link");
          throw new Error("No se recibió sesión del servidor");
        }

        log("✅ ¡Acceso concedido!");
        setStatus("✅ ¡Acceso concedido! Redirigiendo...");

        let counter = 3;
        setCountdown(counter);
        const interval = setInterval(() => {
          counter -= 1;
          setCountdown(counter);
          if (counter <= 0) {
            clearInterval(interval);
            // ✅ FORZAR RECARGA COMPLETA
            log("🔄 Redirigiendo a dashboard...");
            window.location.href = "/#/dashboard";
          }
        }, 1000);

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
        {status.includes("Redirigiendo") && countdown > 0 && (
          <p style={{ marginTop: '10px', color: '#666' }}>
            Redirigiendo en {countdown} segundos...
          </p>
        )}
      </div>
    </div>
  );
}

export default AuthCallback;