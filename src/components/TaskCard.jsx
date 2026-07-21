// src/components/TaskCard.jsx
import { useState } from "react";
import { useTasks } from "../context/TaskContex";
import Swal from 'sweetalert2';
import NotificationForm from "./NotificationForm";

function TaskCard({ task }) {
  const { softDeleteTask, toggleTaskDone, updateTask } = useTasks();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(task.name);
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const MAX_CHARS = 50;

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

  const handleNotify = () => {
    setShowNotificationForm(true);
  };

  const handleCloseForm = () => {
    setShowNotificationForm(false);
  };

  // ✅ Validaciones para el contador y error
  const charCount = editName.length;
  const isNearLimit = charCount > MAX_CHARS * 0.8;
  const isOverLimit = charCount > MAX_CHARS;
  const hasError = charCount === 0 || charCount > MAX_CHARS || (editName.trim().length === 0 && charCount > 0);

  const getErrorMessage = () => {
    if (editName.trim().length === 0 && charCount > 0) {
      return "La tarea no puede estar vacía";
    }
    if (charCount === 0) {
      return "La tarea es obligatoria";
    }
    if (charCount > MAX_CHARS) {
      return `La tarea no puede tener más de ${MAX_CHARS} caracteres`;
    }
    return null;
  };

  const errorMessage = getErrorMessage();

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
          // ✅ Modo edición con contador y error
          <div className="task-edit-wrapper">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyPress={handleKeyPress}
              autoFocus
              className={`task-edit-input ${errorMessage ? "error" : ""}`}
            />
            
            {/* ✅ Contador de caracteres */}
            {charCount > 0 && (
              <small className={`char-counter ${isOverLimit ? "danger" : isNearLimit ? "warning" : ""}`}>
                {charCount}/{MAX_CHARS}
              </small>
            )}

            {/* ✅ Mensaje de error */}
            {errorMessage && (
              <span className="error-message">{errorMessage}</span>
            )}
          </div>
        ) : (
          <span className={`task-text ${task.done ? "completed" : ""}`}>
            {task.name}
          </span>
        )}

        {/* ✅ Botón Enviar notificación - Bloqueado en modo edición */}
        <button 
          onClick={handleNotify} 
          className={`notify-button ${isEditing ? "disabled" : ""}`}
          disabled={isEditing}
        >
          📧 Enviar notificación
        </button>

        <button
          onClick={handleEdit}
          className={`edit-button ${isEditing ? "save" : ""}`}
          disabled={isEditing && !!errorMessage}
        >
          {isEditing ? "Guardar" : "Editar"}
        </button>

        {/* ✅ Botón Eliminar - Bloqueado en modo edición */}
        <button 
          onClick={handleDelete} 
          className={`delete-button ${isEditing ? "disabled" : ""}`}
          disabled={isEditing}
        >
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