// src/pages/Dashboard.jsx
import { useState, useTransition } from "react";
import { useTasks } from "../context";
import TaskForm from "../components/TaskForm";
import TaskList from "../components/TaskList";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import InfoBanner from "../components/InfoBanner"; // ← NUEVO

function Dashboard() {
  const [showTaskDone, setShowTaskDone] = useState(false);
  const { user, loading, updateCounter, tasks } = useTasks();
  const [isPending, startTransition] = useTransition();

  const handleToggleView = () => {
    setShowTaskDone(!showTaskDone);
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
              <InfoBanner /> {/* ← COMPONENTE SEPARADO */}
            </>
          )}

          <div
            style={{
              opacity: isPending ? 0.92 : 1,
              transition: "opacity 0.1s ease-in-out",
            }}
          >
            <TaskList
              key={`task-list-${showTaskDone}-${updateCounter}`}
              done={showTaskDone}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Dashboard;