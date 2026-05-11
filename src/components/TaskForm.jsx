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
    
    // Recargar tareas si estamos viendo la lista correcta
    await getTasks(currentDoneFilter);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        gap: "10px",
        marginBottom: "20px",
      }}
    >
      <input
        type="text"
        value={taskName}
        onChange={(e) => setTaskName(e.target.value)}
        placeholder="Escribe una nueva tarea..."
        disabled={adding}
        style={{
          flex: 1,
          padding: "10px",
          fontSize: "16px",
          border: "1px solid #ddd",
          borderRadius: "4px",
        }}
      />
      <button
        type="submit"
        disabled={adding}
        style={{
          padding: "10px 20px",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        {adding ? "Creando..." : "Agregar Tarea"}
      </button>
    </form>
  );
}

export default TaskForm;