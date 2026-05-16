import { useState } from "react";
import { useTasks } from "../context/TaskContex";

function TaskForm() {
  const [taskName, setTaskName] = useState("");
  const { createTask, adding, getTasks, currentDoneFilter } = useTasks();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    await createTask(taskName);
    setTaskName("");
    await getTasks(currentDoneFilter);
  };

  return (
    <form onSubmit={handleSubmit} className="task-form">
      <input
        type="text"
        value={taskName}
        onChange={(e) => setTaskName(e.target.value)}
        placeholder="Escribe una nueva tarea..."
        disabled={adding}
        className="task-input"
      />
      <button type="submit" disabled={adding} className="submit-button">
        {adding ? "Creando..." : "Agregar Tarea"}
      </button>
    </form>
  );
}

export default TaskForm;
