// src/components/TaskForm.jsx
import { useForm } from "react-hook-form";
import { useTasks } from "../context/TaskContex";

function TaskForm() {
  const { createTask, adding, getTasks, currentDoneFilter } = useTasks();
  const MAX_CHARS = 50;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isValid, isSubmitting }
  } = useForm({
    defaultValues: {
      taskName: ""
    },
    mode: "onChange"
  });

  const taskName = watch("taskName", "");
  const charCount = taskName.length;
  const isNearLimit = charCount > MAX_CHARS * 0.8;
  const isOverLimit = charCount > MAX_CHARS;

  const onSubmit = async (data) => {
    await createTask(data.taskName);
    reset();
    await getTasks(currentDoneFilter);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="task-form">
      <div className="task-form-group">
        <input
          type="text"
          placeholder={`Escribe una nueva tarea... (máx ${MAX_CHARS} caracteres)`}
          disabled={adding || isSubmitting}
          className={`task-input ${errors.taskName ? "error" : ""}`}
          {...register("taskName", {
            required: "La tarea es obligatoria",
            minLength: {
              value: 3,
              message: "La tarea debe tener al menos 3 caracteres"
            },
            maxLength: {
              value: MAX_CHARS,
              message: `La tarea no puede tener más de ${MAX_CHARS} caracteres`
            },
            validate: (value) => {
              if (value.trim().length === 0) {
                return "La tarea no puede estar vacía";
              }
              return true;
            }
          })}
        />
        
        {/* Contador de caracteres */}
        {charCount > 0 && (
          <small className={`char-counter ${isOverLimit ? "danger" : isNearLimit ? "warning" : ""}`}>
            {charCount}/{MAX_CHARS}
          </small>
        )}

        {/* Mensaje de error */}
        {errors.taskName && (
          <span className="error-message">{errors.taskName.message}</span>
        )}
      </div>

      <button 
        type="submit" 
        disabled={adding || !isValid || isSubmitting || isOverLimit} 
        className="submit-button"
      >
        {adding ? "Creando..." : "Agregar Tarea"}
      </button>
    </form>
  );
}

export default TaskForm;