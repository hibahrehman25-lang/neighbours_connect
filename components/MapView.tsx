'use client'

import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const createIcon = (color: string) =>
  L.divIcon({
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4);"></div>`,
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })

export type MapPin = {
  id: string
  lat: number
  lon: number
  label: string
  color: string
}

export type MapZone = {
  id: string
  lat: number
  lon: number
  radius: number
  color: string
  fillOpacity: number
}

export default function MapView({
  centerLat,
  centerLon,
  pins,
  showRadius,
  zones,
}: {
  centerLat: number
  centerLon: number
  pins: MapPin[]
  showRadius?: boolean
  zones?: MapZone[]
}) {
  return (
    <MapContainer
      center={[centerLat, centerLon]}
      zoom={15}
      style={{ height: '320px', width: '100%', borderRadius: '12px', zIndex: 0 }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      {showRadius && (
        <Circle
          center={[centerLat, centerLon]}
          radius={1000}
          pathOptions={{ color: '#D85A30', fillColor: '#D85A30', fillOpacity: 0.1 }}
        />
      )}
      {zones?.map((zone) => (
        <Circle
          key={zone.id}
          center={[zone.lat, zone.lon]}
          radius={zone.radius}
          pathOptions={{
            color: zone.color,
            fillColor: zone.color,
            fillOpacity: zone.fillOpacity,
            weight: 1,
          }}
        />
      ))}
      {pins.map((pin) => (
        <Marker key={pin.id} position={[pin.lat, pin.lon]} icon={createIcon(pin.color)}>
          <Popup>{pin.label}</Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}