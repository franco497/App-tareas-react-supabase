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
      const currentUrl = window.location.origin;

      const { error } = await supabase.auth.signInWithOtp({
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
    <div className="login-container">
      <h2 className="login-title">Login con Magic Link</h2>
      <form onSubmit={handleSubmit} className="login-form">
        <div>
          <input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="login-input"
          />
        </div>

        <button type="submit" disabled={loading} className="login-button">
          {loading ? "Enviando..." : "Enviar Magic Link"}
        </button>

        {message && <div className="login-message success">{message}</div>}

        {error && <div className="login-message error">❌ {error}</div>}
      </form>
    </div>
  );
}

export default Login;
