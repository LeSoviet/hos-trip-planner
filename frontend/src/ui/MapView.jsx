import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { markerFor, interpoleAlongRoute, eventLabel } from "../domain/plan";

const STOP_COLORS = {
  current: "#3b82f6",
  pickup: "#22c55e",
  dropoff: "#ef4444",
};

function makeMarkerElement(color, size) {
  const el = document.createElement("div");
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.borderRadius = "50%";
  el.style.background = color;
  el.style.border = "2px solid white";
  el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.4)";
  return el;
}

function stopTitle(kind) {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function eventPopupHtml(title, event) {
  const start = new Date(event.start);
  const time = start.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `<strong>${title}</strong><br/>${eventLabel(event.type)}<br/>${time}`;
}

export default function MapView({ plan }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/navigation-night-v1",
      center: [-95.5, 32.5],
      zoom: 4.2,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;
    return () => map.remove();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !plan) return;

    const draw = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const coordinates = plan.route.coordinates;
      const bounds = new mapboxgl.LngLatBounds();
      coordinates.forEach((c) => bounds.extend(c));

      if (map.getSource("route")) {
        map.getSource("route").setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates },
        });
      } else {
        map.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates },
          },
        });
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#38bdf8", "line-width": 4 },
        });
      }

      Object.entries(plan.stops).forEach(([kind, coords]) => {
        bounds.extend(coords);
        const marker = new mapboxgl.Marker({ element: makeMarkerElement(STOP_COLORS[kind], 18) })
          .setLngLat(coords)
          .setPopup(new mapboxgl.Popup({ offset: 12 }).setHTML(`<strong>${stopTitle(kind)}</strong>`))
          .addTo(map);
        markersRef.current.push(marker);
      });

      const { miles } = plan.route;
      plan.days.forEach((day) => {
        day.events.forEach((event) => {
          const marker = markerFor(event);
          if (!marker) return;
          const position = interpoleAlongRoute(coordinates, event.mile_at, miles);
          if (!position) return;
          bounds.extend(position);
          const m = new mapboxgl.Marker({ element: makeMarkerElement(marker.color, 14) })
            .setLngLat(position)
            .setPopup(new mapboxgl.Popup({ offset: 12 }).setHTML(eventPopupHtml(marker.label, event)))
            .addTo(map);
          markersRef.current.push(m);
        });
      });

      map.fitBounds(bounds, { padding: 70, duration: 800 });
    };

    if (map.isStyleLoaded()) draw();
    else map.once("load", draw);
  }, [plan]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}