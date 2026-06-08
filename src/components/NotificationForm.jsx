// src/components/NotificationForm.jsx
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

function NotificationForm({ task, onClose }) {
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [sendType, setSendType] = useState("now"); // "now" o "later"
  const [userEmail, setUserEmail] = useState(""); // Estado para el email del usuario

  // 🔧 Función para obtener la fecha actual en hora Argentina (UTC-3)
  const getArgentinaDate = () => {
    const now = new Date();
    const argentinaOffset = -3;
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + argentinaOffset * 3600000);
  };

  // 🔧 Función para formatear fecha a YYYY-MM-DD para el input date
  const getArgentinaDateString = () => {
    const argentinaDate = getArgentinaDate();
    const year = argentinaDate.getFullYear();
    const month = String(argentinaDate.getMonth() + 1).padStart(2, "0");
    const day = String(argentinaDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Obtener el email del usuario al cargar el componente
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
    setMessage({ text: "", type: "" });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !user.email) {
        throw new Error("No se encontró el email del usuario");
      }

      // Fecha y hora actual
      const now = new Date();
      const currentDate = now.toISOString().split("T")[0];
      const currentTime = now.toTimeString().slice(0, 5);

      // Invocar la Edge Function
      const { data, error } = await supabase.functions.invoke(
        "send-email-gmail",
        {
          body: {
            taskName: task.name,
            taskId: task.id,
            scheduledDate: currentDate,
            scheduledTime: currentTime,
            userEmail: user.email,
            toEmail: user.email, // Siempre al email registrado
          },
        },
      );

      if (error) throw error;

      setMessage({
        text: `✅ ¡Notificación enviada exitosamente a ${user.email}!`,
        type: "success",
      });

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

      // Crear fecha en formato local
      const dateTimeString = `${scheduledDate}T${scheduledTime}:00`;
      const selectedDate = new Date(dateTimeString);

      // Obtener fecha actual en Argentina para validación
      const todayArgentina = getArgentinaDate();

      // Validar que la fecha no sea en el pasado
      if (selectedDate < todayArgentina) {
        throw new Error("No puedes programar una notificación en el pasado");
      }

      // 🔧 Guardar en formato local consistente (YYYY-MM-DD HH:MM:SS)
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const hours = String(selectedDate.getHours()).padStart(2, "0");
      const minutes = String(selectedDate.getMinutes()).padStart(2, "0");
      const seconds = String(selectedDate.getSeconds()).padStart(2, "0");
      const localDateString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

      console.log("📅 Fecha seleccionada:", selectedDate.toString());
      console.log("📅 Fecha Argentina actual:", todayArgentina.toString());
      console.log("📅 Fecha a guardar (local):", localDateString);

      // Guardar en la base de datos con formato local consistente
      const { data, error } = await supabase
        .from("scheduled_notifications")
        .insert({
          task_id: task.id,
          task_name: task.name,
          user_email: user.email,
          scheduled_for: localDateString,
          status: "pending",
        })
        .select();

      if (error) throw error;

      setMessage({
        text: `✅ ¡Recordatorio programado para ${scheduledDate} a las ${scheduledTime}!`,
        type: "success",
      });

      setScheduledDate("");
      setScheduledTime("");

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error al programar:", error);
      setMessage({
        text: `❌ Error: ${error.message}`,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };
  // Resetear formulario cuando se cambia el tipo de envío
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

        {/* Selector de tipo de envío */}
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

        {/* Formulario para envío programado */}
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
              <small
                style={{
                  color: "var(--text)",
                  fontSize: "12px",
                  display: "block",
                  marginTop: "5px",
                }}
              >
                🇦🇷 Zona horaria: Argentina (UTC-3)
              </small>
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
              <small
                style={{
                  color: "var(--text)",
                  fontSize: "12px",
                  display: "block",
                  marginTop: "5px",
                }}
              >
                ⏰ Hora de Argentina (UTC-3)
              </small>
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

        {/* Botón para envío inmediato */}
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
