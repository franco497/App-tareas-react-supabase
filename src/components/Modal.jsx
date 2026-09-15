// src/components/Modal.jsx
import { useEffect, useRef, useState } from "react";

/**
 * Modal wrapper que detecta automáticamente si el contenido necesita scroll
 * y aplica la clase "has-scroll" solo cuando es necesario.
 */
function Modal({ children, onClose }) {
  const contentRef = useRef(null);
  const [hasScroll, setHasScroll] = useState(false);

  // ✅ Detectar si el contenido necesita scroll
  useEffect(() => {
    const checkScroll = () => {
      if (contentRef.current) {
        const hasOverflow =
          contentRef.current.scrollHeight > contentRef.current.clientHeight;
        setHasScroll(hasOverflow);
      }
    };

    // ✅ Verificar después de que el contenido se renderice
    const timer = setTimeout(checkScroll, 100);

    // ✅ Verificar en cambios de tamaño y orientación
    window.addEventListener("resize", checkScroll);
    window.addEventListener("orientationchange", checkScroll);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkScroll);
      window.removeEventListener("orientationchange", checkScroll);
    };
  }, [children]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={contentRef}
        className={`modal-content ${hasScroll ? "has-scroll" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export default Modal;