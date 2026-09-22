// src/components/TaskList.jsx
import { useEffect, useState } from "react";
import { useTasks } from "../context";
import TaskCard from "./TaskCard";

function TaskList({ done = false }) {
  const { tasks, getTasks, loading } = useTasks();
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 5;

  //  Cargar tareas cuando cambia el filtro
  useEffect(() => {
    getTasks(done);
    setCurrentPage(1);
  }, [done, getTasks]);

  // Calcular paginación
  const indexOfLastTask = currentPage * tasksPerPage;
  const indexOfFirstTask = indexOfLastTask - tasksPerPage;
  const currentTasks = tasks.slice(indexOfFirstTask, indexOfLastTask);
  const totalPages = Math.ceil(tasks.length / tasksPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    const taskList = document.querySelector(".task-list");
    if (taskList) {
      taskList.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (loading) {
    return (
      <div className="task-list-loading">
        <p className="task-list-loading-btn">Cargando tareas...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="task-list-empty">
        <p className="task-list-loading-btn">
          No hay tareas {done ? "completadas" : "pendientes"}
        </p>
      </div>
    );
  }

  return (
    <div className="task-list-wrapper">
      <div className="task-list">
        {currentTasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>

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
    </div>
  );
}

export default TaskList;
