// src/components/NotificationForm.jsx
import { useState } from "react";
import { supabase } from "../lib/supabase";

function NotificationForm({ task, onClose }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !user.email) {
        throw new Error("No se encontró el email del usuario");
      }

      // Invocar la Edge Function
      const { data, error } = await supabase.functions.invoke(
        "send-email-gmail",
        {
          body: {
            taskName: task.name,
            taskId: task.id,
            scheduledDate: date,
            scheduledTime: time,
            userEmail: user.email,
            toEmail: toEmail || user.email,
          },
        },
      );

      if (error) throw error;

      setMessage({
        text: `✅ ¡Notificación enviada exitosamente a ${toEmail || user.email}!`,
        type: "success",
      });

      setDate("");
      setTime("");
      setToEmail("");

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error al enviar:", error);
      setMessage({
        text: `❌ Error: ${error.message || "No se pudo enviar la notificación"}`,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📧 Enviar recordatorio: "{task.name}"</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="toEmail">📧 Enviar a (email):</label>
            <input
              type="email"
              id="toEmail"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="ejemplo@correo.com (opcional)"
              className="form-input"
            />
            <small style={{ color: "var(--text)", fontSize: "12px" }}>
              Si lo dejas vacío, se enviará a tu email registrado
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="date">📅 Fecha:</label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              min={new Date().toISOString().split("T")[0]}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="time">⏰ Hora:</label>
            <input
              type="time"
              id="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="form-input"
            />
          </div>

          {message.text && (
            <div className={`notification-message ${message.type}`}>
              {message.text}
            </div>
          )}

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? "⏳ Enviando..." : "📧 Enviar recordatorio"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default NotificationForm;
