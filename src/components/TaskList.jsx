import { useEffect } from "react";
import { useTasks } from "../context/TaskContex";
import TaskCard from "./TaskCard";

function TaskList({ done = false }) {
  const { tasks, getTasks, loading } = useTasks();

  useEffect(() => {
    getTasks(done);
  }, [done, getTasks]);

  function renderTasks() {
    if (loading) {
      return <p>loading...</p>;
    } else if (tasks.length === 0) {
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

  return <div>{renderTasks()}</div>;
}

export default TaskList;
