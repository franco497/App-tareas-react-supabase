// src/pages/AuthCallback.jsx
import { useEffect, useState } from "react";

function AuthCallback() {
  const [status, setStatus] = useState("Verificando tu enlace...");
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        // Obtener token de la URL
        const params = new URLSearchParams(window.location.search);
        let token = params.get("token");

        if (!token && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
          token = hashParams.get("token");
        }

        if (!token) {
          setError("Token no encontrado");
          setTimeout(() => {
            window.location.replace("/");
          }, 2000);
          return;
        }

        console.log("🔍 Token recibido:", token);

        // Verificar token con Netlify Function
        const response = await fetch(
          "https://sistema-tareas-recordatorios.netlify.app/.netlify/functions/verify-magic-link",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Token inválido o expirado");
        }

        // ✅ Guardar sesión en localStorage
        if (data.session) {
          localStorage.setItem("supabaseSession", JSON.stringify(data.session));
          console.log("✅ Sesión guardada en localStorage");
          console.log("👤 Usuario:", data.session.user.email);
          
          // ✅ FORZAR RECARGA COMPLETA
          window.location.replace("/#/dashboard");
        } else {
          throw new Error("No se recibió sesión");
        }

      } catch (error) {
        console.error("❌ Error:", error);
        setError(error.message);
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

        <h2 className="auth-callback-status">
          {error ? `❌ ${error}` : status}
        </h2>
      </div>
    </div>
  );
}

export default AuthCallback;