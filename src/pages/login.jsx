// src/pages/Login.jsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { supabase, getRedirectUrl } from "../lib/supabase";

function Login() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid, isSubmitting },
  } = useForm({
    defaultValues: {
      email: "",
    },
    mode: "onChange",
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      console.log("📤 Enviando solicitud a Netlify Function...");
      console.log("📧 Email:", data.email);

      const response = await fetch("/.netlify/functions/send-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      console.log("📨 Respuesta status:", response.status);
      console.log("📨 Respuesta ok:", response.ok);

      const result = await response.json();
      console.log("📨 Datos de respuesta:", result);

      if (!response.ok) {
        throw new Error(result.error || "Error al enviar el magic link");
      }

      setMessage(`✨ ¡Magic link enviado a ${data.email}! Revisa tu correo.`);
      reset();
    } catch (err) {
      console.error("❌ Error:", err);
      setError(err.message || "Error al enviar el magic link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2 className="login-title">
        App Tareas - Sistema de Gestión y Recordatorios - Inicia Sesión con tu
        email
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} className="login-form">
        <div className="login-form-group">
          <input
            type="email"
            placeholder="tu@email.com"
            disabled={loading || isSubmitting}
            className={`login-input ${errors.email ? "error" : ""}`}
            {...register("email", {
              required: "El email es obligatorio",
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Email inválido",
              },
            })}
          />

          {errors.email && (
            <span className="error-message login-error">
              {errors.email.message}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !isValid || isSubmitting}
          className="login-button"
        >
          {loading ? "Enviando..." : "Enviar Magic Link"}
        </button>

        {message && <div className="login-message success">{message}</div>}
        {error && <div className="login-message error">❌ {error}</div>}
      </form>
    </div>
  );
}

export default Login;
