"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";

type ColdChainRow = {
  id: string;
  created_at: string;
  area: string;
  kab: string;
  kec: string;
  kel: string;
  type: string;
  kodkws: string;
  tahun_ops: string;
  level: string;
  name: string;
  es_pabrik: number;
  es_pabrik_jum_unit: number;
  es_pabrik_kondisi: string;
  es_pabrik_tahun: string;
  abf: number;
  abf_jum_unit: number;
  abf_kondisi: string;
  abf_tahun: string;
  es_storage: number;
  es_storage_jum: number;
  es_storage_kondisi: string;
  es_storage_tahun: string;
  cs: number;
  cs_jum_unit: number;
  cs_kondisi: string;
  cs_tahun: string;
  cpf: number;
  cpf_jum_unit: number;
  cpf_kondisi: string;
  cpf_tahun: string;
  lon: number;
  lat: number;
  desc: string;
};

interface Props {
  legend: string;
  data: ColdChainRow[];
  fromChild?: (id: string) => void;
}

export default function Map({ legend, data, fromChild }: Props) {
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.closePopup();
      console.log("Closed all popups because legend changed to:", legend);
    }
  }, [legend]);

  const pinPort = new L.Icon({
    iconUrl: "/assets/pin_port.png",
    iconSize: [30, 30],
  });

  const pinCompany = new L.Icon({
    iconUrl: "/assets/pin_company.png",
    iconSize: [30, 30],
  });

  const pinIceFactory = new L.Icon({
    iconUrl: "/assets/pin_ice_factory.png",
    iconSize: [30, 30],
  });

  const pinIceStorage = new L.Icon({
    iconUrl: "/assets/pin_ice_storage.png",
    iconSize: [30, 30],
  });

  const pinABF = new L.Icon({
    iconUrl: "/assets/pin_abf.png",
    iconSize: [30, 30],
  });

  const pinCS = new L.Icon({
    iconUrl: "/assets/pin_cs.png",
    iconSize: [30, 30],
  });

  const pinCPF = new L.Icon({
    iconUrl: "/assets/pin_cpf.png",
    iconSize: [30, 30],
  });

  const pinDisabled = new L.Icon({
    iconUrl: "/assets/pin_cpf.png",
    iconSize: [0, 0],
  });

  return (
    <div className="flex gap-3 w-full h-[90vh]">
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
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* //! Landing Sites */}
        {data.map((e: any, idx: number) =>
          legend === "landing_sites" ? (
            <Marker
              key={`ports-${idx}`}
              position={[e.lat, e.lon]}
              icon={
                e.type === "UPTD"
                  ? pinPort
                  : e.type === "Swasta"
                    ? pinCompany
                    : pinDisabled
              }
            >
              <Popup>
                <p
                  className="font-bold cursor-pointer text-sky-600 hover:underline"
                  onClick={() => fromChild?.(e.id)}
                >
                  {e.name}
                </p>
              </Popup>
            </Marker>
          ) : e.type === "UPTD" ? (
            <Marker
              key={`ports-${idx}`}
              position={[e.lat, e.lon]}
              icon={legend === "ports" ? pinPort : pinDisabled}
            >
              <Popup>
                <p
                  className="font-bold cursor-pointer text-sky-600 hover:underline"
                  onClick={() => fromChild?.(e.id)}
                >
                  {e.name}
                </p>
              </Popup>
            </Marker>
          ) : e.type === "Swasta" ? (
            <Marker
              key={`companies-${idx}`}
              position={[e.lat, e.lon]}
              icon={legend === "companies" ? pinCompany : pinDisabled}
            >
              <Popup>
                <p
                  className="font-bold cursor-pointer text-sky-600 hover:underline"
                  onClick={() => fromChild?.(e.id)}
                >
                  {e.name}
                </p>
              </Popup>
            </Marker>
          ) : null
        )}

        {/* //! ice_factory */}
        {data.map((e: any, idx: number) =>
          e.es_pabrik > 0 ? (
            <Marker
              key={`ice_factory-${idx}`}
              position={[e.lat, e.lon]}
              icon={legend === "ice_factory" ? pinIceFactory : pinDisabled}
            >
              <Popup>
                <p className="font-bold">{e.name}</p>
                <p className="text-sm">
                  {" "}
                  Jumlah : {e.es_pabrik_jum_unit
                    ? e.es_pabrik_jum_unit
                    : "-"}{" "}
                  unit{" "}
                </p>{" "}
                <p className="text-sm">
                  {" "}
                  Kapasitas : {e.es_pabrik ? e.es_pabrik : "-"}{" "}
                </p>{" "}
                <p className="text-sm">
                  {" "}
                  Tahun Operasi :{" "}
                  {e.es_pabrik_tahun ? e.es_pabrik_tahun : "-"}{" "}
                </p>{" "}
                <p className="text-sm">
                  {" "}
                  Kondisi :{" "}
                  {e.es_pabrik_kondisi ? e.es_pabrik_kondisi : "-"}{" "}
                </p>
              </Popup>
            </Marker>
          ) : null
        )}

        {/* //! ice_storage */}
        {data.map((e: any, idx: number) =>
          e.es_storage > 0 ? (
            <Marker
              key={`ice_storage-${idx}`}
              position={[e.lat, e.lon]}
              icon={legend === "ice_storage" ? pinIceStorage : pinDisabled}
            >
              <Popup>
                <p className="font-bold">{e.name}</p>
                <p className="text-sm">
                  {" "}
                  Jumlah : {e.es_storage_jum_unit
                    ? e.es_storage_jum_unit
                    : "-"}{" "}
                  unit{" "}
                </p>{" "}
                <p className="text-sm">
                  {" "}
                  Kapasitas : {e.es_storage ? e.es_storage : "-"}{" "}
                </p>{" "}
                <p className="text-sm">
                  {" "}
                  Tahun Operasi :{" "}
                  {e.es_storage_tahun ? e.es_storage_tahun : "-"}{" "}
                </p>{" "}
                <p className="text-sm">
                  {" "}
                  Kondisi :{" "}
                  {e.es_storage_kondisi ? e.es_storage_kondisi : "-"}{" "}
                </p>
              </Popup>
            </Marker>
          ) : null
        )}

        {/* //! cs */}
        {data.map((e: any, idx: number) =>
          e.cs > 0 ? (
            <Marker
              key={`cs-${idx}`}
              position={[e.lat, e.lon]}
              icon={legend === "cs" ? pinCS : pinDisabled}
            >
              <Popup>
                <p className="font-bold">{e.name}</p>
                <p className="text-sm">
                  {" "}
                  Jumlah : {e.cs_jum_unit ? e.cs_jum_unit : "-"} unit{" "}
                </p>{" "}
                <p className="text-sm"> Kapasitas : {e.cs ? e.cs : "-"} </p>{" "}
                <p className="text-sm">
                  {" "}
                  Tahun Operasi : {e.cs_tahun ? e.cs_tahun : "-"}{" "}
                </p>{" "}
                <p className="text-sm">
                  {" "}
                  Kondisi : {e.cs_kondisi ? e.cs_kondisi : "-"}{" "}
                </p>
              </Popup>
            </Marker>
          ) : null
        )}

        {/* //! abf */}
        {data.map((e: any, idx: number) =>
          e.abf > 0 ? (
            <Marker
              key={`abf-${idx}`}
              position={[e.lat, e.lon]}
              icon={legend === "abf" ? pinABF : pinDisabled}
            >
              <Popup>
                <p className="font-bold">{e.name}</p>
                <p className="text-sm">
                  {" "}
                  Jumlah : {e.abf_jum_unit ? e.abf_jum_unit : "-"} unit{" "}
                </p>{" "}
                <p className="text-sm"> Kapasitas : {e.abf ? e.abf : "-"} </p>{" "}
                <p className="text-sm">
                  {" "}
                  Tahun Operasi : {e.abf_tahun ? e.abf_tahun : "-"}{" "}
                </p>{" "}
                <p className="text-sm">
                  {" "}
                  Kondisi : {e.abf_kondisi ? e.abf_kondisi : "-"}{" "}
                </p>
              </Popup>
            </Marker>
          ) : null
        )}

        {/* //! cpf */}
        {data.map((e: any, idx: number) =>
          e.cpf > 0 ? (
            <Marker
              key={`cpf-${idx}`}
              position={[e.lat, e.lon]}
              icon={legend === "cpf" ? pinCPF : pinDisabled}
            >
              <Popup>
                <p className="font-bold">{e.name}</p>
                <p className="text-sm">
                  {" "}
                  Jumlah : {e.cpf_jum_unit ? e.cpf_jum_unit : "-"} unit{" "}
                </p>{" "}
                <p className="text-sm"> Kapasitas : {e.cpf ? e.cpf : "-"} </p>{" "}
                <p className="text-sm">
                  {" "}
                  Tahun Operasi : {e.cpf_tahun ? e.cpf_tahun : "-"}{" "}
                </p>{" "}
                <p className="text-sm">
                  {" "}
                  Kondisi : {e.cpf_kondisi ? e.cpf_kondisi : "-"}{" "}
                </p>
              </Popup>
            </Marker>
          ) : null
        )}
      </MapContainer>
    </div>
  );
}
