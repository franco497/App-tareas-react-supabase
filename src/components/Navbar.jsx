// src/components/Navbar.jsx
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Navbar({ showTaskDone, onToggleView, userEmail }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Efecto para controlar el scroll del body cuando el menú está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("menu-open");
    } else {
      document.body.classList.remove("menu-open");
    }

    // Cleanup al desmontar
    return () => document.body.classList.remove("menu-open");
  }, [isOpen]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // Función para determinar si un link está activo
  const isActiveLink = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          {/* Logo */}
          <div className="nav-logo">
            <Link to="/dashboard" onClick={closeMenu}>
              ✅ App Tareas
            </Link>
          </div>

          {/* Botón Hamburguesa */}
          <button
            className={`nav-toggle ${isOpen ? "active" : ""}`}
            onClick={toggleMenu}
            aria-label="toggle navigation"
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>

          {/* Menú de navegación */}
          <ul className={`nav-menu ${isOpen ? "active" : ""}`}>
            <li className="nav-item">
              <Link
                to="/scheduled"
                className={`nav-link ${isActiveLink("/scheduled") ? "active" : ""}`}
                onClick={closeMenu}
              >
                <span className="nav-icon">📅</span>
                <span className="nav-text">Tareas programadas</span>
              </Link>
            </li>

            <li className="nav-item">
              <Link
                to="/trash"
                className={`nav-link ${isActiveLink("/trash") ? "active" : ""}`}
                onClick={closeMenu}
              >
                <span className="nav-icon">🗑️</span>
                <span className="nav-text">Papelera de reciclaje</span>
              </Link>
            </li>

            <li className="nav-item">
              <button
                onClick={() => {
                  onToggleView();
                  closeMenu();
                }}
                className="toggle-nav-btn"
              >
                <span className="btn-icon">{showTaskDone ? "📋" : "✅"}</span>
                <span className="btn-text">
                  {showTaskDone
                    ? "Mostrar tareas pendientes"
                    : "Mostrar tareas realizadas"}
                </span>
              </button>
            </li>

            <li className="nav-item">
              <button onClick={handleLogout} className="logout-nav-btn">
                <span className="btn-icon">🚪</span>
                <span className="btn-text">Cerrar Sesión</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Overlay para cerrar menú al hacer clic fuera */}
      {isOpen && <div className="nav-overlay" onClick={closeMenu}></div>}
    </>
  );
}

export default Navbar;
