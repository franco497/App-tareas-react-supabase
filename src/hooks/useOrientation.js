// src/hooks/useOrientation.js
import { useState, useEffect } from "react";

/**
 * Hook que detecta cambios de orientación en móviles
 * y cierra el teclado virtual para evitar errores de layout
 */
export function useOrientation() {
  const [orientation, setOrientation] = useState(
    window.screen.orientation?.type || "portrait-primary",
  );

  useEffect(() => {
    const handleOrientationChange = () => {
      // Cerrar el teclado virtual al cambiar de orientación
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }

      // Pequeño delay para que el navegador recalcule el layout
      setTimeout(() => {
        const newOrientation =
          window.screen.orientation?.type || "portrait-primary";
        setOrientation(newOrientation);

        // Forzar un repintado del layout
        window.dispatchEvent(new Event("resize"));
      }, 150);
    };

    // Escuchar ambos eventos (compatibilidad)
    window.addEventListener("orientationchange", handleOrientationChange);
    window.screen.orientation?.addEventListener(
      "change",
      handleOrientationChange,
    );

    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange);
      window.screen.orientation?.removeEventListener(
        "change",
        handleOrientationChange,
      );
    };
  }, []);

  return orientation;
}
