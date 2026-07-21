import { useEffect, useRef, useState, useCallback } from "react";

// Hook de cierre de sesión por inactividad.
// - TIEMPO_TOTAL_MS: tiempo total antes de cerrar sesión (5 minutos)
// - TIEMPO_AVISO_MS: cuánto antes del cierre se muestra la advertencia (30 segundos)
//
// Detecta actividad real del usuario: mouse, teclado, clics, scroll y toques
// (para celular/tablet). Cualquiera de estos reinicia el contador.
const TIEMPO_TOTAL_MS = 5 * 60 * 1000;
const TIEMPO_AVISO_MS = 30 * 1000;

export function useInactividad(onCerrarPorInactividad) {
  const [mostrarAdvertencia, setMostrarAdvertencia] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(30);

  const ultimaActividad = useRef(Date.now());
  const intervaloRef = useRef(null);

  const registrarActividad = useCallback(() => {
    ultimaActividad.current = Date.now();
    if (mostrarAdvertencia) {
      setMostrarAdvertencia(false);
    }
  }, [mostrarAdvertencia]);

  useEffect(() => {
    const eventos = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    eventos.forEach((ev) => window.addEventListener(ev, registrarActividad));

    intervaloRef.current = setInterval(() => {
      const transcurrido = Date.now() - ultimaActividad.current;
      const restante = TIEMPO_TOTAL_MS - transcurrido;

      if (restante <= 0) {
        clearInterval(intervaloRef.current);
        onCerrarPorInactividad();
      } else if (restante <= TIEMPO_AVISO_MS) {
        setMostrarAdvertencia(true);
        setSegundosRestantes(Math.ceil(restante / 1000));
      }
    }, 1000);

    return () => {
      eventos.forEach((ev) => window.removeEventListener(ev, registrarActividad));
      clearInterval(intervaloRef.current);
    };
  }, [registrarActividad, onCerrarPorInactividad]);

  function seguirConectado() {
    registrarActividad();
  }

  return { mostrarAdvertencia, segundosRestantes, seguirConectado };
}