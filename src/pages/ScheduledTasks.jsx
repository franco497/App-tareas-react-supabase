// src/pages/ScheduledTasks.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTasks } from "../context";
import Swal from "sweetalert2";
import RescheduleModal from "../components/RescheduleModal";
import ScheduledDetailsModal from "../components/ScheduledDetailsModal";

function ScheduledTasks() {
  const navigate = useNavigate();
  const {
    scheduledTasks,
    scheduledLoading,
    getScheduledTasks,
    cancelScheduledTask,
    deleteScheduledTask,
    rescheduleScheduledTask,
  } = useTasks();

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

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

  // VER DETALLES - Abre modal con detalles
  const handleViewDetails = (task) => {
    setSelectedTask(task);
    setShowDetailsModal(true);
  };

  // REPROGRAMAR (abrir modal)
  const handleReschedule = (task) => {
    setSelectedTask(task);
    setShowRescheduleModal(true);
  };

  // ELIMINAR (permanente)
  const handleDelete = async (id, taskName) => {
    const result = await Swal.fire({
      title: "¿Eliminar permanentemente?",
      text: `¿Estás seguro de eliminar "${taskName}" permanentemente?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        await deleteScheduledTask(id);
        await Swal.fire({
          title: "🗑️ Eliminada",
          text: `La tarea "${taskName}" ha sido eliminada permanentemente.`,
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (err) {
        console.error("Error:", err);
        await Swal.fire({
          title: "❌ Error",
          text: "No se pudo eliminar la tarea.",
          icon: "error",
          confirmButtonText: "Entendido",
        });
      }
    }
  };

  const handleGoBack = () => {
    navigate("/dashboard");
  };

  const handleRescheduleClose = () => {
    setShowRescheduleModal(false);
    setSelectedTask(null);
  };

  const handleDetailsClose = () => {
    setShowDetailsModal(false);
    setSelectedTask(null);
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
        <>
          <p className="scheduled-info">
            📌 Tienes {scheduledTasks.length} tarea(s) programadas.
          </p>
          <div className="scheduled-list">
            {scheduledTasks.map((task) => (
              <div key={task.id} className="scheduled-item">
                <div className="scheduled-item-info">
                  <span className={task.status === "sent" ? "completed-task" : ""}>
                    {task.task_name}
                  </span>
                  <div className="scheduled-item-meta">
                    <small>
                      📅 {formatDate(task.scheduled_for)}
                    </small>
                    <small>
                      {getStatusBadge(task.status)}
                    </small>
                  </div>
                </div>
                <div className="scheduled-item-actions">
                  {/* Ver detalles - SIEMPRE visible */}
                  <button
                    onClick={() => handleViewDetails(task)}
                    className="details-btn"
                  >
                    📋 Ver detalles
                  </button>

                  {/* Reprogramar - Solo para pending, sent, failed */}
                  {task.status !== "cancelled" && (
                    <button
                      onClick={() => handleReschedule(task)}
                      className="reschedule-btn-card"
                    >
                      🔄 Reprogramar
                    </button>
                  )}

                  {/* Eliminar - SIEMPRE visible */}
                  <button
                    onClick={() => handleDelete(task.id, task.task_name)}
                    className="delete-btn-scheduled-card"
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal de reprogramación */}
      {showRescheduleModal && selectedTask && (
        <RescheduleModal task={selectedTask} onClose={handleRescheduleClose} />
      )}

      {/* Modal de detalles */}
      {showDetailsModal && selectedTask && (
        <ScheduledDetailsModal task={selectedTask} onClose={handleDetailsClose} />
      )}
    </div>
  );
}

export default ScheduledTasks;