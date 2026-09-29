// src/hooks/useModalScroll.js
import { useEffect, useRef, useState, useCallback } from "react";

export function useModalScroll() {
  const contentRef = useRef(null);
  const [hasScroll, setHasScroll] = useState(false);

  const checkScroll = useCallback(() => {
    if (!contentRef.current) return;

    const element = contentRef.current;

    // Medir la altura NATURAL del contenido
    const computedStyle = window.getComputedStyle(element);

    // Calcular la altura natural del contenido
    // scrollHeight es la altura total del contenido (sin límites)
    const contentHeight = element.scrollHeight;

    // Medir el espacio DISPONIBLE
    // La altura máxima que puede tener el modal
    const availableHeight = window.innerHeight;

    // Descontar el padding
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
    const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
    const totalPadding = paddingTop + paddingBottom;

    // Calcular si el contenido cabe en la pantalla
    // El contenido necesita: contentHeight + padding
    // El espacio disponible es: availableHeight
    const needsScroll = contentHeight + totalPadding > availableHeight;

    setHasScroll(needsScroll);
  }, []);

  useEffect(() => {
    if (!contentRef.current) return;

    checkScroll();
    const rafId = requestAnimationFrame(checkScroll);
    const timeoutId = setTimeout(checkScroll, 200);

    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(contentRef.current);

    window.addEventListener("resize", checkScroll);
    window.addEventListener("orientationchange", checkScroll);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", checkScroll);
      window.removeEventListener("orientationchange", checkScroll);
    };
  }, [checkScroll]);

  return { contentRef, hasScroll };
}