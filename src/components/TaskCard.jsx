import { useState } from "react";
import { useTasks } from "../context/TaskContex";

function TaskCard({ task }) {
  const { deleteTask, toggleTaskDone, updateTask } = useTasks();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(task.name);

  const handleToggle = () => {
    toggleTaskDone(task.id, task.done);
  };

  const handleDelete = async () => {
    if (window.confirm("¿Estás seguro de eliminar esta tarea?")) {
      await deleteTask(task.id);
    }
  };

  const handleEdit = async () => {
    if (isEditing && editName.trim() !== task.name) {
      await updateTask(task.id, { name: editName });
    }
    setIsEditing(!isEditing);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleEdit();
    }
  };

  return (
    <div className={`task-card ${task.done ? "completed" : ""}`}>
      <input
        type="checkbox"
        checked={task.done}
        onChange={handleToggle}
        className="task-checkbox"
      />

      {isEditing ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyPress={handleKeyPress}
          autoFocus
          className="task-edit-input"
        />
      ) : (
        <span className={`task-text ${task.done ? "completed" : ""}`}>
          {task.name}
        </span>
      )}

      <button
        onClick={handleEdit}
        className={`edit-button ${isEditing ? "save" : ""}`}
      >
        {isEditing ? "💾" : "✏️"}
      </button>

      <button
        onClick={handleDelete}
        className="delete-button"
      >
        🗑️
      </button>
    </div>
  );
}

export default TaskCard;