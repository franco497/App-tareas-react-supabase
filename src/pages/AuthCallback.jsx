// src/pages/AuthCallback.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function AuthCallback() {
  const [status, setStatus] = useState("Verificando tu enlace...");

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        let token = params.get("token");

        if (!token && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
          token = hashParams.get("token");
        }

        // ✅ DETECTAR SI ESTÁ EN LOCAL
        const isLocal = window.location.hostname === "localhost" || 
                        window.location.hostname === "127.0.0.1" ||
                        window.location.hostname === "5173";

        let data;
        let responseOk;

        if (isLocal) {
          // ✅ EN LOCAL: Usar sesión de Supabase directamente
          console.log("🔧 Modo local: verificando sesión de Supabase");
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) throw error;
          if (!session) throw new Error("No hay sesión");
          
          data = { success: true, session };
          responseOk = true;
          localStorage.setItem("supabaseSession", JSON.stringify(session));
          console.log("✅ Sesión guardada en localStorage (local)");
        } else {
          // ✅ EN PRODUCCIÓN: Usar Netlify Function
          console.log("🚀 Modo producción: verificando con Netlify Function");
          
          if (!token) {
            setStatus("❌ Token no encontrado");
            setTimeout(() => {
              window.location.replace("/");
            }, 2000);
            return;
          }

          const response = await fetch(
            "https://sistema-tareas-recordatorios.netlify.app/.netlify/functions/verify-magic-link",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
            }
          );

          data = await response.json();
          responseOk = response.ok;

          if (responseOk && data.session) {
            localStorage.setItem("supabaseSession", JSON.stringify(data.session));
            console.log("✅ Sesión guardada en localStorage (producción)");
          }
        }

        if (!responseOk || !data.success) {
          throw new Error(data.error || "Token inválido o expirado");
        }

        if (data.session) {
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