// src/components/Navbar.jsx
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Navbar({ showTaskDone, onToggleView, userEmail }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 900);
  const navigate = useNavigate();
  const location = useLocation();

  // Detectar si es desktop
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 900);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Controlar scroll solo en móvil y cuando el menú está abierto
  useEffect(() => {
    if (!isDesktop && isOpen) {
      document.body.classList.add("menu-open");
    } else {
      document.body.classList.remove("menu-open");
    }
    return () => document.body.classList.remove("menu-open");
  }, [isOpen, isDesktop]);

  // Cerrar menú automáticamente al cambiar a desktop
  useEffect(() => {
    if (isDesktop && isOpen) {
      setIsOpen(false);
    }
  }, [isDesktop, isOpen]);

  const toggleMenu = () => {
    if (!isDesktop) {
      setIsOpen(!isOpen);
    }
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const isActiveLink = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          {/* Botón Hamburguesa - solo visible en móvil */}
          {!isDesktop && (
            <button
              className={`nav-toggle ${isOpen ? "active" : ""}`}
              onClick={toggleMenu}
              aria-label="toggle navigation"
            >
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
          )}

          {/* Menú de navegación - siempre visible en desktop, condicional en móvil */}
          <ul className={`nav-menu ${!isDesktop && isOpen ? "active" : ""}`}>
            {/* 1. Botón toggle (Tareas realizadas/pendientes) - PRIMERO */}
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

            {/* 2. Tareas programadas - SEGUNDO */}
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

            {/* 3. Papelera de reciclaje - TERCERO */}
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

            {/* 4. Cerrar Sesión - ÚLTIMO (se mantiene al final) */}
            <li className={`nav-item ${isDesktop ? "logout-desktop" : ""}`}>
              <button onClick={handleLogout} className="logout-nav-btn">
                <span className="btn-icon">🚪</span>
                <span className="btn-text">Cerrar Sesión</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Overlay solo en móvil cuando el menú está abierto */}
      {!isDesktop && isOpen && (
        <div className="nav-overlay" onClick={closeMenu}></div>
      )}
    </>
  );
}

export default Navbar;
