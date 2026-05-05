import { useTasks } from "../context/TaskContex";

function TaskCard({ task }) {
  const { deleteTask, updateTask } = useTasks();

  const handleDelete = () => {
    deleteTask(task.id);
  };

  const handleToggleDone = () => {
    updateTask(task.id, { done: !task.done });
  };

  return (
    <div>
      <h1>{task.name}</h1>
      <p>{JSON.stringify(task.done)}</p>
      <div>
        <button
          onClick={() => {
            handleDelete();
          }}
        >
          Delete
        </button>
        <button
          onClick={() => {
            handleToggleDone();
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
export default TaskCard;
