import { useState } from "react";
import { useTasks } from "../context/TaskContex";
import NotificationForm from "./NotificationForm";

function TaskCard({ task }) {
  const { deleteTask, toggleTaskDone, updateTask } = useTasks();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(task.name);
  const [showNotificationForm, setShowNotificationForm] = useState(false);

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

  const handleNotify = () => {
    setShowNotificationForm(true);
  };

  const handleCloseForm = () => {
    setShowNotificationForm(false);
  };

  return (
    <>
      <div className={`task-card ${task.done ? "completed" : ""}`}>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={task.done}
            onChange={handleToggle}
            className="task-checkbox"
          />
          <span className="checkbox-text">Hecho</span>
        </label>

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

        {!task.done && (
          <button
            onClick={handleNotify}
            className="notify-button"
          >
            📧 Enviar notificación
          </button>
        )}

        <button
          onClick={handleEdit}
          className={`edit-button ${isEditing ? "save" : ""}`}
        >
          {isEditing ? "Guardar" : "Editar"}
        </button>

        <button
          onClick={handleDelete}
          className="delete-button"
        >
          Borrar
        </button>
      </div>

      {showNotificationForm && (
        <NotificationForm task={task} onClose={handleCloseForm} />
      )}
    </>
  );
}

export default TaskCard;