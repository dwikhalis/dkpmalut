// app/components/DashTicketScanner.tsx

"use client";

import { Html5Qrcode } from "html5-qrcode";
import type { CameraDevice } from "html5-qrcode/camera/core";
import jsQR from "jsqr";
import pica from "pica";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import SpinnerLoading from "../SpinnerLoading";
import { Picture } from "@/public/icons/iconSets";

type ScannedTicket = {
  orderId: string;
  ticketCode: string;
  customerName: string;
  customerEmail: string;
  ticketCount: number;
  visitorNames: string[];
  nationality: string;
  selectedZones: string[];
  useOwnBoat: boolean;
  boatName: string | null;
  amount: number;
  paymentStatus: string;
  scanned: string;
  paidAt: string | null;
  expiresAt: string | null;
};

type ScanResult = {
  ticketStatus: "Active" | "Expired" | "Unpaid" | "Already Scanned";
  ticket: ScannedTicket;
};

type ScanMode = "idle" | "camera" | "image";

const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);
const SUPPORTED_IMAGE_EXTENSIONS = /\.(?:jpe?g|png)$/i;
const imageResizer = pica({ features: ["js"] });

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

function pickBackCamera(cameras: CameraDevice[]) {
  const backCamera = cameras.find((camera) =>
    /back|rear|environment|belakang/i.test(camera.label),
  );

  return backCamera ?? cameras[cameras.length - 1] ?? null;
}

function waitForScannerViewport() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function getCameraErrorMessage(error: unknown) {
  const name =
    error instanceof DOMException || error instanceof Error ? error.name : "";
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const normalizedError = `${name} ${rawMessage}`.toLowerCase();

  if (!window.isSecureContext) {
    return "Kamera hanya dapat digunakan melalui HTTPS atau localhost.";
  }

  if (
    normalizedError.includes("notallowed") ||
    normalizedError.includes("permission") ||
    normalizedError.includes("denied")
  ) {
    return "Izin kamera ditolak. Izinkan akses kamera pada pengaturan browser, lalu coba lagi.";
  }

  if (
    normalizedError.includes("notfound") ||
    normalizedError.includes("devicesnotfound") ||
    normalizedError.includes("no camera")
  ) {
    return "Kamera tidak ditemukan pada perangkat ini.";
  }

  if (
    normalizedError.includes("notreadable") ||
    normalizedError.includes("trackstart") ||
    normalizedError.includes("could not start video source")
  ) {
    return "Kamera sedang digunakan aplikasi lain atau tidak dapat dibuka.";
  }

  if (
    normalizedError.includes("overconstrained") ||
    normalizedError.includes("constraint")
  ) {
    return "Kamera tidak mendukung konfigurasi yang diminta. Pilih kamera lain.";
  }

  return rawMessage
    ? `Kamera tidak dapat digunakan: ${rawMessage}`
    : "Kamera tidak dapat digunakan. Periksa izin kamera pada browser.";
}

async function detectWithNativeBarcodeDetector(file: File) {
  type DetectedBarcode = { rawValue?: string };
  type BarcodeDetectorInstance = {
    detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
  };
  type BarcodeDetectorConstructor = new (options: {
    formats: string[];
  }) => BarcodeDetectorInstance;

  const BarcodeDetector = (
    window as typeof window & {
      BarcodeDetector?: BarcodeDetectorConstructor;
    }
  ).BarcodeDetector;

  if (!BarcodeDetector) return null;

  const bitmap = await createImageBitmap(file);

  try {
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    const barcodes = await detector.detect(bitmap);
    return barcodes.find((barcode) => barcode.rawValue)?.rawValue ?? null;
  } catch {
    return null;
  } finally {
    bitmap.close();
  }
}

function detectWithJsQr(
  canvas: HTMLCanvasElement,
  inversionAttempts: "dontInvert" | "attemptBoth" = "dontInvert",
) {
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context || canvas.width === 0 || canvas.height === 0) return null;

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  return (
    jsQR(image.data, image.width, image.height, {
      inversionAttempts,
    })?.data ?? null
  );
}

function boxDownsample(
  source: ImageData,
  sourceX: number,
  sourceY: number,
  sourceWidth: number,
  sourceHeight: number,
  maxDimension: number,
) {
  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const output = new ImageData(width, height);

  for (let outputY = 0; outputY < height; outputY += 1) {
    const inputYStart = sourceY + Math.floor((outputY * sourceHeight) / height);
    const inputYEnd =
      sourceY +
      Math.max(
        Math.floor(((outputY + 1) * sourceHeight) / height),
        Math.floor((outputY * sourceHeight) / height) + 1,
      );

    for (let outputX = 0; outputX < width; outputX += 1) {
      const inputXStart = sourceX + Math.floor((outputX * sourceWidth) / width);
      const inputXEnd =
        sourceX +
        Math.max(
          Math.floor(((outputX + 1) * sourceWidth) / width),
          Math.floor((outputX * sourceWidth) / width) + 1,
        );
      let luminance = 0;
      let samples = 0;

      for (let inputY = inputYStart; inputY < inputYEnd; inputY += 1) {
        for (let inputX = inputXStart; inputX < inputXEnd; inputX += 1) {
          const inputOffset = (inputY * source.width + inputX) * 4;
          luminance +=
            source.data[inputOffset] * 0.299 +
            source.data[inputOffset + 1] * 0.587 +
            source.data[inputOffset + 2] * 0.114;
          samples += 1;
        }
      }

      const value = Math.round(luminance / samples);
      const outputOffset = (outputY * width + outputX) * 4;
      output.data[outputOffset] = value;
      output.data[outputOffset + 1] = value;
      output.data[outputOffset + 2] = value;
      output.data[outputOffset + 3] = 255;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas
    .getContext("2d", { willReadFrequently: true })
    ?.putImageData(output, 0, 0);
  return canvas;
}

async function detectPhotoWithJsQr(file: File) {
  const bitmap = await createImageBitmap(file);

  try {
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = bitmap.width;
    sourceCanvas.height = bitmap.height;
    const sourceContext = sourceCanvas.getContext("2d", {
      willReadFrequently: true,
    });

    if (!sourceContext) return null;

    sourceContext.drawImage(bitmap, 0, 0);
    const sourceImage = sourceContext.getImageData(
      0,
      0,
      sourceCanvas.width,
      sourceCanvas.height,
    );

    // Use a deterministic high-quality convolution resize before the browser
    // canvas and manual fallbacks. Mobile canvas implementations vary, and
    // some preserve the display-pixel moire visible in photographed QR codes.
    for (const maxDimension of [800, 600, 1000]) {
      const scale = Math.min(
        1,
        maxDimension / Math.max(sourceCanvas.width, sourceCanvas.height),
      );
      const resizedCanvas = document.createElement("canvas");
      resizedCanvas.width = Math.max(1, Math.round(sourceCanvas.width * scale));
      resizedCanvas.height = Math.max(
        1,
        Math.round(sourceCanvas.height * scale),
      );

      await imageResizer.resize(sourceCanvas, resizedCanvas, {
        filter: "mks2013",
      });

      const resizedResult = detectWithJsQr(resizedCanvas);
      if (resizedResult) return resizedResult;

      const enhancedCanvas = document.createElement("canvas");
      enhancedCanvas.width = resizedCanvas.width;
      enhancedCanvas.height = resizedCanvas.height;
      const enhancedContext = enhancedCanvas.getContext("2d", {
        willReadFrequently: true,
      });

      if (enhancedContext) {
        enhancedContext.filter = "grayscale(1) contrast(1.5) brightness(1.04)";
        enhancedContext.drawImage(resizedCanvas, 0, 0);
        const enhancedResult = detectWithJsQr(enhancedCanvas);
        if (enhancedResult) return enhancedResult;
      }
    }

    // Do this before any browser-scaled attempt. Explicitly averaging source
    // pixels removes the monitor/phone pixel grid that remains visible in a
    // photographed QR and caused the supplied photos to fail in mobile canvas.
    for (const maxDimension of [800, 600]) {
      const averaged = boxDownsample(
        sourceImage,
        0,
        0,
        sourceImage.width,
        sourceImage.height,
        maxDimension,
      );
      const averagedResult = detectWithJsQr(averaged);
      if (averagedResult) return averagedResult;
    }

    // Full image first, followed by overlapping regions. A document photo can
    // place the QR anywhere in the frame, while each region enlarges a small
    // code without asking the decoder to process a multi-megapixel photo.
    const regions = [
      // Downsizing first is intentional: it averages out the display-pixel
      // moiré visible when a QR is photographed from another phone or monitor.
      { x: 0, y: 0, width: 1, height: 1, maxDimension: 800 },
      { x: 0, y: 0, width: 1, height: 1, maxDimension: 600 },
      { x: 0, y: 0, width: 1, height: 1, maxDimension: 1000 },
      { x: 0.125, y: 0.125, width: 0.75, height: 0.75, maxDimension: 800 },
      { x: 0.25, y: 0.25, width: 0.5, height: 0.5, maxDimension: 800 },
      { x: 0, y: 0, width: 0.65, height: 0.65, maxDimension: 800 },
      { x: 0.35, y: 0, width: 0.65, height: 0.65, maxDimension: 800 },
      { x: 0, y: 0.35, width: 0.65, height: 0.65, maxDimension: 800 },
      { x: 0.35, y: 0.35, width: 0.65, height: 0.65, maxDimension: 800 },
    ];

    for (const region of regions) {
      const sourceX = Math.round(bitmap.width * region.x);
      const sourceY = Math.round(bitmap.height * region.y);
      const sourceWidth = Math.round(bitmap.width * region.width);
      const sourceHeight = Math.round(bitmap.height * region.height);
      const scale = Math.min(
        1,
        region.maxDimension / Math.max(sourceWidth, sourceHeight),
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));
      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (!context) continue;

      context.drawImage(
        bitmap,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      const rawResult = detectWithJsQr(canvas);
      if (rawResult) return rawResult;

      // Camera photos commonly need stronger edge separation because of
      // shadows, screen glare, paper texture, or slight defocus.
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.filter = "grayscale(1) contrast(1.8) brightness(1.05)";
      context.drawImage(
        bitmap,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      const enhancedResult = detectWithJsQr(canvas);
      if (enhancedResult) return enhancedResult;
    }

    return null;
  } finally {
    bitmap.close();
  }
}

async function activateScannerVideo(video: HTMLVideoElement) {
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("autoplay", "");
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");

  try {
    await video.play();
  } catch {
    throw new Error(
      "Video kamera tidak dapat diputar. Sentuh halaman lalu coba kembali.",
    );
  }

  const startedAt = performance.now();

  while (video.videoWidth === 0 || video.videoHeight === 0) {
    if (performance.now() - startedAt > 3000) {
      throw new Error(
        "Kamera diizinkan tetapi tidak mengirim gambar. Tutup aplikasi lain yang memakai kamera lalu coba kembali.",
      );
    }

    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
  }
}

export default function DashTicketScanner() {
  const router = useRouter();
  const imageScannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraScanTimerRef = useRef<number | null>(null);
  const cameraGenerationRef = useRef(0);
  const processingRef = useRef(false);

  const [result, setResult] = useState<ScanResult | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<ScanMode>("idle");
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [startingCamera, setStartingCamera] = useState(false);
  const [scanningImage, setScanningImage] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [submittingManual, setSubmittingManual] = useState(false);
  const [openSubmitManual, setOpenSubmitManual] = useState(false);

  const stopScanner = async (
    scannerRef: React.MutableRefObject<Html5Qrcode | null>,
  ) => {
    const scanner = scannerRef.current;

    if (!scanner) return;

    // Detach the instance first so a camera/image mode change can never reuse
    // an Html5Qrcode object whose internal state is still transitioning.
    scannerRef.current = null;

    try {
      if (scanner.isScanning) await scanner.stop();
    } catch {
      // The stream may already have been released by the browser.
    } finally {
      // Html5Qrcode.clear() can throw from a stale internal state even after
      // stop() resolves. React owns these containers, so reset their children
      // directly after the media stream has been stopped.
      const element = document.getElementById("ticket-image-scanner");
      const video = element?.querySelector("video");
      const stream = video?.srcObject;

      if (stream instanceof MediaStream) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
      }

      if (video) {
        video.srcObject = null;
      }

      element?.replaceChildren();
    }
  };

  const stopCamera = () => {
    cameraGenerationRef.current += 1;

    if (cameraScanTimerRef.current !== null) {
      window.clearTimeout(cameraScanTimerRef.current);
      cameraScanTimerRef.current = null;
    }

    for (const track of cameraStreamRef.current?.getTracks() ?? []) {
      track.stop();
    }

    cameraStreamRef.current = null;

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  };

  const stopAllScanners = async () => {
    stopCamera();
    await Promise.all([stopScanner(imageScannerRef)]);
  };

  const scanTicket = async (
    credential: string,
    method: "qr" | "manual" = "qr",
  ) => {
    if (processingRef.current) return;

    processingRef.current = true;

    try {
      setMsg(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Admin login required");
      }

      const response = await fetch("/api/tickets/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ credential, method }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to scan ticket");
      }

      setResult(data);
      setMode("idle");

      await stopAllScanners();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected error";

      setMsg(message);
    } finally {
      processingRef.current = false;
    }
  };

  const handleManualValidation = async () => {
    if (!manualCode.trim()) {
      setMsg("Masukkan Ticket Code dengan format MALUT-XXXX-XXXX.");
      return;
    }

    setSubmittingManual(true);
    try {
      await scanTicket(manualCode, "manual");
    } finally {
      setSubmittingManual(false);
    }
  };

  const ensureImageScanner = () => {
    if (!imageScannerRef.current) {
      imageScannerRef.current = new Html5Qrcode("ticket-image-scanner", {
        verbose: false,
      });
    }

    return imageScannerRef.current;
  };

  const scanCameraFrame = async (generation: number) => {
    if (
      generation !== cameraGenerationRef.current ||
      !cameraStreamRef.current ||
      processingRef.current
    ) {
      return;
    }

    const video = videoRef.current;
    let decodedText: string | null = null;

    if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const canvas = document.createElement("canvas");
      const sourceWidth = Math.round(video.videoWidth * 0.72);
      const sourceHeight = Math.round(video.videoHeight * 0.72);
      const sourceX = Math.round((video.videoWidth - sourceWidth) / 2);
      const sourceY = Math.round((video.videoHeight - sourceHeight) / 2);
      const scale = Math.min(1, 800 / Math.max(sourceWidth, sourceHeight));
      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));
      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (context && canvas.width > 0 && canvas.height > 0) {
        context.drawImage(
          video,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          canvas.width,
          canvas.height,
        );
        decodedText = detectWithJsQr(canvas);
      }
    }

    if (generation !== cameraGenerationRef.current) return;

    if (decodedText) {
      await scanTicket(decodedText);
      return;
    }

    if (generation === cameraGenerationRef.current) {
      cameraScanTimerRef.current = window.setTimeout(
        () => void scanCameraFrame(generation),
        100,
      );
    }
  };

  const startCamera = async (cameraId?: string) => {
    try {
      setStartingCamera(true);
      setMsg(null);
      setResult(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Browser ini tidak mendukung akses kamera. Gunakan Chrome, Edge, atau Safari versi terbaru.",
        );
      }

      stopCamera();
      await stopScanner(imageScannerRef);

      setMode("camera");
      await waitForScannerViewport();
      const video = videoRef.current;

      if (!video) throw new Error("Tampilan video kamera tidak tersedia.");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: cameraId
          ? { deviceId: { exact: cameraId } }
          : {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
      });

      cameraStreamRef.current = stream;
      video.srcObject = stream;
      await activateScannerVideo(video);

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter((device) => device.kind === "videoinput")
        .map((device) => ({
          id: device.deviceId,
          label: device.label,
        }));

      setCameras(videoDevices);

      const activeCamera =
        videoDevices.find((camera) => camera.id === cameraId) ??
        pickBackCamera(videoDevices);

      if (activeCamera) {
        setSelectedCameraId(activeCamera.id);
      }

      const generation = cameraGenerationRef.current;
      void scanCameraFrame(generation);
    } catch (error) {
      setMsg(getCameraErrorMessage(error));
      setMode("idle");
    } finally {
      setStartingCamera(false);
    }
  };

  const handleCameraChange = (cameraId: string) => {
    setSelectedCameraId(cameraId);
    void startCamera(cameraId);
  };

  const handleImageFile = async (file?: File) => {
    if (!file) return;

    try {
      if (
        !SUPPORTED_IMAGE_TYPES.has(file.type.toLowerCase()) &&
        !SUPPORTED_IMAGE_EXTENSIONS.test(file.name)
      ) {
        throw new Error("Pilih gambar dengan format JPG, JPEG, atau PNG.");
      }

      setScanningImage(true);
      setMsg(null);
      setResult(null);

      stopCamera();
      await stopScanner(imageScannerRef);
      setMode("image");
      await waitForScannerViewport();

      let decodedText =
        (await detectWithNativeBarcodeDetector(file)) ??
        (await detectPhotoWithJsQr(file));

      if (!decodedText) {
        try {
          decodedText = await ensureImageScanner().scanFile(file, false);
        } catch {
          // The pixel decoder already tried enhanced and enlarged regions.
        }
      }

      if (!decodedText) {
        throw new Error(
          "QR tidak ditemukan. Pastikan kode berada di tengah foto, terlihat utuh, tajam, dan tidak terkena pantulan cahaya.",
        );
      }

      await scanTicket(decodedText);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "QR tidak ditemukan pada gambar.";

      setMsg(message);
      setMode("idle");
    } finally {
      setScanningImage(false);
    }
  };

  useEffect(() => {
    return () => {
      const scanners = [imageScannerRef.current].filter(
        (scanner): scanner is Html5Qrcode => scanner !== null,
      );

      stopCamera();

      for (const scanner of scanners) {
        if (scanner.isScanning) {
          void scanner.stop().catch(() => {});
        }
      }
    };
  }, []);

  const restartScanner = () => {
    setResult(null);
    setMsg(null);
    setMode("idle");
  };

  const handleClose = async () => {
    await stopAllScanners();

    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/profile");
  };

  if (result) {
    return (
      <section className="relative flex min-h-[100dvh] w-full items-center justify-center bg-stone-100 p-4">
        <button
          type="button"
          onClick={() => void handleClose()}
          aria-label="Tutup pemindai"
          className="fixed right-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl font-bold leading-none text-stone-900 shadow-xl ring-1 ring-stone-200 transition hover:bg-sky-50"
        >
          ×
        </button>

        <div className="w-full max-w-3xl rounded-2xl border border-stone-200 bg-stone-50 p-6 shadow-xl">
          <p
            className={`rounded-xl bg-white py-4 text-center text-3xl font-bold shadow-sm ${
              result.ticketStatus === "Active"
                ? "text-green-700"
                : "text-red-700"
            }`}
          >
            {result.ticketStatus}
          </p>

          <div className="mt-6 grid gap-3 rounded-xl bg-white p-4 text-sm text-stone-700 shadow-sm">
            <p>
              <span className="font-medium">Order ID:</span>{" "}
              {result.ticket.orderId}
            </p>

            <p>
              <span className="font-medium">Ticket Code:</span>{" "}
              {result.ticket.ticketCode}
            </p>

            <p>
              <span className="font-medium">Customer:</span>{" "}
              {result.ticket.customerName}
            </p>

            <p>
              <span className="font-medium">Email:</span>{" "}
              {result.ticket.customerEmail}
            </p>

            <p>
              <span className="font-medium">Visitors:</span>{" "}
              {result.ticket.ticketCount}
            </p>

            <p>
              <span className="font-medium">Visitor Names:</span>{" "}
              {result.ticket.visitorNames?.join(", ")}
            </p>

            <p>
              <span className="font-medium">Nationality:</span>{" "}
              {result.ticket.nationality}
            </p>

            <p>
              <span className="font-medium">Zones:</span>{" "}
              {result.ticket.selectedZones?.join(", ")}
            </p>

            <p>
              <span className="font-medium">Own Boat:</span>{" "}
              {result.ticket.useOwnBoat ? "Yes" : "No"}
            </p>

            {result.ticket.useOwnBoat && (
              <p>
                <span className="font-medium">Boat Name:</span>{" "}
                {result.ticket.boatName}
              </p>
            )}

            <p>
              <span className="font-medium">Payment:</span>{" "}
              {result.ticket.paymentStatus}
            </p>

            <p>
              <span className="font-medium">Total:</span>{" "}
              {formatRupiah(result.ticket.amount)}
            </p>

            <p>
              <span className="font-medium">Paid At:</span>{" "}
              {formatDate(result.ticket.paidAt)}
            </p>

            <p>
              <span className="font-medium">Expires At:</span>{" "}
              {formatDate(result.ticket.expiresAt)}
            </p>

            <p>
              <span className="font-medium">Scan Status:</span>{" "}
              {result.ticket.scanned}
            </p>
          </div>

          <button
            type="button"
            onClick={restartScanner}
            className="mt-6 w-full rounded-xl bg-sky-800 px-5 py-4 font-bold text-white transition hover:bg-sky-900"
          >
            Pindai Tiket Lain
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-[100dvh] w-full flex-col bg-stone-950 text-white">
      <button
        type="button"
        onClick={() => void handleClose()}
        aria-label="Tutup pemindai"
        className="fixed right-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-2xl font-bold leading-none text-stone-900 shadow-xl ring-1 ring-white/30 transition hover:bg-sky-50"
      >
        ×
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(event) => {
          void handleImageFile(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />

      <div className="relative flex min-h-0 flex-1 items-center justify-center p-5">
        <video
          ref={videoRef}
          className={`absolute inset-0 z-[1] overflow-hidden bg-stone-950 ${
            mode === "camera" ? "block" : "hidden"
          } h-full w-full object-cover`}
          muted
          playsInline
          aria-label="Pratinjau kamera pemindai QR"
        />

        <div
          id="ticket-image-scanner"
          className={`absolute inset-0 z-[1] overflow-hidden bg-stone-950 ${
            mode === "image" ? "block" : "hidden"
          } [&_img]:h-full [&_img]:w-full [&_img]:object-contain`}
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />

        <div className="relative z-10 flex h-full w-full items-center justify-center">
          <div className="flex aspect-square w-[min(76vw,76vh)] items-center justify-center rounded-3xl border-8 border-dashed border-white/90 bg-black/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.22)]">
            <p className="max-w-52 text-center text-sm font-semibold text-white/80">
              {mode === "image"
                ? "Memproses gambar QR..."
                : "Arahkan QR tiket ke area ini"}
            </p>
          </div>
        </div>

        {msg && (
          <p className="absolute left-5 right-5 top-5 z-20 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700 shadow-lg">
            {msg}
          </p>
        )}
      </div>

      <div className="absolute bottom-0 w-full z-20 space-y-3 bg-stone-950/95 p-5 shadow-2xl">
        {mode === "camera" && cameras.length > 1 && (
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-stone-300">
              Kamera
            </span>

            <select
              value={selectedCameraId}
              onChange={(event) => handleCameraChange(event.target.value)}
              disabled={startingCamera}
              className="w-full rounded-xl border border-stone-500 bg-white px-4 py-3 text-sm font-medium text-stone-900 outline-none focus:ring-2 focus:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cameras.map((camera, index) => (
                <option key={camera.id} value={camera.id}>
                  {camera.label || `Kamera ${index + 1}`}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="relative h-12 flex gap-3">
          <button
            type="button"
            onClick={() => void startCamera(selectedCameraId || undefined)}
            disabled={startingCamera || scanningImage}
            className="rounded-2xl bg-sky-800 p-3 text-base font-bold text-white shadow-xl transition hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-60 grow"
          >
            {startingCamera ? "Membuka Kamera..." : "Ijinkan  Kamera"}
          </button>

          <button
            type="button"
            onClick={() => setOpenSubmitManual(!openSubmitManual)}
            disabled={startingCamera || scanningImage}
            className={`flex justify-center items-center rounded-2xl border-2 border-white text-base font-bold shadow-xl transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 w-[50] ${openSubmitManual ? "text-black bg-white" : "text-white bg-black"}`}
          >
            ABC
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={startingCamera || scanningImage}
            className="flex justify-center items-center rounded-2xl border-2 border-white text-base font-bold text-sky-900 shadow-xl transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 w-[50]"
          >
            {scanningImage ? (
              <SpinnerLoading size="sm" color="white" />
            ) : (
              <Picture className="size-5 text-white" />
            )}
          </button>
        </div>

        {/* //! SUBMIT MANUAL */}
        {openSubmitManual && (
          <form
            className="border-t border-stone-700 pt-3"
            onSubmit={(event) => {
              event.preventDefault();
              void handleManualValidation();
            }}
          >
            <label
              htmlFor="manual-ticket-code"
              className="mb-2 block text-sm font-bold"
            >
              Validasi Manual
            </label>
            <div className="flex gap-2">
              <input
                id="manual-ticket-code"
                value={manualCode}
                onChange={(event) =>
                  setManualCode(event.target.value.toUpperCase())
                }
                placeholder="MALUT-XXXX-XXXX"
                autoComplete="off"
                className="min-w-0 flex-1 rounded-xl border border-stone-500 bg-white px-4 py-3 font-mono text-sm font-bold uppercase tracking-wide text-stone-900 outline-none focus:ring-2 focus:ring-sky-400"
              />
              <button
                type="submit"
                disabled={submittingManual || scanningImage || startingCamera}
                className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-60"
              >
                {submittingManual ? "Memeriksa..." : "Validasi"}
              </button>
            </div>
            <p className="mt-2 text-xs text-stone-400">
              Masukkan Ticket Code. Token QR tidak dapat digunakan untuk
              pencarian manual.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
