// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import TaskForm from "../components/TaskForm";
import TaskList from "../components/TaskList";
import Navbar from "../components/Navbar"; // Importar el Navbar

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
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <h2>Cargando...</h2>
      </div>
    );
  }

  return (
    <>
      <Navbar /> {/* Navbar solo aquí */}
      <div style={{ padding: "20px" }}>
        <h1>Dashboard</h1>
        <p>Bienvenido, {user?.email}</p>
        <button
          onClick={handleLogout}
          style={{
            padding: "10px 20px",
            backgroundColor: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Cerrar Sesión
        </button>
        <TaskForm />

        <header>
          <span>Tasks pending</span>
          <button onClick={() => setShowTaskDone(!showTaskDone)}>
            Show Tasks done
          </button>
        </header>

        <TaskList done={showTaskDone} />
      </div>
    </>
  );
}

export default Dashboard;