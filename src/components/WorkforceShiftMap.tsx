"use client"

import { useEffect, useMemo } from "react"
import L from "leaflet"
import { Circle, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet"

export type WorkforceHospitalPin = {
  id: string
  hospital: string
  distanceMiles: number
  contactNumber: string
  shiftCount: number
  strongestFit: "strong fit" | "good fit" | "developing fit" | "none"
  position: [number, number]
}

function pinColor(fit: WorkforceHospitalPin["strongestFit"]) {
  switch (fit) {
    case "none":
      return "#97A6B2"
    case "strong fit":
      return "#12A574"
    case "good fit":
      return "#28B4C7"
    default:
      return "#59B1D8"
  }
}

function glowClass(fit: WorkforceHospitalPin["strongestFit"]) {
  switch (fit) {
    case "none":
      return ""
    case "strong fit":
      return "prepsight-hospital-pin-glow-strong"
    case "good fit":
      return "prepsight-hospital-pin-glow-good"
    default:
      return "prepsight-hospital-pin-glow-soft"
  }
}

function createHospitalIcon(pin: WorkforceHospitalPin, selected: boolean) {
  const color = pinColor(pin.strongestFit)
  const size = selected ? 40 : 34
  const glow = glowClass(pin.strongestFit)

  return L.divIcon({
    className: "prepsight-hospital-pin-wrapper",
    html: `
      <div class="${glow}"
        style="
          min-width:${size}px;
          height:${size}px;
          padding:0 12px;
          background:${color};
          border:2px solid #ffffff;
          border-radius:999px;
          box-shadow:0 10px 24px rgba(16,36,62,0.18);
          display:flex;
          align-items:center;
          justify-content:center;
          color:#ffffff;
          font-size:12px;
          font-weight:700;
          line-height:1;
          white-space:nowrap;
        "
      >
        ${pin.shiftCount}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

function FitHospitalBounds({
  bounds,
}: {
  bounds: L.LatLngBounds
}) {
  const map = useMap()

  useEffect(() => {
    map.fitBounds(bounds, {
      padding: [42, 42],
      maxZoom: 8,
      animate: true,
    })
  }, [bounds, map])

  return null
}

export default function WorkforceShiftMap({
  hospitals,
  radiusMiles,
  selectedHospitalId,
  hoveredHospitalId,
  center,
  onSelectHospital,
  onHoverHospital,
}: {
  hospitals: WorkforceHospitalPin[]
  radiusMiles: number
  selectedHospitalId: string | null
  hoveredHospitalId: string | null
  center: [number, number]
  onSelectHospital: (hospitalId: string) => void
  onHoverHospital: (hospitalId: string | null) => void
}) {
  const bounds = useMemo(() => {
    const all = [center, ...hospitals.map((hospital) => hospital.position)]
    return L.latLngBounds(all)
  }, [center, hospitals])
  const activeHospital = hospitals.find(
    (hospital) => hospital.id === hoveredHospitalId || hospital.id === selectedHospitalId,
  )

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#D7E8EF]">
      <MapContainer
        bounds={bounds}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        zoomControl={false}
        className="h-[520px] w-full"
        style={{ background: "#D8F0F7" }}
      >
        <FitHospitalBounds bounds={bounds} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          opacity={0.28}
        />

        <Circle
          center={center}
          radius={radiusMiles * 1609.34}
          pathOptions={{
            color: "#0096C7",
            weight: 2,
            fillColor: "#8FDDF0",
            fillOpacity: 0.1,
          }}
        />

        {activeHospital ? (
          <Polyline
            positions={[center, activeHospital.position]}
            pathOptions={{
              color: "#25C1D5",
              weight: 4,
              opacity: 0.85,
              dashArray: "12 14",
              className: "prepsight-route-beam",
            }}
          />
        ) : null}

        {hospitals.map((hospital) => (
          <Marker
            key={hospital.id}
            position={hospital.position}
            icon={createHospitalIcon(
              hospital,
              hospital.id === selectedHospitalId || hospital.id === hoveredHospitalId,
            )}
            eventHandlers={{
              click: () => onSelectHospital(hospital.id),
              mouseover: () => onHoverHospital(hospital.id),
              mouseout: () => onHoverHospital(null),
            }}
          >
            <Tooltip direction="top" offset={[0, -18]} opacity={1} className="prepsight-map-tooltip">
              <div className="space-y-1 text-[12px] leading-5">
                <p className="font-medium text-[#15364D]">{hospital.hospital}</p>
                <p className="text-[#61758B]">{hospital.distanceMiles} miles away</p>
                <p className="text-[#61758B]">
                  {hospital.shiftCount > 0 ? `${hospital.shiftCount} shifts available` : "No shifts available"}
                </p>
                <p className="text-[#61758B]">{hospital.contactNumber}</p>
              </div>
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
