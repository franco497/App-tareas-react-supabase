import { useEffect } from "react";
import { useTasks } from "../context/TaskContex";
import TaskCard from "./TaskCard";

function TaskList() {
  const { tasks, getTasks, loading } = useTasks();

  useEffect(() => {
    getTasks();
  }, []);

  function renderTasks() {
    if (loading) {
      return <p>loading...</p>;
    } else if (tasks.lenght == 0) {
      return <p>No tasks found</p>;
    } else {
      return (
        <div>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      );
    }
  }

  return <div>{renderTasks}</div>;
}

export default TaskList;
