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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px",
        backgroundColor: "#f5f5f5",
        borderRadius: "8px",
        transition: "all 0.3s",
        opacity: task.done ? 0.7 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={task.done}
        onChange={handleToggle}
        style={{ width: "20px", height: "20px", cursor: "pointer" }}
      />

      {isEditing ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyPress={handleKeyPress}
          autoFocus
          style={{
            flex: 1,
            padding: "5px",
            fontSize: "16px",
            border: "1px solid #007bff",
            borderRadius: "4px",
          }}
        />
      ) : (
        <span
          style={{
            flex: 1,
            textDecoration: task.done ? "line-through" : "none",
            fontSize: "16px",
          }}
        >
          {task.name}
        </span>
      )}

      <button
        onClick={handleEdit}
        style={{
          padding: "5px 10px",
          backgroundColor: isEditing ? "#28a745" : "#ffc107",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        {isEditing ? "💾" : "✏️"}
      </button>

      <button
        onClick={handleDelete}
        style={{
          padding: "5px 10px",
          backgroundColor: "#dc3545",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        🗑️
      </button>
    </div>
  );
}

export default TaskCard;