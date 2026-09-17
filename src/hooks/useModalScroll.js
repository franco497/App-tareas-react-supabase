// src/hooks/useModalScroll.js
import { useEffect, useRef, useState, useCallback } from "react";

export function useModalScroll() {
  const contentRef = useRef(null);
  const [hasScroll, setHasScroll] = useState(false);

  const checkScroll = useCallback(() => {
    if (!contentRef.current) return;

    const element = contentRef.current;

    // ✅ 1. Medir la altura NATURAL del contenido
    // Guardar el max-height actual
    const computedStyle = window.getComputedStyle(element);
    const currentMaxHeight = computedStyle.maxHeight;
    const currentHeight = computedStyle.height;

    // ✅ 2. Calcular la altura natural del contenido
    // scrollHeight es la altura total del contenido (sin límites)
    const contentHeight = element.scrollHeight;

    // ✅ 3. Medir el espacio DISPONIBLE
    // La altura máxima que puede tener el modal
    const availableHeight = window.innerHeight;
    
    // ✅ 4. Descontar el padding
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
    const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
    const totalPadding = paddingTop + paddingBottom;

    // ✅ 5. Calcular si el contenido cabe en la pantalla
    // El contenido necesita: contentHeight + padding
    // El espacio disponible es: availableHeight
    const needsScroll = (contentHeight + totalPadding) > availableHeight;

    // ✅ LOGS DE DEBUG
    console.log("🔍 ===== VERIFICANDO SCROLL =====");
    console.log("📏 window.innerHeight:", window.innerHeight);
    console.log("📏 window.outerHeight:", window.outerHeight);
    console.log("📦 modal.scrollHeight (contenido):", element.scrollHeight);
    console.log("📦 modal.clientHeight (visible):", element.clientHeight);
    console.log("🎨 maxHeight:", computedStyle.maxHeight);
    console.log("🎨 height:", computedStyle.height);
    console.log("🎨 padding:", computedStyle.padding);
    console.log("🎨 totalPadding:", totalPadding);
    console.log("📐 Altura NATURAL del contenido:", contentHeight + totalPadding);
    console.log("📐 Espacio DISPONIBLE:", availableHeight);
    console.log("📐 ¿Cabe?:", (contentHeight + totalPadding) <= availableHeight);
    console.log("✅ needsScroll:", needsScroll);
    console.log("🏷️ clases:", element.className);
    console.log("=============================");

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