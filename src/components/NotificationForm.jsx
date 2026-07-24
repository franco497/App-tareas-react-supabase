// src/components/NotificationForm.jsx
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import Swal from "sweetalert2";

function NotificationForm({ task, onClose }) {
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [sendType, setSendType] = useState("now");
  const [userEmail, setUserEmail] = useState("");

  const getArgentinaDate = () => {
    const now = new Date();
    return now;
  };

  const getArgentinaDateString = () => {
    const argentinaDate = getArgentinaDate();
    const year = argentinaDate.getFullYear();
    const month = String(argentinaDate.getMonth() + 1).padStart(2, "0");
    const day = String(argentinaDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const getUserEmail = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    getUserEmail();
  }, []);

  // Enviar ahora
  const handleSendNow = async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !user.email) {
        throw new Error("No se encontró el email del usuario");
      }

      const now = new Date();
      const currentDate = now.toISOString().split("T")[0];
      const currentTime = now.toTimeString().slice(0, 5);

      const { data, error } = await supabase.functions.invoke(
        "send-email-gmail",
        {
          body: {
            taskName: task.name,
            taskId: task.id,
            scheduledDate: currentDate,
            scheduledTime: currentTime,
            userEmail: user.email,
            toEmail: user.email,
          },
        },
      );

      if (error) throw error;

      // ✅ CERRAR MODAL PRIMERO
      onClose();
      await new Promise((resolve) => setTimeout(resolve, 300));

      // ✅ SWEETALERT CON FONDO BLANCO
      await Swal.fire({
        title: "✅ ¡Correo enviado!",
        text: `El recordatorio para "${task.name}" ha sido enviado exitosamente a ${user.email}.`,
        icon: "success",
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        background: "#ffffff", // ✅ FONDO BLANCO
        color: "#1a1a2e", // ✅ TEXTO OSCURO
        iconColor: "#2d6a4f",
        allowOutsideClick: false,
        allowEscapeKey: false,
      });
    } catch (error) {
      console.error("❌ Error al enviar:", error);

      onClose();
      await new Promise((resolve) => setTimeout(resolve, 300));

      // ❌ SWEETALERT DE ERROR CON FONDO BLANCO
      await Swal.fire({
        title: "❌ Error al enviar",
        text: error.message || "No se pudo enviar la notificación.",
        icon: "error",
        confirmButtonColor: "#e76f51",
        confirmButtonText: "Intentar de nuevo",
        background: "#ffffff", // ✅ FONDO BLANCO
        color: "#1a1a2e", // ✅ TEXTO OSCURO
        allowOutsideClick: false,
        allowEscapeKey: false,
      });
    } finally {
      setLoading(false);
    }
  };

  // Programar para más tarde
  const handleScheduleLater = async (e) => {
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

      if (!scheduledDate || !scheduledTime) {
        throw new Error("Debes seleccionar fecha y hora");
      }

      const [year, month, day] = scheduledDate.split("-");
      const [hour, minute] = scheduledTime.split(":");

      const localDateString = `${year}-${month}-${day} ${hour}:${minute}:00`;

      const selectedDate = new Date(year, month - 1, day, hour, minute, 0);
      const now = new Date();

      if (selectedDate < now) {
        throw new Error("No puedes programar una notificación en el pasado");
      }

      const { error } = await supabase.from("scheduled_notifications").insert({
        task_id: task.id,
        task_name: task.name,
        user_email: user.email,
        scheduled_for: localDateString,
        status: "pending",
      });

      if (error) throw error;

      setScheduledDate("");
      setScheduledTime("");

      // ✅ CERRAR MODAL PRIMERO
      onClose();
      await new Promise((resolve) => setTimeout(resolve, 300));

      // ✅ SWEETALERT PROGRAMADO CON FONDO BLANCO
      await Swal.fire({
        title: "📅 ¡Recordatorio programado!",
        html: `
          <p>El recordatorio para <strong>"${task.name}"</strong> ha sido programado para:</p>
          <p style="font-size: 1.2rem; color: #2d6a4f; margin: 10px 0;">
            📆 ${scheduledDate} <br>
            ⏰ ${scheduledTime}
          </p>
          <p style="font-size: 0.9rem; opacity: 0.8;">Recibirás el correo en la fecha y hora programada.</p>
        `,
        icon: "success",
        timer: 4000,
        timerProgressBar: true,
        showConfirmButton: false,
        background: "#ffffff", // ✅ FONDO BLANCO
        color: "#1a1a2e", // ✅ TEXTO OSCURO
        iconColor: "#2d6a4f",
        allowOutsideClick: false,
        allowEscapeKey: false,
      });
    } catch (error) {
      console.error("Error al programar:", error);

      onClose();
      await new Promise((resolve) => setTimeout(resolve, 300));

      await Swal.fire({
        title: "❌ Error al programar",
        text: error.message || "No se pudo programar el recordatorio.",
        icon: "error",
        confirmButtonColor: "#e76f51",
        confirmButtonText: "Intentar de nuevo",
        background: "#ffffff", // ✅ FONDO BLANCO
        color: "#1a1a2e", // ✅ TEXTO OSCURO
        allowOutsideClick: false,
        allowEscapeKey: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type) => {
    setSendType(type);
    setMessage({ text: "", type: "" });
    setScheduledDate("");
    setScheduledTime("");
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

        <div className="send-type-selector">
          <button
            type="button"
            className={`send-type-btn ${sendType === "now" ? "active" : ""}`}
            onClick={() => handleTypeChange("now")}
          >
            🚀 Enviar ahora
          </button>
          <button
            type="button"
            className={`send-type-btn ${sendType === "later" ? "active" : ""}`}
            onClick={() => handleTypeChange("later")}
          >
            📅 Programar para más tarde
          </button>
        </div>

        {sendType === "later" && (
          <form onSubmit={handleScheduleLater}>
            <div className="form-group">
              <label htmlFor="date">📅 Fecha (hora Argentina UTC-3):</label>
              <input
                type="date"
                id="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
                min={getArgentinaDateString()}
                className="form-input"
              />
              <br />
            </div>

            <div className="form-group">
              <label htmlFor="time">⏰ Hora (UTC-3):</label>
              <input
                type="time"
                id="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                required
                className="form-input"
              />
              <br />
            </div>

            {message.text && (
              <div className={`notification-message ${message.type}`}>
                {message.text}
              </div>
            )}

            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? "⏳ Programando..." : "📅 Programar recordatorio"}
            </button>
          </form>
        )}

        {sendType === "now" && (
          <div className="send-now-container">
            <p className="send-now-info">
              📧 El recordatorio se enviará a tu email:{" "}
              <strong>{userEmail || "Cargando..."}</strong>
            </p>
            {message.text && (
              <div className={`notification-message ${message.type}`}>
                {message.text}
              </div>
            )}
            <button
              type="button"
              className="send-now-button"
              onClick={handleSendNow}
              disabled={loading}
            >
              {loading ? "⏳ Enviando..." : "🚀 Enviar ahora"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationForm;
