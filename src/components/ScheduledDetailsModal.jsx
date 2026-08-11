// src/components/ScheduledDetailsModal.jsx
function ScheduledDetailsModal({ task, onClose }) {
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

  //  NUEVA FUNCIÓN: Restar 3 horas a la fecha
  const formatSentDate = (dateString) => {
    if (!dateString) return "No especificada";
    const date = new Date(dateString);
    // Restar 3 horas (10800000 milisegundos)
    date.setTime(date.getTime() - 3 * 60 * 60 * 1000);
    return date.toLocaleString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "pending":
        return "⏳ Pendiente";
      case "sent":
        return "✅ Enviado";
      case "failed":
        return "❌ Fallido";
      case "cancelled":
        return "⛔ Cancelado";
      default:
        return status;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📋 Detalles de la notificación</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="details-content">
          <div className="detail-item">
            <span className="detail-label">📌 Tarea:</span>
            <span className="detail-value">{task.task_name}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">📅 Programada para:</span>
            <span className="detail-value">{formatDate(task.scheduled_for)}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">📊 Estado:</span>
            <span className="detail-value">{getStatusLabel(task.status)}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">📧 Email:</span>
            <span className="detail-value">{task.user_email}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">🆔 ID:</span>
            <span className="detail-value" style={{ fontSize: "0.8rem", wordBreak: "break-all" }}>
              {task.id}
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">📆 Fecha de creación:</span>
            <span className="detail-value">{formatDate(task.created_at)}</span>
          </div>

          {task.sent_at && (
            <div className="detail-item">
              <span className="detail-label">📨 Enviado el:</span>
              <span className="detail-value">{formatSentDate(task.sent_at)}</span>
            </div>
          )}
        </div>

        <button className="details-close-btn" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}

export default ScheduledDetailsModal;