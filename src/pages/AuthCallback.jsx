import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function AuthCallback() {
  const [status, setStatus] = useState("Verificando tu login...");
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // ✅ Obtener la sesión
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        // ✅ Verificar también el hash de la URL (por si hay token)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        console.log("🔍 Sesión:", session);
        console.log("🔍 Tokens en URL:", { accessToken, refreshToken });

        // ✅ Si hay sesión o tokens, autenticación exitosa
        if (session || accessToken) {
          setStatus("✅ ¡Login exitoso! Redirigiendo...");
          
          // Contador regresivo para mejor UX
          let counter = 3;
          setCountdown(counter);
          
          const interval = setInterval(() => {
            counter -= 1;
            setCountdown(counter);
            if (counter <= 0) {
              clearInterval(interval);
              window.location.href = "/dashboard";
            }
          }, 1000);
          
        } else if (error) {
          throw error;
        } else {
          setStatus("❌ No se pudo autenticar. Redirigiendo...");
          setTimeout(() => {
            window.location.href = "/";
          }, 2000);
        }
      } catch (error) {
        console.error("❌ Error en callback:", error);
        setStatus(`❌ Error: ${error.message || "Error de autenticación"}`);
        setTimeout(() => {
          window.location.href = "/";
        }, 3000);
      }
    };

    handleAuthCallback();
  }, []);

  return (
    <div className="auth-callback-container">
      <div className="auth-callback-content">
        {/* Spinner animado */}
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
        
        {/* Mostrar contador si hay redirección inminente */}
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