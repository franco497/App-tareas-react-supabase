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
  const [selectedTaskId, setSelectedTaskId] = useState(null); 

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

  //  VER DETALLES - Guarda el ID, no el objeto
  const handleViewDetails = (task) => {
    setSelectedTaskId(task.id);
    setShowDetailsModal(true);
  };

  // REPROGRAMAR (abrir modal)
  const handleReschedule = (task) => {
    setSelectedTaskId(task.id);
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
    setSelectedTaskId(null);
  };

  const handleDetailsClose = () => {
    setShowDetailsModal(false);
    setSelectedTaskId(null);
  };

  //  Obtener la tarea actualizada desde scheduledTasks
  const selectedTask = scheduledTasks.find(task => task.id === selectedTaskId);

  if (scheduledLoading) {
    return (
      <div className="loading-container">
        <h2 className="loading-container-btn">
          Cargando...
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

      {/* Mensaje informativo sobre emails */}
      <div style={{
        background: "rgba(233, 196, 106, 0.1)",
        border: "1px solid rgba(233, 196, 106, 0.2)",
        borderRadius: "8px",
        padding: "10px 16px",
        marginBottom: "16px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "0.85rem",
        color: "rgba(255, 255, 255, 0.8)",
      }}>
        <span style={{ fontSize: "1.2rem" }}>📬</span>
        <span>
          Los recordatorios se envían desde <strong style={{ color: "#e9c46a" }}>devincentisf35@gmail.com</strong>
        </span>
      </div>

      {scheduledTasks.length === 0 ? (
        <div className="no-tasks-message">
          <p>📭 No hay tareas programadas</p>
          <p>Ve al Panel Principal y programa un recordatorio para verlo aquí.</p>
          <button onClick={handleGoBack} className="go-back-btn">
            🏠 Ir al Panel Principal
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

      {/*  Modal de reprogramación - pasa el objeto actualizado */}
      {showRescheduleModal && selectedTask && (
        <RescheduleModal task={selectedTask} onClose={handleRescheduleClose} />
      )}

      {/*  Modal de detalles - pasa el objeto actualizado */}
      {showDetailsModal && selectedTask && (
        <ScheduledDetailsModal task={selectedTask} onClose={handleDetailsClose} />
      )}
    </div>
  );
}

export default ScheduledTasks;