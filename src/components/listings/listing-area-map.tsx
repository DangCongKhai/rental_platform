"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const pin = L.icon({
  iconUrl: "/images/leaflet/marker-icon.png",
  iconRetinaUrl: "/images/leaflet/marker-icon-2x.png",
  shadowUrl: "/images/leaflet/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const attribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">' +
  "OpenStreetMap</a> contributors";

export function ListingAreaMap({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    // Create and tear down the map in one effect. MapContainer
    // removes the map during React Strict Mode's effect replay
    // and then TileLayer attaches to that destroyed map.
    const map = L.map(node, {
      center: [latitude, longitude],
      zoom: 15,
      scrollWheelZoom: false,
    });
    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { attribution },
    ).addTo(map);
    L.marker([latitude, longitude], { icon: pin })
      .addTo(map)
      .bindPopup("Vị trí gần đúng trong khu vực này.");

    return () => {
      map.remove();
    };
  }, [latitude, longitude]);

  return (
    <div
      ref={nodeRef}
      className="z-0 h-[400px] w-full rounded-2xl"
      style={{ height: 280, width: "100%" }}
    />
  );
}
