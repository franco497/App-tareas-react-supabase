// src/pages/Dashboard.jsx
import { useState, useTransition } from "react";
import { useTasks } from "../context";
import TaskForm from "../components/TaskForm";
import TaskList from "../components/TaskList";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import InfoBanner from "../components/InfoBanner";
import { useOrientation } from "../hooks/useOrientation";

function Dashboard() {
  const [showTaskDone, setShowTaskDone] = useState(false);
  const { user, loading } = useTasks(); 
  const [isPending, startTransition] = useTransition();

  useOrientation();

  const handleToggleView = () => {
    startTransition(() => {
      setShowTaskDone(!showTaskDone);
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <h2 className="loading-container-text">Cargando...</h2>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <Navbar
        showTaskDone={showTaskDone}
        onToggleView={handleToggleView}
        userEmail={user?.email}
      />

      <main className="main-content">
        <div className="dashboard-container">
          {!showTaskDone && (
            <>
              <p className="welcome-text">
                Bienvenido {user?.email || "Usuario"}
              </p>
              <TaskForm />
              <InfoBanner />
            </>
          )}

          {/*  SIN updateCounter en el key */}
          <div
            style={{
              opacity: isPending ? 0.92 : 1,
              transition: "opacity 0.1s ease-in-out",
            }}
          >
            <TaskList done={showTaskDone} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Dashboard;