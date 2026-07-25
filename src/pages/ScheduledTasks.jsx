// src/pages/ScheduledTasks.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTasks } from "../context";

function ScheduledTasks() {
  const navigate = useNavigate();
  const {
    scheduledTasks,
    scheduledLoading,
    getScheduledTasks,
    cancelScheduledTask,
  } = useTasks();

  useEffect(() => {
    getScheduledTasks();
  }, [getScheduledTasks]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return <span className="status-badge pending">⏳ Pendiente</span>;
      case "sent":
        return <span className="status-badge sent">✅ Enviado</span>;
      case "failed":
        return <span className="status-badge failed">❌ Fallido</span>;
      case "cancelled":
        return <span className="status-badge cancelled">⛔ Cancelado</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No especificada";
    const date = new Date(dateString);
    return date.toLocaleString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCancel = async (id) => {
    if (!window.confirm("¿Estás seguro de cancelar este recordatorio?")) return;

    try {
      await cancelScheduledTask(id);
      alert("✅ Recordatorio cancelado");
    } catch (err) {
      console.error("Error:", err);
      alert("❌ Error al cancelar");
    }
  };

  const handleGoBack = () => {
    navigate("/dashboard");
  };

  if (scheduledLoading) {
    return (
      <div className="loading-container">
        <h2 className="loading-container-btn">
          Cargando tareas programadas...
        </h2>
      </div>
    );
  }

  return (
    <div className="scheduled-tasks-container">
      <div className="scheduled-header">
        <button onClick={handleGoBack} className="back-btn">
          ← Volver a Inicio
        </button>
        <h1 className="scheduled-tasks-title">📅 Tareas Programadas</h1>
      </div>

      {scheduledTasks.length === 0 ? (
        <div className="no-tasks-message">
          <p>📭 No hay tareas programadas</p>
          <p>Ve al dashboard y programa un recordatorio para verlo aquí.</p>
          <button onClick={handleGoBack} className="go-back-btn">
            🏠 Ir al Dashboard
          </button>
        </div>
      ) : (
        <div className="scheduled-table-container">
          <table className="scheduled-table">
            <thead>
              <tr>
                <th>Tarea</th>
                <th>Programada para</th>
                <th>Estado</th>
                <th>Creada</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {scheduledTasks.map((task) => (
                <tr key={task.id}>
                  <td data-label="Tarea">{task.task_name}</td>
                  <td data-label="Programada para">
                    {formatDate(task.scheduled_for)}
                  </td>
                  <td data-label="Estado">{getStatusBadge(task.status)}</td>
                  <td data-label="Creada">{formatDate(task.created_at)}</td>
                  <td data-label="Acciones">
                    {task.status === "pending" && (
                      <button
                        onClick={() => handleCancel(task.id)}
                        className="cancel-btn"
                      >
                        🗑️ Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ScheduledTasks;