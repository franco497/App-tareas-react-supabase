// Navbar.jsx con funcionalidad responsive y botón de cerrar sesión
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Navbar() {
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
          <Link to="/">MiLogo</Link>
        </div>

        <ul className={`nav-menu ${isOpen ? "active" : ""}`}>
{/*           <li className="nav-item">
            <Link to="/" className="nav-link" onClick={() => setIsOpen(false)}>
              Inicio
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/about" className="nav-link" onClick={() => setIsOpen(false)}>
              Acerca de
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/services" className="nav-link" onClick={() => setIsOpen(false)}>
              Servicios
            </Link>
          </li> */}
          <li className="nav-item">
            <button onClick={handleLogout} className="nav-link logout-nav-btn">
              Cerrar Sesión
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