import { useState } from "react";
import { useTasks } from "../context/TaskContex";

function TaskForm() {
  const [taskName, setTaskName] = useState("");
  const { createTask, adding } = useTasks();

  const handleSubmit = async (e) => {
    e.preventDefault();
    createTask(taskName);
    setTaskName("");
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="taskName"
          placeholder="Write a task name"
          onChange={(e) => setTaskName(e.target.value)}
          value={taskName}
        />
        <button disabled={adding}>{adding ? "adding..." : "add"}</button>
      </form>
    </div>
  );
}

export default TaskForm;
