import { useState } from "react";

function TaskForm() {
  const [taskName, setTaskName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Task Name:", taskName);
    // Handle form submission
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="taskName"
          placeholder="Write a task name"
          onChange={(e) => setTaskName(e.target.value)}
        />
        <button>Add Task</button>
      </form>
    </div>
  );
}

export default TaskForm;
