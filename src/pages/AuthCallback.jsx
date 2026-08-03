// src/pages/AuthCallback.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function AuthCallback() {
  const [status, setStatus] = useState("Verificando tu enlace...");
  const [countdown, setCountdown] = useState(3);
  const navigate = useNavigate();

  useEffect(() => {
    const verifyToken = async () => {
      try {
        // ✅ Obtener token de la URL (sin el hash)
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");

        if (!token) {
          setStatus("❌ Token no encontrado");
          setTimeout(() => navigate("/"), 2000);
          return;
        }

        // ✅ LLAMAR A NETLIFY FUNCTION
        const response = await fetch("/.netlify/functions/verify-magic-link", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Token inválido o expirado");
        }

        setStatus("✅ ¡Acceso concedido! Redirigiendo...");

        let counter = 3;
        setCountdown(counter);
        const interval = setInterval(() => {
          counter -= 1;
          setCountdown(counter);
          if (counter <= 0) {
            clearInterval(interval);
            // ✅ Redirigir al dashboard con hash
            navigate("/dashboard");
          }
        }, 1000);
      } catch (error) {
        console.error("❌ Error:", error);
        setStatus(`❌ ${error.message || "Error de autenticación"}`);
        setTimeout(() => navigate("/"), 3000);
      }
    };

    verifyToken();
  }, [navigate]);

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
        {status.includes("Redirigiendo") && countdown > 0 && (
          <p style={{ marginTop: "10px", color: "#666" }}>
            Redirigiendo en {countdown} segundos...
          </p>
        )}
      </div>
    </div>
  );
}

export default AuthCallback;
