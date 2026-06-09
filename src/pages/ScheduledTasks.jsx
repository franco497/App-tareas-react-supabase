// src/pages/ScheduledTasks.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function ScheduledTasks() {
  const [scheduledTasks, setScheduledTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchScheduledTasks();
  }, []);

  const fetchScheduledTasks = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuario no autenticado");
      }

      const { data, error } = await supabase
        .from("scheduled_notifications")
        .select("*")
        .eq("user_email", user.email)
        .in("status", ["pending", "sent", "failed"])
        .order("scheduled_for", { ascending: true });

      if (error) throw error;
      setScheduledTasks(data || []);
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return <span className="status-badge pending">⏳ Pendiente</span>;
      case "sent":
        return <span className="status-badge sent">✅ Enviado</span>;
      case "failed":
        return <span className="status-badge failed">❌ Fallido</span>;
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
      minute: "2-digit"
    });
  };

  const handleCancel = async (id) => {
    if (!window.confirm("¿Estás seguro de cancelar este recordatorio?")) return;
    
    try {
      const { error } = await supabase
        .from("scheduled_notifications")
        .update({ status: "cancelled" })
        .eq("id", id);
      
      if (error) throw error;
      
      setScheduledTasks(prev => 
        prev.map(task => 
          task.id === id ? { ...task, status: "cancelled" } : task
        )
      );
      
      alert("✅ Recordatorio cancelado");
    } catch (err) {
      console.error("Error:", err);
      alert("❌ Error al cancelar");
    }
  };

  const handleGoBack = () => {
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <div className="loading-container">
        <h2>Cargando tareas programadas...</h2>
      </div>
    );
  }

  return (
    <div className="scheduled-tasks-container">
      <div className="scheduled-header">
        <div className="scheduled-header-left">
          <button onClick={handleGoBack} className="back-btn">
            ← Volver a Inicio
          </button>
          <h1>📅 Tareas Programadas</h1>
        </div>
        <button onClick={fetchScheduledTasks} className="refresh-btn">
          🔄 Actualizar
        </button>
      </div>

      {error && (
        <div className="error-message">
          ❌ Error: {error}
        </div>
      )}

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
                  <td data-label="Programada para">{formatDate(task.scheduled_for)}</td>
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