// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import TaskForm from "../components/TaskForm";
import TaskList from "../components/TaskList";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer"; // ← Importar Footer

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
      <Navbar
        showTaskDone={showTaskDone}
        onToggleView={handleToggleView}
        userEmail={user?.email}
      />
      <div className="dashboard-container">
        {/* <h1 className="dashboard-title">Panel</h1> */}
        <br /><br />
        <TaskForm />
        <h1 className="dashboard-title">El sistema esta conectado a un 
          back-end de supabase con una base de datos PostgreSQL,
           puedes probar la integracion de la API de Gmail enviando una notificasion a tu correo electronico</h1>
        <TaskList done={showTaskDone} />
      </div>
      <Footer /> {/* ← Agregar Footer al final */}
    </>
  );
}

export default Dashboard;
