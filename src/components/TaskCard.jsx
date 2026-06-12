// src/components/TaskCard.jsx
import { useState } from "react";
import { useTasks } from "../context/TaskContex";
import Swal from 'sweetalert2';
import NotificationForm from "./NotificationForm";

function TaskCard({ task }) {
  const { softDeleteTask, toggleTaskDone, updateTask } = useTasks();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(task.name);
  const [showNotificationForm, setShowNotificationForm] = useState(false); // ← Estado para el modal

  const handleToggle = () => {
    toggleTaskDone(task.id, task.done);
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: '¿Mover a la papelera?',
      text: `¿Estás seguro de que quieres mover "${task.name}" a la papelera?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, mover',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      await softDeleteTask(task.id);
      
      Swal.fire({
        title: '¡Movido!',
        text: 'La tarea ha sido movida a la papelera.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
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

  // ✅ Función corregida - abre el modal
  const handleNotify = () => {
    setShowNotificationForm(true);
  };

  // ✅ Cerrar el modal
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
          <button onClick={handleNotify} className="notify-button">
            📧 Enviar notificación
          </button>
        )}

        <button
          onClick={handleEdit}
          className={`edit-button ${isEditing ? "save" : ""}`}
        >
          {isEditing ? "Guardar" : "Editar"}
        </button>

        <button onClick={handleDelete} className="delete-button">
          🗑️ Borrar
        </button>
      </div>

      {/* Modal de notificación */}
      {showNotificationForm && (
        <NotificationForm task={task} onClose={handleCloseForm} />
      )}
    </>
  );
}

export default TaskCard;