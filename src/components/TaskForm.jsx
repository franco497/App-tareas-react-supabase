import { useState } from "react";
import { supabase } from "../lib/supabase";

function TaskForm() {
  const [taskName, setTaskName] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = await supabase.auth.getUser();
      console.log("Current user:", user.data.user.id);
       const result = await supabase
        .from("tasks")
        .insert({ name: taskName, userId: user.data.user.id }); 
    } catch (error) {
      console.error("Error inserting task:", error);
    }
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
