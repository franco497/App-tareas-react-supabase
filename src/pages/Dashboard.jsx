import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import TaskForm from "../components/TaskForm";
import TaskList from "../components/TaskList";
import Navbar from "../components/Navbar";

function Dashboard() {
  const [showTaskDone, setShowTaskDone] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();
  }, []);

  const handleToggleView = () => {
    setShowTaskDone(!showTaskDone);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <h2>Cargando...</h2>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <h1 className="dashboard-title">Panel</h1>
        <p className="dashboard-welcome">Bienvenido, {user?.email}</p>
        <TaskForm />

        <div className="dashboard-header">
          <span>{showTaskDone ? "Tareas realizadas" : "Tareas pendientes"}</span>
          <button
            onClick={handleToggleView}
            className={`toggle-button ${showTaskDone ? "success" : "danger"}`}
          >
            {showTaskDone ? "Mostrar tareas sin realizar" : "Mostrar tareas realizadas"}
          </button>
        </div>

        <TaskList done={showTaskDone} />
      </div>
    </>
  );
}

export default Dashboard;