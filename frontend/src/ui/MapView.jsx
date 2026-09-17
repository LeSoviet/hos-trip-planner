import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { markerFor, interpoleAlongRoute, eventLabel } from "../domain/plan";

const STOP_COLORS = {
  current: "#3b82f6",
  pickup: "#22c55e",
  dropoff: "#ef4444",
};

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
          paint: {
            "line-color": "#38bdf8",
            "line-width": 4,
          },
        });
      }

      Object.entries(plan.stops).forEach(([kind, coords]) => {
        addMarker(map, coords, STOP_COLORS[kind], kind, bounds);
      });

      const { miles } = plan.route;
      plan.days.forEach((day) => {
        day.events.forEach((event) => {
          const marker = markerFor(event);
          if (!marker) return;
          const position = interpoleAlongRoute(coordinates, event.mile_at, miles);
          if (!position) return;
          addPopupMarker(map, position, marker.color, marker.label, event, bounds);
        });
      });

      map.fitBounds(bounds, { padding: 70, duration: 800 });
    };

    if (map.isStyleLoaded()) draw();
    else map.once("load", draw);
  }, [plan]);

  function addMarker(map, coords, color, kind, bounds) {
    bounds.extend(coords);
    const el = document.createElement("div");
    el.style.width = "18px";
    el.style.height = "18px";
    el.style.borderRadius = "50%";
    el.style.background = color;
    el.style.border = "3px solid white";
    el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.4)";
    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat(coords)
      .setPopup(
        new mapboxgl.Popup({ offset: 12 }).setHTML(
          `<strong>${kind.charAt(0).toUpperCase() + kind.slice(1)}</strong>`
        )
      )
      .addTo(map);
    markersRef.current.push(marker);
  }

  function addPopupMarker(map, position, color, title, event, bounds) {
    bounds.extend(position);
    const el = document.createElement("div");
    el.style.width = "14px";
    el.style.height = "14px";
    el.style.borderRadius = "50%";
    el.style.background = color;
    el.style.border = "2px solid white";
    el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.4)";
    const start = new Date(event.start);
    const time = start.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    const marker = new mapboxgl.Marker({ element: el, color })
      .setLngLat(position)
      .setPopup(
        new mapboxgl.Popup({ offset: 12 }).setHTML(
          `<strong>${title}</strong><br/>${eventLabel(event.type)}<br/>${time}`
        )
      )
      .addTo(map);
    markersRef.current.push(marker);
  }

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}