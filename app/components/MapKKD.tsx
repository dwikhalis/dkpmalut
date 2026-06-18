"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Popup, GeoJSON, useMap } from "react-leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Feature, Geometry } from "geojson";
import {
  COLORS,
  DEFAULT_MAP_STYLE,
  DEFAULT_MAP_VIEW,
  getKkdOption,
  getLegendItem,
  type GeoDataMap,
  type GeoLayerId,
  type LegendValue,
  type SelectedKkdId,
  type ZoneFeatureCollection,
  type ZoneProperties,
} from "./kkdConfig";

type ZoneFeature = Feature<Geometry, ZoneProperties>;

interface Props {
  legend: LegendValue;
  kkd: SelectedKkdId;
  geoData: GeoDataMap;
  loadStatus?: (status: boolean) => void;
}

const SVG_NS = "http://www.w3.org/2000/svg";

function LeafletSvgPatterns({
  renderer,
  refreshKey,
}: {
  renderer: L.SVG;
  refreshKey: string;
}) {
  const map = useMap();

  useEffect(() => {
    let frameId = 0;
    let tries = 0;

    const insertPatterns = () => {
      const svg = (renderer as unknown as { _container?: SVGSVGElement })
        ._container;

      if (!svg) {
        tries += 1;

        if (tries < 60) {
          frameId = requestAnimationFrame(insertPatterns);
        }

        return;
      }

      let defs = svg.querySelector("#leaflet-zone-patterns");

      if (!defs) {
        defs = document.createElementNS(SVG_NS, "defs");
        defs.setAttribute("id", "leaflet-zone-patterns");
        svg.prepend(defs);
      }

      defs.innerHTML = `
        <pattern
          id="pattern-diagonal-blue"
          patternUnits="userSpaceOnUse"
          width="12"
          height="12"
        >
          <rect width="12" height="12" fill="${COLORS.lightBlue}" fill-opacity="0.75" />
          <path
            d="M-3 12 L12 -3 M3 15 L15 3"
            stroke="${COLORS.blue}"
            stroke-width="2"
            stroke-opacity="0.9"
          />
        </pattern>

        <pattern
          id="pattern-white-dot"
          patternUnits="userSpaceOnUse"
          width="8"
          height="8"
        >
          <rect width="8" height="8" fill="${COLORS.dotGray}" fill-opacity="0.75" />
          <circle
            cx="4"
            cy="4"
            r="1.5"
            fill="#FFFFFF"
            fill-opacity="0.95"
          />
        </pattern>

        <pattern
          id="pattern-vine-gray"
          patternUnits="userSpaceOnUse"
          width="42"
          height="30"
        >
          <rect width="42" height="30" fill="${COLORS.gray}" fill-opacity="0.75" />

          <path
            d="M2 19 C8 8, 16 8, 22 19 S34 29, 40 16"
            fill="none"
            stroke="#FFFFFF"
            stroke-width="1.3"
            stroke-opacity="0.75"
          />

          <path
            d="M4 7 C11 13, 18 13, 25 7 S35 1, 40 9"
            fill="none"
            stroke="#FFFFFF"
            stroke-width="1"
            stroke-opacity="0.55"
          />

          <path
            d="M0 28 C8 21, 15 21, 22 28 S34 35, 42 26"
            fill="none"
            stroke="#FFFFFF"
            stroke-width="1"
            stroke-opacity="0.45"
          />

          <circle cx="10" cy="15" r="1.1" fill="#FFFFFF" fill-opacity="0.65" />
          <circle cx="29" cy="10" r="1.1" fill="#FFFFFF" fill-opacity="0.65" />
        </pattern>
      `;
    };

    map.whenReady(insertPatterns);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [map, renderer, refreshKey]);

  return null;
}

function formatArea(feature: ZoneFeature) {
  const area =
    feature.properties?.Luas ??
    feature.properties?.luas ??
    feature.properties?.Area;

  if (typeof area !== "number") return "-";

  return area.toFixed(2);
}

export default function MapKKD({ legend, kkd, geoData, loadStatus }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const ctrlDownRef = useRef(false);
  const hoveredRef = useRef(false);

  const geoJsonLayerRefs = useRef<Record<string, L.GeoJSON | null>>({});
  const selectedFeatureKeyRef = useRef<string | null>(null);
  const selectedFeatureRef = useRef<ZoneFeature | null>(null);

  const [showCtrlNotif, setShowCtrlNotif] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const svgRenderer = useMemo(() => L.svg({ padding: 0.5 }), []);

  const selectedKkd = useMemo(() => {
    if (!kkd) return null;

    return getKkdOption(kkd);
  }, [kkd]);

  const activeLayers = useMemo(
    () =>
      (selectedKkd?.layers ?? [])
        .map((layerId) => ({
          id: layerId,
          data: geoData[layerId],
        }))
        .filter(
          (layer): layer is { id: GeoLayerId; data: ZoneFeatureCollection } =>
            Boolean(layer.data),
        ),
    [selectedKkd, geoData],
  );

  const geoStyle = (feature: ZoneFeature, selected = false): L.PathOptions => {
    const subZone = feature.properties?.Sub_Zona;
    const legendItem = getLegendItem(subZone);

    const baseStyle = legendItem?.mapStyle ?? DEFAULT_MAP_STYLE;

    if (!selected) {
      return {
        ...baseStyle,
        renderer: svgRenderer,
      };
    }

    return {
      ...baseStyle,
      renderer: svgRenderer,

      // selected polygon border
      color: "#111827",
      weight: 5,
      opacity: 1,
      dashArray: "",

      // keep fill visible
      fillOpacity:
        typeof baseStyle.fillOpacity === "number"
          ? Math.min(baseStyle.fillOpacity + 0.15, 0.9)
          : 0.8,
    };
  };

  const applyLayerStyle = (layer: L.Layer | null, style: L.PathOptions) => {
    if (!layer) return;

    const styledLayer = layer as L.Layer & {
      setStyle?: (style: L.PathOptions) => void;
      eachLayer?: (callback: (childLayer: L.Layer) => void) => void;
    };

    if (typeof styledLayer.setStyle === "function") {
      styledLayer.setStyle(style);
      return;
    }

    if (typeof styledLayer.eachLayer === "function") {
      styledLayer.eachLayer((childLayer) => {
        applyLayerStyle(childLayer, style);
      });
    }
  };

  const bringLayerToFront = (layer: L.Layer | null) => {
    if (!layer) return;

    const frontLayer = layer as L.Layer & {
      bringToFront?: () => void;
      eachLayer?: (callback: (childLayer: L.Layer) => void) => void;
    };

    if (typeof frontLayer.bringToFront === "function") {
      frontLayer.bringToFront();
      return;
    }

    if (typeof frontLayer.eachLayer === "function") {
      frontLayer.eachLayer((childLayer) => {
        bringLayerToFront(childLayer);
      });
    }
  };

  const resetSelectedFeature = () => {
    const selectedKey = selectedFeatureKeyRef.current;
    const selectedFeature = selectedFeatureRef.current;

    if (!selectedKey || !selectedFeature) return;

    const selectedLayer = geoJsonLayerRefs.current[selectedKey];

    applyLayerStyle(selectedLayer, geoStyle(selectedFeature, false));

    selectedFeatureKeyRef.current = null;
    selectedFeatureRef.current = null;
  };

  const handleFeatureClick = (featureKey: string, feature: ZoneFeature) => {
    const previousSelectedKey = selectedFeatureKeyRef.current;

    if (previousSelectedKey && previousSelectedKey !== featureKey) {
      resetSelectedFeature();
    }

    const selectedLayer = geoJsonLayerRefs.current[featureKey];

    applyLayerStyle(selectedLayer, geoStyle(feature, true));
    bringLayerToFront(selectedLayer);

    selectedFeatureKeyRef.current = featureKey;
    selectedFeatureRef.current = feature;
  };

  useEffect(() => {
    resetSelectedFeature();
    mapRef.current?.closePopup();
  }, [legend, kkd]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!selectedKkd) {
      mapRef.current.flyTo(DEFAULT_MAP_VIEW.center, DEFAULT_MAP_VIEW.zoom, {
        duration: 1,
      });

      return;
    }

    mapRef.current.flyTo(selectedKkd.center, selectedKkd.zoom, {
      duration: 1.5,
    });
  }, [selectedKkd]);

  useEffect(() => {
    if (!selectedKkd) {
      loadStatus?.(!mapReady);
      return;
    }

    const requiredLayersLoaded = selectedKkd.layers.every(
      (layerId) => geoData[layerId],
    );

    loadStatus?.(!(mapReady && requiredLayersLoaded));
  }, [mapReady, geoData, selectedKkd, loadStatus]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !ctrlDownRef.current) {
        ctrlDownRef.current = true;

        if (hoveredRef.current) {
          mapRef.current?.scrollWheelZoom.enable();
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

  const shouldShowFeature = (feature: ZoneFeature) => {
    const subZone = feature.properties?.Sub_Zona;

    return legend === "All" || subZone === legend;
  };

  return (
    <div
      className="relative flex h-[80vh] w-full justify-center gap-3"
      onMouseEnter={() => {
        hoveredRef.current = true;

        if (ctrlDownRef.current) {
          mapRef.current?.scrollWheelZoom.enable();
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
      {showCtrlNotif && (
        <div className="absolute top-3 z-[1000] hidden h-8 w-100 items-center justify-center rounded-xl bg-black/40 text-white md:flex">
          <h5>
            Tekan <kbd>Ctrl</kbd> + Scroll untuk Zoom
          </h5>
        </div>
      )}

      <MapContainer
        center={DEFAULT_MAP_VIEW.center}
        zoom={DEFAULT_MAP_VIEW.zoom}
        minZoom={7}
        scrollWheelZoom={false}
        maxBounds={[
          [-3.831117, 123.129132],
          [3.831117, 132.548618],
        ]}
        maxBoundsViscosity={0.8}
        className="h-full w-full"
        ref={(mapInstance: L.Map | null) => {
          if (mapInstance) {
            mapRef.current = mapInstance;
          }
        }}
        whenReady={() => setMapReady(true)}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <LeafletSvgPatterns
          renderer={svgRenderer}
          refreshKey={`${kkd}-${activeLayers.length}`}
        />

        {activeLayers.map((layer) =>
          layer.data.features.filter(shouldShowFeature).map((feature, idx) => {
            const featureKey = `${layer.id}-${legend}-${idx}`;

            return (
              <GeoJSON
                key={featureKey}
                ref={(geoJsonLayer) => {
                  geoJsonLayerRefs.current[featureKey] = geoJsonLayer;
                }}
                data={feature}
                style={geoStyle(feature)}
                eventHandlers={{
                  click: () => {
                    handleFeatureClick(featureKey, feature);
                  },
                }}
              >
                <Popup>
                  <div className="text-sm leading-tight">
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
                      <b>Luas:</b> {formatArea(feature)} km²
                    </p>
                  </div>
                </Popup>
              </GeoJSON>
            );
          }),
        )}
      </MapContainer>
    </div>
  );
}
