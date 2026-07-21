import { useEffect, useRef, useState } from "react";
import { cargarLeaflet } from "./leafletLoader";

const CENTRO_POR_DEFECTO = [-12.0651, -75.2049]; // Huancayo

// Mapa reutilizable: muestra el destino fijo (📍), la posición en
// vivo del técnico (🟠), y traza la RUTA real entre ambos (siguiendo
// calles, no una línea recta) usando OSRM, un servicio de rutas
// gratuito y sin necesitar API key.
export default function MapaSeguimiento({ destinoLat, destinoLng, tecnicoLat, tecnicoLng, altura = "300px" }) {
  const mapaRef = useRef(null);
  const instanciaMapaRef = useRef(null);
  const marcadorDestinoRef = useRef(null);
  const marcadorTecnicoRef = useRef(null);
  const lineaRutaRef = useRef(null);
  const [leafletListo, setLeafletListo] = useState(false);

  useEffect(() => {
    cargarLeaflet().then(() => setLeafletListo(true));
  }, []);

  useEffect(() => {
    if (!leafletListo || instanciaMapaRef.current || !mapaRef.current) return;

    const mapa = window.L.map(mapaRef.current).setView(CENTRO_POR_DEFECTO, 13);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(mapa);
    instanciaMapaRef.current = mapa;
  }, [leafletListo]);

  // Actualiza marcadores + traza la ruta cada vez que cambian las coordenadas
  useEffect(() => {
    if (!leafletListo || !instanciaMapaRef.current) return;
    const mapa = instanciaMapaRef.current;
    const puntos = [];

    if (destinoLat != null && destinoLng != null) {
      const pos = [destinoLat, destinoLng];
      puntos.push(pos);
      if (!marcadorDestinoRef.current) {
        marcadorDestinoRef.current = window.L.marker(pos, {
          icon: window.L.divIcon({
            className: "", html: '<div style="font-size:28px;line-height:28px;transform:translate(-50%,-100%);">📍</div>', iconSize: [0, 0],
          }),
        }).addTo(mapa).bindPopup("Destino");
      } else {
        marcadorDestinoRef.current.setLatLng(pos);
      }
    }

    if (tecnicoLat != null && tecnicoLng != null) {
      const pos = [tecnicoLat, tecnicoLng];
      puntos.push(pos);
      if (!marcadorTecnicoRef.current) {
        marcadorTecnicoRef.current = window.L.marker(pos, {
          icon: window.L.divIcon({
            className: "",
            html: '<div style="background:#f59e0b;width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>',
            iconSize: [18, 18],
          }),
        }).addTo(mapa).bindPopup("Técnico");
      } else {
        marcadorTecnicoRef.current.setLatLng(pos);
      }
    }

    if (puntos.length === 2) {
      mapa.fitBounds(puntos, { padding: [40, 40] });
      trazarRuta(tecnicoLat, tecnicoLng, destinoLat, destinoLng, mapa);
    } else if (puntos.length === 1) {
      mapa.setView(puntos[0], 15);
    }
  }, [leafletListo, destinoLat, destinoLng, tecnicoLat, tecnicoLng]);

  // Pide la ruta real (siguiendo calles) a OSRM, gratis, sin API key
  async function trazarRuta(lat1, lng1, lat2, lng2, mapa) {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.routes && data.routes[0]) {
        // OSRM devuelve [lng, lat] - Leaflet necesita [lat, lng]
        const coordenadas = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);

        if (lineaRutaRef.current) {
          lineaRutaRef.current.setLatLngs(coordenadas);
        } else {
          lineaRutaRef.current = window.L.polyline(coordenadas, { color: "#1d4ed8", weight: 4, opacity: 0.7 }).addTo(mapa);
        }
      }
    } catch {
      // Si falla el servicio de rutas, no pasa nada grave - solo no se traza la línea
    }
  }

  return <div ref={mapaRef} style={{ width: "100%", height: altura, borderRadius: "10px", overflow: "hidden", background: "#e2e8f0" }} />;
}