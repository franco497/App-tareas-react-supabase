// src/pages/Trash.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTasks } from "../context";
import Swal from "sweetalert2";
import Footer from "../components/Footer"; 

function Trash() {
  const [deletedTasks, setDeletedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { restoreTask, permanentDeleteTask, getDeletedTasks } = useTasks();
  const navigate = useNavigate();

  //  Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 5;

  useEffect(() => {
    loadDeletedTasks();
  }, []);

  const loadDeletedTasks = async () => {
    setLoading(true);
    const tasks = await getDeletedTasks();
    setDeletedTasks(tasks);
    setLoading(false);
  };

  //  Calcular paginación
  const indexOfLastTask = currentPage * tasksPerPage;
  const indexOfFirstTask = indexOfLastTask - tasksPerPage;
  const currentTasks = deletedTasks.slice(indexOfFirstTask, indexOfLastTask);
  const totalPages = Math.ceil(deletedTasks.length / tasksPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    const container = document.querySelector(".trash-container");
    if (container) {
      container.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleRestore = async (id, taskName) => {
    await restoreTask(id);
    await loadDeletedTasks();

    Swal.fire({
      title: "✅ Tarea restablecida",
      text: `La tarea "${taskName}" ha sido restablecida correctamente.`,
      icon: "success",
      timer: 2000,
      showConfirmButton: false,
    });
  };

  const handlePermanentDelete = async (id, taskName) => {
    const result = await Swal.fire({
      title: "¿Eliminar permanentemente?",
      text: `¿Estás seguro de que quieres eliminar "${taskName}" permanentemente? Esta acción no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      await permanentDeleteTask(id);
      await loadDeletedTasks();

      Swal.fire({
        title: "¡Eliminada!",
        text: "La tarea ha sido eliminada permanentemente.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
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
    <div className="app-wrapper">
      <div className="trash-container">
        <div className="trash-header">
          <button onClick={() => navigate("/dashboard")} className="back-btn">
            ← Volver a Inicio
          </button>
          <h1>🗑️ Papelera de Reciclaje</h1>
        </div>

        {deletedTasks.length === 0 ? (
          <div className="trash-empty">
            <p>📭 La papelera está vacía</p>
            <p>Las tareas que borres aparecerán aquí.</p>
            <button
              onClick={() => navigate("/dashboard")}
              className="go-back-btn"
            >
              🏠 Ir al Panel Principal
            </button>
          </div>
        ) : (
          <>
            <p className="trash-info">
              📌 Tienes {deletedTasks.length} tarea(s) en la papelera.
            </p>
            <div className="trash-list">
              {/*  Usar currentTasks en lugar de deletedTasks */}
              {currentTasks.map((task) => (
                <div key={task.id} className="trash-item">
                  <div className="trash-item-info">
                    <span className={task.done ? "completed-task" : ""}>
                      {task.name}
                    </span>
                    <small>{task.done ? "✅ Completada" : "⏳ Pendiente"}</small>
                  </div>
                  <div className="trash-item-actions">
                    <button
                      onClick={() => handleRestore(task.id, task.name)}
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

            {/*  Paginación */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-btn prev"
                >
                  Anterior
                </button>

                <span className="pagination-info">
                  Página {currentPage} de {totalPages}
                </span>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="pagination-btn next"
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/*  Footer */}
      <Footer />
    </div>
  );
}

export default Trash;