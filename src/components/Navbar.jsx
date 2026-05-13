// Navbar.jsx con funcionalidad responsive
import { useState } from "react";
import { Link } from "react-router-dom";

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo">
          <Link to="/">MiLogo</Link>
        </div>

        <ul className={`nav-menu ${isOpen ? "active" : ""}`}>
          <li className="nav-item">
            <a href="/" className="nav-link" onClick={() => setIsOpen(false)}>
              Inicio
            </a>
          </li>
          <li className="nav-item">
            <a
              href="/about"
              className="nav-link"
              onClick={() => setIsOpen(false)}
            >
              Acerca de
            </a>
          </li>
          <li className="nav-item">
            <a
              href="/services"
              className="nav-link"
              onClick={() => setIsOpen(false)}
            >
              Servicios
            </a>
          </li>
          <li className="nav-item">
            <a
              href="/contact"
              className="nav-link"
              onClick={() => setIsOpen(false)}
            >
              Contacto
            </a>
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
