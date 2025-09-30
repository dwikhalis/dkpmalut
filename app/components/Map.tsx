"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useEffect, useState, useRef } from "react";
import L from "leaflet";
import { getColdChain } from "@/lib/supabase/supabaseHelper";
import Image from "next/image";

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

export default function Map() {
  const mapRef = useRef<L.Map | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const center: [number, number] = [0.7213405231465007, 127.97671266232439];

  const [dataColdChain, setDataColdChain] = useState<ColdChainRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Recalculate when the container changes size (e.g., from hidden -> visible)
  useEffect(() => {
    if (!hostRef.current) return;
    const ro = new ResizeObserver(() => mapRef.current?.invalidateSize());
    ro.observe(hostRef.current);
    return () => ro.disconnect();
  }, []);

  // Fetch data — DEFINE AND CALL the async IIFE
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // depending on your helper shape, pick ONE of these:

        // 1) if helper returns rows directly:
        // const rows = await getColdChain();

        // 2) if helper returns { data, error } like supabase:
        const data = await getColdChain();

        setDataColdChain((data ?? []) as ColdChainRow[]);
      } catch (e) {
        console.error("getColdChain failed:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

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

  if (loading) {
    return (
      <div className="w-full h-[50vh] flex items-center justify-center">
        <div className="h-6 w-6 border-4 border-slate-300 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div ref={hostRef} className="flex gap-3 w-full h-[80vh]">
      <MapContainer
        ref={mapRef}
        center={center}
        zoom={7}
        scrollWheelZoom={false}
        className="w-full h-full"
        whenReady={() => {
          // defer to next tick to ensure layout settled
          setTimeout(() => mapRef.current?.invalidateSize(), 0);
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {dataColdChain.map((e: any, idx: number) => {
          return (
            <Marker
              key={idx}
              position={[e.lat, e.lon]}
              icon={e.type === "UPTD" ? pinPort : pinCompany}
            >
              <Popup>
                <p>{e.name}</p>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      <div className="w-[30%]">
        <h4 className="font-bold">Legenda</h4>
        <div className="flex flex-col mt-3 gap-3 w-full">
          <div className="flex w-full justify-start items-center gap-3">
            <Image
              src={"/assets/pin_port.png"}
              width={30}
              height={30}
              alt="pin"
            />
            <h5>Pelabuhan Perikanan</h5>
          </div>
          <div className="flex w-full justify-start items-center gap-3">
            <Image
              src={"/assets/pin_company.png"}
              width={30}
              height={30}
              alt="pin"
            />
            <h5>Perusahaan Perikanan</h5>
          </div>
          <div className="flex w-full justify-start items-center gap-3">
            <Image
              src={"/assets/pin_ice_factory.png"}
              width={30}
              height={30}
              alt="pin"
            />
            <h5>Pabrik Es</h5>
          </div>
          <div className="flex w-full justify-start items-center gap-3">
            <Image
              src={"/assets/pin_ice_storage.png"}
              width={30}
              height={30}
              alt="pin"
            />
            <h5>Penyimpanan Es</h5>
          </div>
          <div className="flex w-full justify-start items-center gap-3">
            <Image
              src={"/assets/pin_cs.png"}
              width={30}
              height={30}
              alt="pin"
            />
            <h5>Cold Storage</h5>
          </div>
          <div className="flex w-full justify-start items-center gap-3">
            <Image
              src={"/assets/pin_abf.png"}
              width={30}
              height={30}
              alt="pin"
            />
            <h5>Air Blast Freezer (ABF)</h5>
          </div>
          <div className="flex w-full justify-start items-center gap-3">
            <Image
              src={"/assets/pin_abf.png"}
              width={30}
              height={30}
              alt="pin"
            />
            <h5>Air Blast Freezer (ABF)</h5>
          </div>
          <div className="flex w-full justify-start items-center gap-3">
            <Image
              src={"/assets/pin_cpf.png"}
              width={30}
              height={30}
              alt="pin"
            />
            <h5>Contact Plate Freezer (CPF)</h5>
          </div>
        </div>
      </div>
    </div>
  );
}
