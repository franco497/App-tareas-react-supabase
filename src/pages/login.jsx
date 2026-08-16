// src/pages/Login.jsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { supabase, getRedirectUrl } from "../lib/supabase";
import Swal from "sweetalert2"; // ← Importar SweetAlert

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

  // ✅ DETECTAR SI ESTÁ EN LOCAL
  const isLocal = window.location.hostname === "localhost" || 
                  window.location.hostname === "127.0.0.1" ||
                  window.location.port === "5175";

  const onSubmit = async (data) => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (isLocal) {
        // EN LOCAL: Usar Supabase directamente
        const redirectUrl = getRedirectUrl();
        const { error } = await supabase.auth.signInWithOtp({
          email: data.email,
          options: { emailRedirectTo: redirectUrl },
        });
        if (error) throw error;
      } else {
        // EN PRODUCCIÓN: Usar Netlify Function
        const response = await fetch("/.netlify/functions/send-magic-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: data.email }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
      }

      // ✅ MOSTRAR SWEETALERT CON INSTRUCCIONES
      await Swal.fire({
        title: "📧 ¡Correo enviado!",
        html: `
          <p style="font-size: 1rem; margin-bottom: 10px;">
            Hemos enviado un enlace de acceso a <strong>${data.email}</strong>
          </p>
          <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 12px; margin: 10px 0; text-align: left;">
            <p style="margin: 0; font-size: 0.9rem; color: #856404;">
              📬 <strong>Revisa tu bandeja de entrada</strong>
            </p>
            <p style="margin: 5px 0 0; font-size: 0.85rem; color: #856404;">
              📁 Si no lo encuentras, revisa la carpeta de <strong>"Spam"</strong> o <strong>"Correo no deseado"</strong>
            </p>
            <p style="margin: 5px 0 0; font-size: 0.85rem; color: #856404;">
              ⭐ Agrega <strong>devincentisf35@gmail.com</strong> a tus contactos para futuros envíos
            </p>
          </div>
          <p style="font-size: 0.85rem; color: #6c757d; margin-top: 10px;">
            ⏰ El enlace expira en <strong>15 minutos</strong>
          </p>
        `,
        icon: "success",
        confirmButtonColor: "#2d6a4f",
        confirmButtonText: "Entendido",
        background: "#ffffff",
        color: "#1a1a2e",
        width: 500,
        timer: 8000,
        timerProgressBar: true,
      });

      setMessage(`✨ ¡Magic link enviado a ${data.email}!`);
      reset();
    } catch (err) {
      console.error("❌ Error:", err);
      setError(err.message || "Error al enviar el magic link");
      
      await Swal.fire({
        title: "❌ Error",
        text: err.message || "No se pudo enviar el enlace. Intenta nuevamente.",
        icon: "error",
        confirmButtonColor: "#e76f51",
        confirmButtonText: "Intentar de nuevo",
        background: "#ffffff",
        color: "#1a1a2e",
      });
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

      {/* ✅ Mensaje informativo fijo en la pantalla */}
      <div style={{
        marginTop: "20px",
        padding: "12px 20px",
        background: "rgba(255, 255, 255, 0.05)",
        borderRadius: "8px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        maxWidth: "400px",
        width: "100%",
        textAlign: "center",
        color: "rgba(255, 255, 255, 0.7)",
        fontSize: "0.85rem",
      }}>
        <p style={{ margin: "0" }}>
          📬 Si no recibes el correo, revisa tu carpeta de <strong style={{ color: "#fff" }}>"Spam"</strong>
        </p>
      </div>
    </div>
  );
}

export default Login;