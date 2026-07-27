// src/components/RescheduleModal.jsx
import { useState } from "react";
import { useTasks } from "../context";
import Swal from "sweetalert2";

function RescheduleModal({ task, onClose }) {
  // ✅ USAR EL CONTEXTO (igual que NotificationForm)
  const { rescheduleScheduledTask } = useTasks();

  // ✅ ESTADOS IGUALES QUE NotificationForm
  const [scheduledDate, setScheduledDate] = useState(
    task.scheduled_for ? task.scheduled_for.split(" ")[0] : ""
  );
  const [scheduledTime, setScheduledTime] = useState(
    task.scheduled_for ? task.scheduled_for.split(" ")[1]?.slice(0, 5) : ""
  );
  const [loading, setLoading] = useState(false);

  // ✅ FUNCIÓN PARA FECHA ACTUAL (igual que NotificationForm)
  const getArgentinaDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // ✅ handleSubmit (igual que NotificationForm)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ LLAMAR AL CONTEXTO (igual que NotificationForm)
      await rescheduleScheduledTask(task.id, scheduledDate, scheduledTime);

      setScheduledDate("");
      setScheduledTime("");

      onClose();
      await new Promise((resolve) => setTimeout(resolve, 300));

      await Swal.fire({
        title: "✅ ¡Tarea reprogramada!",
        text: `La tarea "${task.task_name}" ha sido reprogramada para el ${scheduledDate} a las ${scheduledTime}.`,
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
      console.error("❌ Error al reprogramar:", error);

      onClose();
      await new Promise((resolve) => setTimeout(resolve, 300));

      await Swal.fire({
        title: "❌ Error al reprogramar",
        text: error.message || "No se pudo reprogramar la tarea.",
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🔄 Reprogramar: "{task.task_name}"</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="date">📅 Nueva fecha (Argentina UTC-3):</label>
            <input
              type="date"
              id="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              required
              min={getArgentinaDateString()}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="time">⏰ Nueva hora (UTC-3):</label>
            <input
              type="time"
              id="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              required
              className="form-input"
            />
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={loading}
            style={{ marginTop: "1rem" }}
          >
            {loading ? "⏳ Reprogramando..." : "🔄 Reprogramar"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default RescheduleModal;