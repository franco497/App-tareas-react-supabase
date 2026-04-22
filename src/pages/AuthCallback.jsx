// src/pages/AuthCallback.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function AuthCallback() {
  const [status, setStatus] = useState("Verificando tu login...");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session) {
          setStatus("✅ Login exitoso! Redirigiendo...");
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 1500);
        } else if (error) {
          throw error;
        } else {
          setStatus("❌ No se pudo autenticar. Redirigiendo...");
          setTimeout(() => {
            window.location.href = "/";
          }, 2000);
        }
      } catch (error) {
        console.error("Error:", error);
        setStatus("❌ Error de autenticación. Redirigiendo...");
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      }
    };

    handleAuthCallback();
  }, []);

  return (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      height: "100vh" 
    }}>
      <div style={{ textAlign: "center" }}>
        <h2>{status}</h2>
      </div>
    </div>
  );
}

export default AuthCallback;