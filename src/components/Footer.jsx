// src/components/Footer.jsx
// ✅ Importar la imagen al inicio
import fotoCV from '../assets/footer/foto-cv-Franco-De-Vincentis.jfif';

const Footer = () => {
  return (
    <footer className="footer-component">
      <div className="footer-container">
        <div className="footer-content">
          {/* Sección 1: Autor */}
          <div className="footer-section">
            <h3 className="footer-name">Franco De Vincentis</h3>
            <img
              className="footer-avatar"
              // ✅ Cambiar src por la variable importada
              src={fotoCV}
              alt="Franco De Vincentis"
            />
            <div className="footer-link">
              <svg
                className="footer-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48c-1.37-.38-2.8-.38-4.17 0-2.73-1.83-3.91-1.48-3.91-1.48A5.07 5.07 0 0 0 8 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 12 18.13V22" />
              </svg>
              <a
                href="https://github.com/franco497"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </div>
            <div className="footer-link">
              <svg
                className="footer-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect x="2" y="9" width="4" height="12" />
                <circle cx="4" cy="4" r="2" />
              </svg>
              <a
                href="https://www.linkedin.com/in/franco-de-vincentis/"
                target="_blank"
                rel="noreferrer"
              >
                LinkedIn
              </a>
            </div>
          </div>

          {/* Sección 2: Contacto */}
          <div className="footer-section">
            <h3 className="footer-name">Contacto</h3>
            <p className="contact-label">Correo electrónico:</p>
            <div className="contact-email">devincentisf35@gmail.com</div>
            <div className="footer-link">
              <svg
                className="footer-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48c-1.37-.38-2.8-.38-4.17 0-2.73-1.83-3.91-1.48-3.91-1.48A5.07 5.07 0 0 0 8 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 12 18.13V22" />
              </svg>
              <a href="" target="_blank" rel="noreferrer">
                Repositorio
              </a>
            </div>
          </div>
        </div>
        <div className="footer-copyright">Copyright © 2026</div>
      </div>
    </footer>
  );
};

export default Footer;