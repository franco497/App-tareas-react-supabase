// src/components/Login.jsx
import { useState } from "react";
import { supabase } from "../lib/supabase";

function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      // Obtén la URL actual para el redirect
      const currentUrl = window.location.origin;
      
      const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: `${currentUrl}/auth/callback`,
        },
      });

      if (error) throw error;

      setMessage(`✨ ¡Magic link enviado a ${email}! Revisa tu correo.`);
      setEmail("");
    } catch (err) {
      console.error("Error:", err);
      setError(err.message || "Error al enviar el magic link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "400px", margin: "0 auto" }}>
      <h2>Login con Magic Link</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "10px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "16px"
            }}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "16px"
          }}
        >
          {loading ? "Enviando..." : "Enviar Magic Link"}
        </button>

        {message && (
          <div style={{ 
            marginTop: "15px", 
            padding: "10px", 
            backgroundColor: "#d4edda", 
            color: "#155724", 
            borderRadius: "4px" 
          }}>
            {message}
          </div>
        )}
        
        {error && (
          <div style={{ 
            marginTop: "15px", 
            padding: "10px", 
            backgroundColor: "#f8d7da", 
            color: "#721c24", 
            borderRadius: "4px" 
          }}>
            ❌ {error}
          </div>
        )}
      </form>
    </div>
  );
}

export default Login;