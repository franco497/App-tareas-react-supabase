// src/components/Navbar.jsx
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Swal from "sweetalert2"; // ✅ Importar SweetAlert

function Navbar({ showTaskDone, onToggleView, userEmail }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 970);
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);

  // Detectar si es desktop
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 970);
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

  // Efecto para medir el ancho del menú
  useEffect(() => {
    if (menuRef.current) {
      const styles = window.getComputedStyle(menuRef.current);
    }
  }, [isOpen, isDesktop]);

  const toggleMenu = () => {
    if (!isDesktop) {
      setIsOpen(!isOpen);
    }
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  // ✅ HANDLE LOGOUT CON SWEETALERT (FONDO BLANCO)
  const handleLogout = async () => {
    // ✅ Mostrar confirmación antes de cerrar sesión
    const result = await Swal.fire({
      title: "¿Cerrar sesión?",
      text: "¿Estás seguro de que quieres cerrar sesión?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#e76f51",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, cerrar sesión",
      cancelButtonText: "Cancelar",
      background: "#ffffff", // ✅ FONDO BLANCO
      color: "#1a1a2e", // ✅ TEXTO OSCURO
      iconColor: "#e9c46a",
    });

    // ✅ Si el usuario confirma, cerrar sesión
    if (result.isConfirmed) {
      try {
        await supabase.auth.signOut();
        
        // ✅ Mostrar mensaje de éxito
        await Swal.fire({
          title: "✅ Sesión cerrada",
          text: "Has cerrado sesión correctamente.",
          icon: "success",
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
          background: "#ffffff", // ✅ FONDO BLANCO
          color: "#1a1a2e", // ✅ TEXTO OSCURO
          iconColor: "#2d6a4f",
        });
        
        navigate("/");
      } catch (error) {
        console.error("❌ Error al cerrar sesión:", error);
        
        // ✅ Mostrar mensaje de error
        await Swal.fire({
          title: "❌ Error",
          text: "No se pudo cerrar la sesión. Intenta nuevamente.",
          icon: "error",
          confirmButtonColor: "#e76f51",
          confirmButtonText: "Entendido",
          background: "#ffffff", // ✅ FONDO BLANCO
          color: "#1a1a2e", // ✅ TEXTO OSCURO
          iconColor: "#e76f51",
        });
      }
    }
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
          <ul
            ref={menuRef}
            className={`nav-menu ${!isDesktop && isOpen ? "active" : ""}`}
          >
            {/* 1. Botón toggle (Tareas realizadas/pendientes) - PRIMERO */}
            <li className="nav-item">
              <button
                type="button"
                onClick={() => {
                  onToggleView();
                  closeMenu();
                }}
                className="nav-link"
              >
                <span className="nav-icon">{showTaskDone ? "📋" : "✅"}</span>

                <span className="nav-text">
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