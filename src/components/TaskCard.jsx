function TaskCard({ task }) {
  const handleDelete = () => {
    alert("deleting");
  };

  const handleToggleDone = () => {
    alert("toggling");
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
