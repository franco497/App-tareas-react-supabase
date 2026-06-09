// src/components/Navbar.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Navbar({ showTaskDone, onToggleView, userEmail }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo">
          <Link to="/dashboard">App Tareas</Link>
        </div>

        <ul className={`nav-menu ${isOpen ? "active" : ""}`}>
          <li className="nav-item">
            <Link to="/dashboard" className="nav-link" onClick={() => setIsOpen(false)}>
              Inicio
            </Link>
          </li>
          <li className="nav-item">
            <button
              onClick={() => {
                onToggleView();
                setIsOpen(false);
              }}
              className={`toggle-nav-btn ${showTaskDone ? "success" : "danger"}`}
            >
              {showTaskDone ? "📋 Mostrar pendientes" : "✅ Mostrar realizadas"}
            </button>
          </li>
          <li className="nav-item">
            <span className="nav-user-email">{userEmail}</span>
          </li>
          <li className="nav-item">
            <button onClick={handleLogout} className="logout-nav-btn">
              🚪 Cerrar Sesión
            </button>
          </li>
        </ul>

        <button
          className={`nav-toggle ${isOpen ? "active" : ""}`}
          onClick={toggleMenu}
          aria-label="toggle navigation"
        >
          <span className="hamburger"></span>
        </button>
      </div>
    </nav>
  );
}

export default Navbar;