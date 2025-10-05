"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Popup, GeoJSON } from "react-leaflet";
import { useEffect, useRef, useState } from "react";
import type { Feature, FeatureCollection, Geometry } from "geojson";

interface GeoDatas {
  kkdWidi?: FeatureCollection;
  kkdMakianMoti?: FeatureCollection;
}

interface Props {
  legend: string;
  kkd?: string;
  loadStatus?: (status: boolean) => void;
}

export default function MapKKD({ legend, kkd, loadStatus }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const ctrlDownRef = useRef(false);
  const hoveredRef = useRef(false);

  const [showCtrlNotif, setShowCtrlNotif] = useState(false);
  const [geoData, setGeoData] = useState<GeoDatas>({});
  const [mapReady, setMapReady] = useState(false);

  // ! Refresh All Popups
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.closePopup();
    }
  }, [legend]);

  // ! AUTO ZOOM
  useEffect(() => {
    if (!mapRef.current) return;

    const destinations = {
      malut: { lat: 0.7213405231465007, lon: 127.97671266232439, zoom: 7 },
      widi: { lat: -0.512699, lon: 128.405639, zoom: 10 },
      makian_moti: { lat: 0.340791, lon: 127.320747, zoom: 11 },
    };

    const target = kkd ? destinations[kkd as keyof typeof destinations] : null;

    if (target && mapRef.current) {
      mapRef.current.flyTo([target.lat, target.lon], target.zoom, {
        duration: 1.5,
      });
    }
  }, [kkd]); // <-- Always static, never conditional

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !ctrlDownRef.current) {
        ctrlDownRef.current = true;
        if (hoveredRef.current && mapRef.current) {
          mapRef.current.scrollWheelZoom.enable();
        }
        setShowCtrlNotif(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        ctrlDownRef.current = false;
        mapRef.current?.scrollWheelZoom.disable();
        if (hoveredRef.current) {
          setShowCtrlNotif(true);
        }
      }
    };

    const handleBlur = () => {
      ctrlDownRef.current = false;
      mapRef.current?.scrollWheelZoom.disable();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  useEffect(() => {
    const loadGeoData = async () => {
      try {
        const [kkdWidiRes, kkdMakianMotiRes] = await Promise.all([
          fetch("/geojson/zonasi_widi.geojson"),
          fetch("/geojson/zonasi_makian_moti.geojson"),
        ]);

        const [kkdWidi, kkdMakianMoti] = await Promise.all([
          kkdWidiRes.json(),
          kkdMakianMotiRes.json(),
        ]);

        setGeoData({ kkdWidi, kkdMakianMoti });
      } catch (err) {
        console.error("Error load Geo Data", err);
      }
    };
    loadGeoData();
  }, []);

  // ! Loading if mapReady and geoData fetched
  useEffect(() => {
    if (mapReady && geoData.kkdWidi && geoData.kkdMakianMoti) {
      loadStatus?.(false);
    }
  }, [mapReady, geoData, loadStatus]);

  const geoStyle = (feature: Feature<Geometry>) => {
    const group = feature.properties?.Sub_Zona;
    switch (group) {
      case "Pariwisata Alam Perairan":
        return {
          color: "green", // Border Color
          fillColor: "green", // Fill Color
          fillOpacity: 0.7, // Transparency
          weight: 0, // Border Weight
        };
      case "Penangkapan Ikan":
        return {
          color: "#1974D2",
          fillColor: "#1974D2",
          fillOpacity: 0.7,
          weight: 0,
        };
      case "Inti":
        return {
          color: "red",
          fillColor: "red",
          fillOpacity: 0.7,
          weight: 0,
        };
      case "Rehabilitasi":
        return {
          color: "#757575",
          fillColor: "#757575",
          fillOpacity: 0.7,
          weight: 0,
        };
      case "Alur Kapal":
        return {
          color: "#B6B6B4",
          fillColor: "#B6B6B4",
          fillOpacity: 0.7,
          weight: 0,
        };
      default:
        return {
          color: "black",
          fillColor: "black",
          fillOpacity: 0.7,
          weight: 1,
        };
    }
  };

  return (
    <div
      className="relative flex justify-center gap-3 w-full h-[80vh]"
      onMouseEnter={() => {
        hoveredRef.current = true;
        if (ctrlDownRef.current && mapRef.current) {
          mapRef.current.scrollWheelZoom.enable();
        } else {
          setShowCtrlNotif(true);
        }
      }}
      onMouseLeave={() => {
        hoveredRef.current = false;
        mapRef.current?.scrollWheelZoom.disable();
        setShowCtrlNotif(false);
      }}
    >
      {/* //! CTRL PRESS NOTIFICATION */}
      {showCtrlNotif && (
        <div className="absolute hidden md:flex justify-center items-center w-100 h-8 top-3 z-1000 text-white bg-black/40 rounded-xl">
          <h5>
            Tekan <kbd>Ctrl</kbd> + Scroll untuk Zoom
          </h5>
        </div>
      )}

      <MapContainer
        center={[0.7213405231465007, 127.97671266232439]}
        zoom={7}
        minZoom={7}
        scrollWheelZoom={false}
        // ! Prevent user wandering off (giving max panning constraint)
        // ! [[SW coordinate],[NE coordinate]]
        maxBounds={[
          [-3.831117, 123.129132],
          [3.831117, 132.548618],
        ]}
        // ! Max pan contraint elasticity, soft to hard (0 > x > 1.0)
        maxBoundsViscosity={0.8}
        className="w-full h-full"
        ref={(mapInstance: L.Map | null) => {
          if (mapInstance) {
            mapRef.current = mapInstance; // save the instance
          }
        }}
        whenReady={() => setMapReady(true)}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* //! GeoJSON */}

        {/* Widi GeoJSON */}

        {geoData.kkdWidi && (
          <div key={`widi-${legend}`}>
            {geoData.kkdWidi.features
              .filter((feature) => {
                const group = feature.properties?.Sub_Zona;
                return legend === "All" || group === legend;
              })
              .map((feature, idx) => (
                <GeoJSON
                  key={`widi-${idx}`}
                  data={feature}
                  style={geoStyle(feature)}
                >
                  <Popup>
                    <div className="leading-tight text-sm">
                      <p>
                        <b>Kawasan:</b> {feature.properties?.KKP ?? "-"}
                      </p>
                      <p>
                        <b>Zona:</b> {feature.properties?.Zona ?? "-"}
                      </p>
                      <p>
                        <b>Sub Zona:</b> {feature.properties?.Sub_Zona ?? "-"}
                      </p>
                      <p>
                        <b>Luas:</b>{" "}
                        {feature.properties?.Luas
                          ? feature.properties.Luas.toFixed(2)
                          : "-"}{" "}
                        km²
                      </p>
                    </div>
                  </Popup>
                </GeoJSON>
              ))}
          </div>
        )}

        {/* Makian Moti GeoJSON */}
        {geoData.kkdMakianMoti && (
          <div key={`makian-${legend}`}>
            {geoData.kkdMakianMoti.features
              .filter((feature) => {
                const group = feature.properties?.Sub_Zona;
                return legend === "All" || group === legend;
              })
              .map((feature, idx) => (
                <GeoJSON
                  key={`makian-${idx}`}
                  data={feature}
                  style={geoStyle(feature)}
                >
                  <Popup>
                    <div className="leading-tight text-sm">
                      <p>
                        <b>Kawasan:</b> {feature.properties?.KKP ?? "-"}
                      </p>
                      <p>
                        <b>Zona:</b> {feature.properties?.Zona ?? "-"}
                      </p>
                      <p>
                        <b>Sub Zona:</b> {feature.properties?.Sub_Zona ?? "-"}
                      </p>
                      <p>
                        <b>Luas:</b>{" "}
                        {feature.properties?.luas
                          ? feature.properties.luas.toFixed(2)
                          : "-"}{" "}
                        km²
                      </p>
                    </div>
                  </Popup>
                </GeoJSON>
              ))}
          </div>
        )}
      </MapContainer>
    </div>
  );
}
