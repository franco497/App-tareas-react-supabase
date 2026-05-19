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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
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
        <button onClick={handleLogout} className="logout-button">
          Cerrar Sesión
        </button>
        <TaskForm />

        <div className="dashboard-header">
          <span>Tareas pendientes</span>
          <button
            onClick={() => setShowTaskDone(!showTaskDone)}
            className="toggle-button"
          >
            Mostrar tarea realizada
          </button>
        </div>

        <TaskList done={showTaskDone} />
      </div>
    </>
  );
}

export default Dashboard;
