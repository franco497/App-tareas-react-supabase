// src/components/NotificationForm.jsx
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useTasks } from "../context"; // ← IMPORTAR EL CONTEXTO
import Swal from "sweetalert2";

function NotificationForm({ task, onClose }) {
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [sendType, setSendType] = useState("now");
  const [userEmail, setUserEmail] = useState("");

  //  USAR EL CONTEXTO
  const { scheduleTaskLater } = useTasks();

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

  // Enviar ahora - VERSIÓN CON FETCH DIRECTO
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

      //  USAR FETCH DIRECTO (como probaste en PowerShell)
      const response = await fetch(
        "https://vjywpkrncmsijpggdfwf.supabase.co/functions/v1/send-email-gmail",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            taskName: task.name,
            taskId: task.id,
            scheduledDate: currentDate,
            scheduledTime: currentTime,
            userEmail: user.email,
            toEmail: user.email,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("❌ Error de respuesta:", data);
        throw new Error(data.error || "Error al enviar el correo");
      }

      //  CERRAR MODAL Y MOSTRAR SWEETALERT
      onClose();
      await new Promise((resolve) => setTimeout(resolve, 300));

      await Swal.fire({
        title: "✅ ¡Correo enviado!",
        text: `El recordatorio para "${task.name}" ha sido enviado exitosamente a ${user.email}.`,
        icon: "success",
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        background: "#ffffff",
        color: "#1a1a2e",
        iconColor: "#2d6a4f",
        allowOutsideClick: false,
        allowEscapeKey: false,
      });
    } catch (error) {
      console.error("❌ Error al enviar:", error);

      onClose();
      await new Promise((resolve) => setTimeout(resolve, 300));

      await Swal.fire({
        title: "❌ Error al enviar",
        text: error.message || "No se pudo enviar la notificación.",
        icon: "error",
        confirmButtonColor: "#e76f51",
        confirmButtonText: "Intentar de nuevo",
        background: "#ffffff",
        color: "#1a1a2e",
        allowOutsideClick: false,
        allowEscapeKey: false,
      });
    } finally {
      setLoading(false);
    }
  };

  //  Programar para más tarde - AHORA USA EL CONTEXTO
  const handleScheduleLater = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "" });

    try {
      // ✅ LLAMAR A LA FUNCIÓN DEL CONTEXTO
      await scheduleTaskLater(task, scheduledDate, scheduledTime);

      setScheduledDate("");
      setScheduledTime("");

      onClose();
      await new Promise((resolve) => setTimeout(resolve, 300));

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
        background: "#ffffff",
        color: "#1a1a2e",
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
        background: "#ffffff",
        color: "#1a1a2e",
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
