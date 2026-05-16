import { useEffect } from "react";
import { useTasks } from "../context/TaskContex";
import TaskCard from "./TaskCard";

function TaskList({ done = false }) {
  const { tasks, getTasks, loading } = useTasks();

  useEffect(() => {
    getTasks(done);
  }, [done, getTasks]);

  if (loading) {
    return (
      <div className="task-list-loading">
        <p>Cargando tareas...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="task-list-empty">
        <p>No hay tareas {done ? "completadas" : "pendientes"}</p>
      </div>
    );
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}

export default TaskList;
