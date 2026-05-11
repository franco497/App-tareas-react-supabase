import { useEffect } from "react";
import { useTasks } from "../context/TaskContex";
import TaskCard from "./TaskCard";

function TaskList({ done = false }) {
  const { tasks, getTasks, loading } = useTasks();

  useEffect(() => {
    getTasks(done);
  }, [done, getTasks]); // Agregar getTasks como dependencia

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <p>Cargando tareas...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>
        <p>No hay tareas {done ? "completadas" : "pendientes"}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}

export default TaskList;