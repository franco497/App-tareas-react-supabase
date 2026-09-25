// src/components/TaskForm.jsx
import { useForm } from "react-hook-form";
import { useTasks } from "../context";

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

  //  Log para debug
  console.log("📊 Estado del formulario:", {
    taskName,
    isValid,
    isSubmitting,
    charCount,
    isOverLimit,
  });

  const onSubmit = async (data) => {
    console.log("📝 onSubmit llamado:", data);
    
    //  Validar manualmente
    if (!data.taskName || data.taskName.trim().length < 3) {
      console.log("❌ Tarea inválida (menos de 3 caracteres)");
      return;
    }
    
    if (data.taskName.length > MAX_CHARS) {
      console.log("❌ Tarea demasiado larga");
      return;
    }
    
    //  Si es válida, crear la tarea
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
            }
          })}
        />
        
        {charCount > 0 && (
          <small className={`char-counter ${isOverLimit ? "danger" : isNearLimit ? "warning" : ""}`}>
            {charCount}/{MAX_CHARS}
          </small>
        )}

        {errors.taskName && (
          <span className="error-message">{errors.taskName.message}</span>
        )}
      </div>

      {/*  Solución preventiva: sin !isValid en disabled */}
      <button 
        type="submit" 
        disabled={adding || isSubmitting} 
        className={`submit-button ${!isValid ? "disabled" : ""}`}
        onTouchStart={(e) => {
          console.log("👆 onTouchStart del botón");
          //  En iOS, el touchstart puede ayudar
        }}
      >
        {adding ? "Creando..." : "Agregar Tarea"}
      </button>
    </form>
  );
}

export default TaskForm;