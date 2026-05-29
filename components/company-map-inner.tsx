'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { GeoPoint } from '@/types';

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet-marker-icon-2x.png',
  iconUrl: '/leaflet-marker-icon.png',
  shadowUrl: '/leaflet-marker-shadow.png',
});

function RecenterMap({ geo }: { geo: GeoPoint }) {
  const map = useMap();
  useEffect(() => {
    map.setView([geo.lat, geo.lng], 16);
  }, [map, geo]);
  return null;
}

interface Props {
  geo: GeoPoint;
  companyName: string;
}

export default function CompanyMapInner({ geo, companyName }: Props) {
  return (
    <div className="h-64 overflow-hidden rounded-lg border border-[var(--border)]">
      <MapContainer
        center={[geo.lat, geo.lng]}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterMap geo={geo} />
        <Marker position={[geo.lat, geo.lng]}>
          <Popup>{companyName}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
