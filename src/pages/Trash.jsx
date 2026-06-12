// src/pages/Trash.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTasks } from "../context/TaskContex";

function Trash() {
  const [deletedTasks, setDeletedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { restoreTask, permanentDeleteTask, getDeletedTasks } = useTasks();
  const navigate = useNavigate();

  useEffect(() => {
    loadDeletedTasks();
  }, []);

  const loadDeletedTasks = async () => {
    setLoading(true);
    const tasks = await getDeletedTasks();
    setDeletedTasks(tasks);
    setLoading(false);
  };

  const handleRestore = async (id) => {
    if (window.confirm("¿Restaurar esta tarea?")) {
      await restoreTask(id);
      await loadDeletedTasks();
    }
  };

  const handlePermanentDelete = async (id, taskName) => {
    if (window.confirm(`¿Eliminar permanentemente "${taskName}"?`)) {
      await permanentDeleteTask(id);
      await loadDeletedTasks();
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <h2>Cargando...</h2>
      </div>
    );
  }

  return (
    <div className="trash-container">
      <div className="trash-header">
        <button onClick={() => navigate("/dashboard")} className="back-btn">
          ← Volver a Inicio
        </button>
        <h1>🗑️ Papelera de Reciclaje</h1>
        <button onClick={loadDeletedTasks} className="refresh-btn">
          🔄 Actualizar
        </button>
      </div>

      {deletedTasks.length === 0 ? (
        <div className="trash-empty">
          <p>📭 La papelera está vacía</p>
        </div>
      ) : (
        <>
          <p className="trash-info">
            📌 Tienes {deletedTasks.length} tarea(s) en la papelera.
          </p>
          <div className="trash-list">
            {deletedTasks.map((task) => (
              <div key={task.id} className="trash-item">
                <div className="trash-item-info">
                  <span>{task.name}</span>
                  <small>{task.done ? "✅ Completada" : "⏳ Pendiente"}</small>
                </div>
                <div className="trash-item-actions">
                  <button
                    onClick={() => handleRestore(task.id)}
                    className="restore-btn"
                  >
                    ↩️ Restaurar
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(task.id, task.name)}
                    className="permanent-delete-btn"
                  >
                    💀 Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Trash;
