import { useEffect } from "react";
import { useTasks } from "../context/TaskContex";

function TaskList() {
  const { tasks, getTasks } = useTasks();

  useEffect(() => {
    getTasks();
  }, []);

  return <div>TaskList</div>;
}

export default TaskList;
