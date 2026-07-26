"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FaCheck,
  FaCreditCard,
  FaFilePdf,
  FaMapMarkerAlt,
  FaTrash,
  FaUpload,
  FaUser,
  FaUsers,
} from "react-icons/fa";

import { supabase } from "@/lib/supabase/supabaseClient";
import {
  useTicketStore,
  type IdentityType,
  type OperatorType,
  type SelectedConservationArea,
  type TicketFormData,
  type VisitorGender,
} from "@/app/Stores/ticketCheckoutStore";
import { countryList } from "./configCountryList";
import { normalizeSearch } from "@/lib/utils/normalizeSearch";
import {
  calculateTicketCharges,
  type TicketCharge,
} from "@/lib/tickets/charges";
import AccordionToggleIcon from "./AccordionToggleIcon";
import AlertNotif from "./AlertNotif";
import { useRateLimitCountdown } from "@/app/hooks/useRateLimitCountdown";

const FALLBACK_AREAS: SelectedConservationArea[] = [
  {
    id: "kepulauan-widi",
    slug: "kepulauan-widi",
    name: "TPK Kepulauan Widi",
    imagePath: null,
    ticketPrice: 50_000,
  },
  {
    id: "makian-moti",
    slug: "makian-moti",
    name: "TWP Pulau Makian dan Pulau Moti",
    imagePath: null,
    ticketPrice: 50_000,
  },
  {
    id: "kepulauan-guraici",
    slug: "kepulauan-guraici",
    name: "TPK Kepulauan Guraici",
    imagePath: null,
    ticketPrice: 50_000,
  },
  {
    id: "pulau-mare",
    slug: "pulau-mare",
    name: "TWP Pulau Mare",
    imagePath: null,
    ticketPrice: 50_000,
  },
  {
    id: "rao-tanjung-dehegila",
    slug: "rao-tanjung-dehegila",
    name: "TWP Pulau Rao - Tanjung Dehegila (Morotai)",
    imagePath: null,
    ticketPrice: 50_000,
  },
  {
    id: "sula",
    slug: "sula",
    name: "TPK Sula",
    imagePath: null,
    ticketPrice: 50_000,
  },
];

type ConservationAreaRow = {
  id: string;
  slug: string;
  name: string;
  image_path: string | null;
  ticket_price: number;
};

type PermitDocument = {
  name: string;
  path: string;
  size: number;
  previewUrl: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function clampStep(value: number) {
  return Math.min(Math.max(value, 1), 4);
}

export default function TicketFormAdmin() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeCountryDropdown, setActiveCountryDropdown] = useState<
    number | null
  >(null);
  const [openVisitorIndex, setOpenVisitorIndex] = useState<number | null>(0);

  const currentStep = useTicketStore((state) => state.currentStep);
  const formData = useTicketStore((state) => state.formData);

  const bookingId = useTicketStore((state) => state.bookingId);

  const setCurrentStep = useTicketStore((state) => state.setCurrentStep);
  const setFormData = useTicketStore((state) => state.setFormData);
  const setVisitorCount = useTicketStore((state) => state.setVisitorCount);
  const updateVisitor = useTicketStore((state) => state.updateVisitor);
  const toggleSelectedArea = useTicketStore(
    (state) => state.toggleSelectedArea,
  );

  const setBookingId = useTicketStore((state) => state.setBookingId);
  const resetPaymentData = useTicketStore((state) => state.resetPaymentData);

  const [areas, setAreas] =
    useState<SelectedConservationArea[]>(FALLBACK_AREAS);

  const [areasLoading, setAreasLoading] = useState(true);
  const [charges, setCharges] = useState<TicketCharge[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { captureRateLimit, rateLimitMessage } = useRateLimitCountdown();
  const [preparingPayment, setPreparingPayment] = useState(false);
  const [visitorCountInput, setVisitorCountInput] = useState(() =>
    String(formData.visitorCount),
  );
  const [visitingPurpose, setVisitingPurpose] = useState("research");
  const [permitDocuments, setPermitDocuments] = useState<PermitDocument[]>([]);
  const [uploadingPermits, setUploadingPermits] = useState(false);
  const [draggingPermits, setDraggingPermits] = useState(false);
  const [deletingPermitPath, setDeletingPermitPath] = useState<string | null>(
    null,
  );
  const [paymentLinkUrl, setPaymentLinkUrl] = useState<string | null>(null);
  const [documentAlert, setDocumentAlert] = useState<{
    message: string;
    icon: "warning" | "failed" | "success";
  } | null>(null);
  const [permitPendingDeletion, setPermitPendingDeletion] =
    useState<PermitDocument | null>(null);

  useEffect(() => {
    const urlStep = Number(searchParams.get("step") || 1);
    const safeStep = clampStep(Number.isFinite(urlStep) ? urlStep : 1);

    if (safeStep !== currentStep) {
      setCurrentStep(safeStep);
    }
  }, [searchParams, currentStep, setCurrentStep]);

  useEffect(() => {
    if (!formData.purchaseType) {
      setFormData({ purchaseType: "individual" });
    }
  }, [formData.purchaseType, setFormData]);

  useEffect(() => {
    setVisitorCountInput(String(formData.visitorCount));
  }, [formData.visitorCount]);

  /*
   * Load conservation areas.
   * FALLBACK_AREAS remain available if the request fails.
   */
  useEffect(() => {
    let mounted = true;

    const loadAreas = async () => {
      setAreasLoading(true);

      const [areaResult, chargeResult] = await Promise.all([
        supabase
          .from("conservation_areas")
          .select("id, slug, name, image_path, ticket_price")
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
        supabase
          .from("ticket_charge_items")
          .select("id, name, calculation_type, value, applies_to")
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
      ]);
      const { data, error } = areaResult;

      if (!mounted) return;

      if (error) {
        console.error("Failed to load conservation areas:", error);

        setAreas(FALLBACK_AREAS);
        setAreasLoading(false);
        return;
      }

      const rows = (data as ConservationAreaRow[] | null) || [];

      if (rows.length > 0) {
        setAreas(
          rows.map((area) => ({
            id: area.id,
            slug: area.slug,
            name: area.name,
            imagePath: area.image_path,
            ticketPrice: area.ticket_price,
          })),
        );
      } else {
        setAreas(FALLBACK_AREAS);
      }

      setAreasLoading(false);
      if (!chargeResult.error)
        setCharges((chargeResult.data as TicketCharge[] | null) ?? []);
    };

    void loadAreas();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * LOB always means the operator is bringing a boat.
   */
  useEffect(() => {
    if (formData.operatorType === "lob" && !formData.bringsBoat) {
      setFormData({
        bringsBoat: true,
      });
    }
  }, [formData.operatorType, formData.bringsBoat, setFormData]);

  const effectiveBuyerEmail = formData.usesOperator
    ? formData.operatorEmail.trim().toLowerCase()
    : formData.buyerEmail.trim().toLowerCase();

  const pricePerVisitor = useMemo(() => {
    return formData.selectedAreas.reduce(
      (total, area) => total + area.ticketPrice,
      0,
    );
  }, [formData.selectedAreas]);

  const subtotal = formData.visitorCount * pricePerVisitor;

  const calculatedCharges = useMemo(
    () => calculateTicketCharges(charges, subtotal, formData.visitorCount),
    [charges, subtotal, formData.visitorCount],
  );
  const additionalAmount = calculatedCharges.reduce(
    (total, charge) => total + charge.amount,
    0,
  );
  const totalAmount = subtotal + additionalAmount;

  const purchaseDate = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
  }).format(new Date());

  /*
   * Use this for normal form-data changes.
   * Existing prepared payment data is invalidated.
   */
  const updateFormData = (updates: Partial<TicketFormData>) => {
    resetPaymentData();
    setFormData(updates);
  };

  const getAdminAccessToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Admin login required.");
    return session.access_token;
  };

  const uploadPermitDocuments = async (files: File[]) => {
    if (files.length === 0) return;
    if (permitDocuments.length + files.length > 10) {
      setDocumentAlert({
        message: "Maksimal 10 dokumen izin.",
        icon: "warning",
      });
      return;
    }

    const invalid = files.find(
      (file) =>
        file.type !== "application/pdf" ||
        !file.name.toLowerCase().endsWith(".pdf") ||
        file.size > 10 * 1024 * 1024,
    );
    if (invalid) {
      setDocumentAlert({
        message: `${invalid.name} harus berupa PDF dengan ukuran maksimal 10 MB.`,
        icon: "warning",
      });
      return;
    }

    setUploadingPermits(true);
    setErrorMsg(null);
    try {
      const accessToken = await getAdminAccessToken();
      const uploadData = new FormData();
      files.forEach((file) => uploadData.append("files", file));
      const response = await fetch("/api/tickets/permit-documents", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: uploadData,
      });
      const result = (await response.json()) as {
        documents?: PermitDocument[];
        message?: string;
      };
      if (!response.ok || !result.documents) {
        throw new Error(result.message || "Dokumen gagal diunggah.");
      }
      setPermitDocuments((current) => [...current, ...result.documents!]);
      resetPaymentData();
      setPaymentLinkUrl(null);
    } catch (error) {
      setDocumentAlert({
        message:
          error instanceof Error ? error.message : "Dokumen gagal diunggah.",
        icon: "failed",
      });
    } finally {
      setUploadingPermits(false);
    }
  };

  const openPermitDocument = async (document: PermitDocument) => {
    const previewWindow = window.open("", "_blank");

    try {
      if (!previewWindow) {
        throw new Error(
          "Browser memblokir jendela dokumen. Izinkan pop-up lalu coba kembali.",
        );
      }
      previewWindow.opener = null;
      const accessToken = await getAdminAccessToken();
      const response = await fetch(
        `/api/tickets/permit-documents?path=${encodeURIComponent(document.path)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const result = (await response.json()) as {
        url?: string;
        message?: string;
      };
      if (!response.ok || !result.url) {
        throw new Error(result.message || "Dokumen tidak dapat dibuka.");
      }
      previewWindow.location.href = result.url;
    } catch (error) {
      previewWindow?.close();
      setDocumentAlert({
        message:
          error instanceof Error
            ? error.message
            : "Dokumen tidak dapat dibuka.",
        icon: "failed",
      });
    }
  };

  const deletePermitDocument = async (document: PermitDocument) => {
    setDeletingPermitPath(document.path);
    setErrorMsg(null);
    try {
      const accessToken = await getAdminAccessToken();
      const response = await fetch("/api/tickets/permit-documents", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path: document.path }),
      });
      const result = (await response.json()) as {
        deleted?: boolean;
        message?: string;
      };
      if (!response.ok || result.deleted !== true) {
        throw new Error(result.message || "Dokumen gagal dihapus.");
      }
      setPermitDocuments((current) =>
        current.filter((item) => item.path !== document.path),
      );
      resetPaymentData();
      setPaymentLinkUrl(null);
      setDocumentAlert({
        message: "Dokumen izin berhasil dihapus.",
        icon: "success",
      });
    } catch (error) {
      setDocumentAlert({
        message:
          error instanceof Error ? error.message : "Dokumen gagal dihapus.",
        icon: "failed",
      });
    } finally {
      setDeletingPermitPath(null);
    }
  };

  const changeStep = (step: number) => {
    const safeStep = clampStep(step);
    setErrorMsg(null);
    setCurrentStep(safeStep);

    router.replace(`/admin/tickets/generator?step=${safeStep}`, {
      scroll: true,
    });
  };

  const validateStepOne = () => {
    if (!visitingPurpose) {
      return "Pilih tujuan kunjungan.";
    }

    if (visitingPurpose !== "tourism" && permitDocuments.length === 0) {
      return "Unggah minimal satu dokumen izin untuk kunjungan nonwisata.";
    }

    if (!formData.purchaseType) {
      return "Pilih jenis pembelian tiket.";
    }

    if (formData.visitorCount < 1) {
      return "Jumlah pengunjung minimal 1 orang.";
    }

    if (!formData.buyerName.trim()) {
      return "Nama pemesan wajib diisi.";
    }

    if (formData.usesOperator) {
      if (!formData.operatorName.trim()) {
        return "Nama operator wajib diisi.";
      }

      if (!isValidEmail(formData.operatorEmail)) {
        return "Email operator tidak valid.";
      }

      if (!formData.operatorType) {
        return "Pilih tipe operator.";
      }

      if (
        formData.operatorType === "other" &&
        !formData.operatorTypeOther.trim()
      ) {
        return "Tipe operator lainnya wajib diisi.";
      }
    } else if (!isValidEmail(formData.buyerEmail)) {
      return "Email pemesan tidak valid.";
    }

    if (formData.bringsBoat && !formData.boatName.trim()) {
      return "Nama kapal wajib diisi.";
    }

    return null;
  };

  const validateStepTwo = () => {
    const incompleteVisitorIndex = formData.visitors.findIndex(
      (visitor) =>
        !visitor.visitorName.trim() ||
        !visitor.country.trim() ||
        !visitor.gender ||
        !visitor.identityType ||
        !visitor.identityNumber.trim(),
    );

    if (incompleteVisitorIndex !== -1) {
      return `Data Pengunjung ${incompleteVisitorIndex + 1} belum lengkap.`;
    }

    return null;
  };

  const validateStepThree = () => {
    if (formData.selectedAreas.length === 0) {
      return "Pilih minimal satu kawasan konservasi.";
    }

    return null;
  };

  const handleNextFromStepOne = () => {
    const validationError = validateStepOne();

    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    changeStep(2);
  };

  const handleNextFromStepTwo = () => {
    const validationError = validateStepTwo();

    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    changeStep(3);
  };

  const handleNextFromStepThree = () => {
    const validationError = validateStepThree();

    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    changeStep(4);
  };

  const handlePreparePayment = async () => {
    setPreparingPayment(true);
    setErrorMsg(null);

    try {
      const stepOneError = validateStepOne();
      const stepTwoError = validateStepTwo();
      const stepThreeError = validateStepThree();

      const validationError = stepOneError || stepTwoError || stepThreeError;

      if (validationError) {
        setErrorMsg(validationError);
        return;
      }

      const accessToken = await getAdminAccessToken();

      const response = await fetch("/api/tickets/prepare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          adminIssue: true,
          visitingPurpose,
          permitDocuments: permitDocuments.map(({ name, path, size }) => ({
            name,
            path,
            size,
          })),
          purchaseType: formData.purchaseType,

          usesOperator: formData.usesOperator,
          operatorName: formData.usesOperator ? formData.operatorName : null,
          operatorEmail: formData.usesOperator ? formData.operatorEmail : null,
          operatorType: formData.usesOperator ? formData.operatorType : null,
          operatorTypeOther:
            formData.usesOperator && formData.operatorType === "other"
              ? formData.operatorTypeOther
              : null,

          bringsBoat: formData.bringsBoat,
          boatName: formData.bringsBoat ? formData.boatName : null,

          visitorCount: formData.visitorCount,
          buyerName: formData.buyerName,
          buyersEmail: effectiveBuyerEmail,

          visitors: formData.visitors,

          selectedAreaSlugs: formData.selectedAreas.map((area) => area.slug),
        }),
      });

      const result = (await response.json()) as {
        orderId?: string;
        paymentLinkSent?: boolean;
        paymentUrl?: string;
        paymentLinkStored?: boolean;
        auditLogged?: boolean;
        message?: string;
      };

      if (!response.ok) {
        captureRateLimit(
          response,
          result.message || "Batas permintaan telah tercapai.",
        );
        throw new Error(result.message || "Booking belum dapat dibuat.");
      }

      if (
        !result.orderId ||
        !result.paymentUrl ||
        result.paymentLinkSent !== true
      ) {
        throw new Error("Data booking yang diterima tidak lengkap.");
      }

      setBookingId(result.orderId);
      setPaymentLinkUrl(result.paymentUrl);
      if (result.paymentLinkStored === false || result.auditLogged === false) {
        setDocumentAlert({
          message:
            "Payment Link telah dikirim, tetapi penyimpanan atau audit log memerlukan pemeriksaan administrator.",
          icon: "warning",
        });
      }
    } catch (error) {
      console.error("Admin ticket issuance failed:", error);

      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Tiket belum dapat diterbitkan.",
      );
    } finally {
      setPreparingPayment(false);
    }
  };

  return (
    <div className="mx-4 flex flex-wrap py-10 md:mx-48">
      {/* STEP INDICATOR */}
      <div className="flex w-full flex-wrap justify-between gap-4 px-3">
        {[
          {
            step: 1,
            label: "Pemesan",
            icon: FaUser,
          },
          {
            step: 2,
            label: "Info Pengunjung",
            icon: FaUsers,
          },
          {
            step: 3,
            label: "Tujuan",
            icon: FaMapMarkerAlt,
          },
          {
            step: 4,
            label: "Payment Link",
            icon: FaCreditCard,
          },
        ].map((item) => {
          const isActive = currentStep === item.step;

          const isCompleted = currentStep > item.step;

          return (
            <div key={item.step} className="flex items-center justify-center">
              <div
                aria-label={item.label}
                title={item.label}
                className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold shadow-md shadow-stone-300 ${
                  isActive || isCompleted
                    ? "bg-sky-800 text-white"
                    : "bg-stone-200 text-stone-600"
                }`}
              >
                {isCompleted ? (
                  <FaCheck aria-hidden="true" />
                ) : (
                  <item.icon aria-hidden="true" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 w-full rounded-2xl bg-white p-5 shadow-xl md:p-8">
        {/* //! STEP 1 — PENGUNJUNG  */}
        {currentStep === 1 && (
          <section className="flex flex-col gap-6 pt-2">
            <div>
              <h1 className="text-2xl font-semibold mb-3">Tiket Untuk</h1>

              <p className="mt-1 text-sm text-stone-600">
                Masukkan informasi pemesanan tiket.
              </p>
            </div>

            <label className="flex flex-col gap-2">
              <span className="font-medium">Tujuan Kunjungan</span>
              <select
                value={visitingPurpose}
                onChange={(event) => {
                  setVisitingPurpose(event.target.value);
                  resetPaymentData();
                  setPaymentLinkUrl(null);
                }}
                className="rounded-xl border border-stone-300 bg-white px-4 py-3"
              >
                <option value="tourism">Wisata reguler</option>
                <option value="research">Penelitian</option>
                <option value="education">Pendidikan / mahasiswa</option>
                <option value="vip">Kunjungan VIP</option>
                <option value="official">Kunjungan kedinasan</option>
                <option value="other">Lainnya</option>
              </select>
            </label>

            <div className="flex flex-col gap-2">
              <span className="font-medium">
                Dokumen Izin
                {visitingPurpose !== "tourism" && (
                  <span className="text-red-700"> *</span>
                )}
              </span>
              <label
                onDragEnter={(event) => {
                  event.preventDefault();
                  if (!uploadingPermits && !bookingId) setDraggingPermits(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!uploadingPermits && !bookingId) setDraggingPermits(true);
                }}
                onDragLeave={(event) => {
                  if (
                    !event.currentTarget.contains(
                      event.relatedTarget as Node | null,
                    )
                  ) {
                    setDraggingPermits(false);
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDraggingPermits(false);
                  if (!uploadingPermits && !bookingId) {
                    void uploadPermitDocuments(
                      Array.from(event.dataTransfer.files),
                    );
                  }
                }}
                className={`flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-5 text-center ${
                  draggingPermits
                    ? "border-sky-500 bg-sky-50"
                    : "border-stone-300 bg-stone-50"
                }`}
              >
                <FaUpload className="text-2xl text-sky-800" aria-hidden />
                <span className="text-sm text-stone-600">
                  {uploadingPermits
                    ? "Mengunggah dokumen..."
                    : "Klik atau jatuhkan dokumen PDF di sini"}
                </span>
                <span className="text-xs text-stone-500">
                  Maksimal 10 dokumen, masing-masing 10 MB
                </span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  className="hidden"
                  disabled={
                    uploadingPermits ||
                    permitDocuments.length >= 10 ||
                    Boolean(bookingId)
                  }
                  onChange={(event) => {
                    void uploadPermitDocuments(
                      Array.from(event.target.files ?? []),
                    );
                    event.currentTarget.value = "";
                  }}
                />
              </label>

              {permitDocuments.length > 0 && (
                <div className="mt-2 flex flex-col gap-2">
                  {permitDocuments.map((document) => (
                    <div
                      key={document.path}
                      className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => void openPermitDocument(document)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <FaFilePdf
                          className="shrink-0 text-2xl text-red-700"
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">
                          {document.name}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPermitPendingDeletion(document)}
                        disabled={
                          deletingPermitPath === document.path ||
                          Boolean(bookingId)
                        }
                        aria-label={`Hapus ${document.name}`}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        <FaTrash aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <p className="font-medium">Beli tiket sebagai</p>

              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="purchaseType"
                    checked={formData.purchaseType === "individual"}
                    onChange={() =>
                      updateFormData({ purchaseType: "individual" })
                    }
                  />
                  Perorangan
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="purchaseType"
                    checked={formData.purchaseType === "group"}
                    onChange={() => updateFormData({ purchaseType: "group" })}
                  />
                  Grup
                </label>
              </div>

              {documentAlert && (
                <AlertNotif
                  type="single"
                  msg={documentAlert.message}
                  yesText="OK"
                  icon={documentAlert.icon}
                  confirm={() => setDocumentAlert(null)}
                />
              )}

              {permitPendingDeletion && (
                <AlertNotif
                  type="double"
                  msg={`Hapus dokumen ${permitPendingDeletion.name}?`}
                  yesText="Hapus"
                  noText="Batal"
                  icon="warning"
                  loading={deletingPermitPath === permitPendingDeletion.path}
                  confirm={(confirmed) => {
                    if (!confirmed) {
                      setPermitPendingDeletion(null);
                      return;
                    }
                    const document = permitPendingDeletion;
                    setPermitPendingDeletion(null);
                    void deletePermitDocument(document);
                  }}
                />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <p className="font-medium">Menggunakan Operator?</p>

              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="usesOperator"
                    checked={formData.usesOperator}
                    onChange={() =>
                      updateFormData({
                        usesOperator: true,
                      })
                    }
                  />
                  Ya
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="usesOperator"
                    checked={!formData.usesOperator}
                    onChange={() =>
                      updateFormData({
                        usesOperator: false,
                        operatorName: "",
                        operatorEmail: "",
                        operatorType: "",
                        operatorTypeOther: "",
                      })
                    }
                  />
                  Tidak
                </label>
              </div>
            </div>

            {formData.usesOperator && (
              <div className="flex flex-wrap gap-4 rounded-xl bg-stone-50 p-4 [&>*]:min-w-0 [&>*]:flex-1 [&>*]:basis-72">
                <div className="flex flex-col gap-1">
                  <label htmlFor="operatorName">Nama Operator</label>

                  <input
                    id="operatorName"
                    type="text"
                    value={formData.operatorName}
                    onChange={(event) =>
                      updateFormData({
                        operatorName: event.target.value,
                      })
                    }
                    className="rounded-xl bg-white p-3"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="operatorEmail">Email Operator</label>

                  <input
                    id="operatorEmail"
                    type="email"
                    value={formData.operatorEmail}
                    onChange={(event) =>
                      updateFormData({
                        operatorEmail: event.target.value,
                      })
                    }
                    className="rounded-xl bg-white p-3"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="operatorType">Tipe Operator</label>

                  <select
                    id="operatorType"
                    value={formData.operatorType}
                    onChange={(event) => {
                      const operatorType = event.target.value as OperatorType;

                      updateFormData({
                        operatorType,
                        operatorTypeOther:
                          operatorType === "other"
                            ? formData.operatorTypeOther
                            : "",
                        bringsBoat:
                          operatorType === "lob" ? true : formData.bringsBoat,
                      });
                    }}
                    className="rounded-xl bg-white p-3"
                  >
                    <option value="">-- Pilih Tipe Operator --</option>
                    <option value="homestay">Home Stay</option>
                    <option value="resort">Resort</option>
                    <option value="lob">LOB</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>

                {formData.operatorType === "other" && (
                  <div className="flex flex-col gap-1">
                    <label htmlFor="operatorTypeOther">
                      Tipe Operator Lainnya
                    </label>

                    <input
                      id="operatorTypeOther"
                      type="text"
                      value={formData.operatorTypeOther}
                      onChange={(event) =>
                        updateFormData({
                          operatorTypeOther: event.target.value,
                        })
                      }
                      className="rounded-xl bg-white p-3"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <p className="font-medium">Membawa Kapal?</p>

              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="bringsBoat"
                    checked={formData.bringsBoat}
                    disabled={formData.operatorType === "lob"}
                    onChange={() =>
                      updateFormData({
                        bringsBoat: true,
                      })
                    }
                  />
                  Ya
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="bringsBoat"
                    checked={!formData.bringsBoat}
                    disabled={formData.operatorType === "lob"}
                    onChange={() =>
                      updateFormData({
                        bringsBoat: false,
                        boatName: "",
                      })
                    }
                  />
                  Tidak
                </label>
              </div>

              {formData.operatorType === "lob" && (
                <p className="text-xs text-stone-500">
                  Operator LOB otomatis dianggap membawa kapal.
                </p>
              )}
            </div>

            {formData.bringsBoat && (
              <div className="flex flex-col gap-1">
                <label htmlFor="boatName">Nama Kapal</label>

                <input
                  id="boatName"
                  type="text"
                  value={formData.boatName}
                  onChange={(event) =>
                    updateFormData({
                      boatName: event.target.value,
                    })
                  }
                  className="rounded-xl bg-stone-100 p-3"
                />
              </div>
            )}

            <div className="flex flex-wrap gap-4 [&>*]:min-w-0 [&>*]:flex-1 [&>*]:basis-72">
              {formData.purchaseType !== "individual" && (
                <div className="flex flex-col gap-1">
                  <label htmlFor="visitorCount">Jumlah Pengunjung</label>

                  <input
                    id="visitorCount"
                    type="number"
                    min={1}
                    max={100}
                    value={visitorCountInput}
                    onChange={(event) => {
                      const value = event.target.value;
                      setVisitorCountInput(value);

                      if (value !== "") {
                        setVisitorCount(Number(value));
                      }
                    }}
                    onBlur={() => {
                      if (visitorCountInput === "") {
                        setVisitorCountInput("1");
                        setVisitorCount(1);
                      }
                    }}
                    className="rounded-xl bg-stone-100 p-3"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label htmlFor="buyerName">Nama Pemesan</label>

                <input
                  id="buyerName"
                  type="text"
                  value={formData.buyerName}
                  onChange={(event) =>
                    updateFormData({
                      buyerName: event.target.value,
                    })
                  }
                  className="rounded-xl bg-stone-100 p-3"
                />
              </div>

              {!formData.usesOperator && (
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label htmlFor="buyerEmail">Email Pemesan</label>

                  <input
                    id="buyerEmail"
                    type="email"
                    value={formData.buyerEmail}
                    onChange={(event) =>
                      updateFormData({
                        buyerEmail: event.target.value,
                      })
                    }
                    className="rounded-xl bg-stone-100 p-3"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleNextFromStepOne}
                className="rounded-xl bg-sky-800 px-6 py-3 text-white hover:bg-sky-900"
              >
                Selanjutnya
              </button>
            </div>
          </section>
        )}
        {/* //! STEP 2 — INFO PENGUNJUNG */}
        {currentStep === 2 && (
          <section className="flex flex-col gap-6 pt-2">
            <div>
              <h1 className="text-2xl font-semibold mb-3">Info Pengunjung</h1>

              <p className="mt-1 text-sm text-stone-600">
                Lengkapi identitas setiap pengunjung.
              </p>
            </div>

            {formData.visitors.map((visitor, visitorIndex) => {
              const countrySearch = normalizeSearch(visitor.country);

              const filteredCountries =
                visitor.country.trim().length >= 2
                  ? countryList
                      .filter((country) => {
                        const normalizedName = normalizeSearch(country.name);
                        const normalizedValue = normalizeSearch(country.value);

                        return (
                          normalizedName.startsWith(countrySearch) ||
                          normalizedValue.startsWith(countrySearch)
                        );
                      })
                      .slice(0, 10)
                  : [];

              return (
                <div
                  key={visitorIndex}
                  className="overflow-hidden rounded-2xl border border-stone-200"
                >
                  <button
                    type="button"
                    aria-expanded={openVisitorIndex === visitorIndex}
                    aria-controls={`visitor-form-${visitorIndex}`}
                    onClick={(event) => {
                      const willOpen = openVisitorIndex !== visitorIndex;
                      setActiveCountryDropdown(null);
                      setOpenVisitorIndex((current) =>
                        current === visitorIndex ? null : visitorIndex,
                      );
                      if (willOpen && window.innerWidth < 1024) {
                        const trigger = event.currentTarget;
                        window.setTimeout(
                          () =>
                            trigger.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            }),
                          100,
                        );
                      }
                    }}
                    className="scroll-mt-24 flex w-full items-center justify-between gap-4 bg-stone-50 p-5 text-left hover:bg-stone-100"
                  >
                    <h2 className="text-lg font-semibold">
                      Pengunjung {visitorIndex + 1}
                    </h2>

                    <AccordionToggleIcon
                      open={openVisitorIndex === visitorIndex}
                    />
                  </button>

                  <div
                    id={`visitor-form-${visitorIndex}`}
                    className={`${openVisitorIndex === visitorIndex ? "visible" : "invisible h-0 pointer-events-none overflow-hidden"} flex flex-wrap gap-4 ${openVisitorIndex === visitorIndex ? "border-t border-stone-200 p-5" : "px-5"} [&>*]:min-w-0 [&>*]:flex-1 [&>*]:basis-72`}
                  >
                    <div className="flex flex-col gap-1">
                      <label>Nama Pengunjung</label>

                      <input
                        type="text"
                        value={visitor.visitorName}
                        onChange={(event) =>
                          updateVisitor(visitorIndex, {
                            visitorName: event.target.value,
                          })
                        }
                        className="rounded-xl bg-stone-100 p-3"
                      />
                    </div>

                    <div className="relative flex flex-col gap-1">
                      <label htmlFor={`visitor-country-${visitorIndex}`}>
                        Negara
                      </label>

                      <input
                        id={`visitor-country-${visitorIndex}`}
                        type="text"
                        value={visitor.country}
                        placeholder="Ketik minimal 2 karakter..."
                        autoComplete="off"
                        onFocus={() => {
                          if (visitor.country.trim().length >= 2) {
                            setActiveCountryDropdown(visitorIndex);
                          }
                        }}
                        onChange={(event) => {
                          const value = event.target.value;

                          updateVisitor(visitorIndex, {
                            country: value,
                          });

                          setActiveCountryDropdown(
                            value.trim().length >= 2 ? visitorIndex : null,
                          );
                        }}
                        onBlur={() => {
                          window.setTimeout(() => {
                            setActiveCountryDropdown((current) =>
                              current === visitorIndex ? null : current,
                            );
                          }, 150);
                        }}
                        className="rounded-xl bg-stone-100 p-3"
                      />

                      {activeCountryDropdown === visitorIndex &&
                        visitor.country.trim().length >= 2 && (
                          <div className="absolute top-full z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-lg">
                            {filteredCountries.length > 0 ? (
                              filteredCountries.map((country) => (
                                <button
                                  key={country.value}
                                  type="button"
                                  onMouseDown={(event) =>
                                    event.preventDefault()
                                  }
                                  onClick={() => {
                                    updateVisitor(visitorIndex, {
                                      country: country.name,
                                    });

                                    setActiveCountryDropdown(null);
                                  }}
                                  className="flex w-full items-center px-4 py-3 text-left text-sm hover:bg-stone-100"
                                >
                                  {country.name}
                                </button>
                              ))
                            ) : (
                              <p className="px-4 py-3 text-sm text-stone-500">
                                Negara tidak ditemukan.
                              </p>
                            )}
                          </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label>Gender</label>

                      <select
                        value={visitor.gender}
                        onChange={(event) =>
                          updateVisitor(visitorIndex, {
                            gender: event.target.value as VisitorGender,
                          })
                        }
                        className="rounded-xl bg-stone-100 p-3"
                      >
                        <option value="">-- Pilih Gender --</option>
                        <option value="male">Pria</option>
                        <option value="female">Wanita</option>
                        <option value="prefer_not_to_say">
                          Tidak Menyebutkan
                        </option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label>Kartu Identitas</label>

                      <select
                        value={visitor.identityType}
                        onChange={(event) =>
                          updateVisitor(visitorIndex, {
                            identityType: event.target.value as IdentityType,
                          })
                        }
                        className="rounded-xl bg-stone-100 p-3"
                      >
                        <option value="">-- Pilih Kartu Identitas --</option>
                        <option value="ktp">KTP</option>
                        <option value="sim">SIM</option>
                        <option value="passport">Passport</option>
                        <option value="kitas">KITAS</option>
                        <option value="kitap">KITAP</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1 md:col-span-2">
                      <label>Nomor Kartu Identitas</label>

                      <input
                        type="text"
                        value={visitor.identityNumber}
                        onChange={(event) =>
                          updateVisitor(visitorIndex, {
                            identityNumber: event.target.value,
                          })
                        }
                        className="rounded-xl bg-stone-100 p-3"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => changeStep(1)}
                className="rounded-xl border border-stone-300 px-6 py-3 text-stone-700 hover:bg-stone-100"
              >
                Sebelumnya
              </button>

              <button
                type="button"
                onClick={handleNextFromStepTwo}
                className="rounded-xl bg-sky-800 px-6 py-3 text-white hover:bg-sky-900"
              >
                Selanjutnya
              </button>
            </div>
          </section>
        )}
        {/* //! STEP 3 — TUJUAN */}
        {currentStep === 3 && (
          <section className="flex flex-col gap-6 pt-2">
            <div>
              <h1 className="text-2xl font-semibold mb-3">Tujuan</h1>

              <p className="mt-1 text-sm text-stone-600">
                Mengunjungi beberapa kawasan? Pilih lebih dari satu.
              </p>
            </div>

            {areasLoading ? (
              <p className="text-center text-stone-500">
                Memuat kawasan konservasi...
              </p>
            ) : (
              <div className="flex flex-wrap gap-4 [&>*]:min-w-72 [&>*]:flex-1 [&>*]:basis-96">
                {areas.map((area) => {
                  const isSelected = formData.selectedAreas.some(
                    (selectedArea) => selectedArea.id === area.id,
                  );

                  return (
                    <label
                      key={area.id}
                      className={`flex cursor-pointer flex-col items-stretch overflow-hidden rounded-2xl border transition ${
                        isSelected
                          ? "border-sky-700 bg-sky-50"
                          : "border-stone-200 bg-white hover:bg-stone-50"
                      }`}
                    >
                      <p
                        className={`w-full px-4 py-3 font-semibold ${
                          isSelected
                            ? "bg-sky-800 text-white"
                            : "bg-stone-100 text-stone-800"
                        }`}
                      >
                        {area.name}
                      </p>

                      <div className="flex items-center gap-4 p-4">
                        <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-stone-200">
                          {area.imagePath ? (
                            // Use Next/Image after confirming
                            // whether image_path is a public URL.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={area.imagePath}
                              alt={area.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-stone-500">
                              Gambar Kawasan
                            </div>
                          )}
                        </div>

                        <p className="min-w-0 flex-1 text-sm text-stone-500">
                          {formatCurrency(area.ticketPrice)} per pengunjung
                        </p>

                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectedArea(area)}
                          className="h-5 w-5 shrink-0"
                        />
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => changeStep(2)}
                className="rounded-xl border border-stone-300 px-6 py-3 text-stone-700 hover:bg-stone-100"
              >
                Sebelumnya
              </button>

              <button
                type="button"
                onClick={handleNextFromStepThree}
                className="rounded-xl bg-sky-800 px-6 py-3 text-white hover:bg-sky-900"
              >
                Selanjutnya
              </button>
            </div>
          </section>
        )}
        {/* //! STEP 4 — PEMBAYARAN */}
        {currentStep === 4 && (
          <section className="flex flex-col gap-6 pt-2">
            <div>
              <h1 className="text-2xl font-semibold mb-3">
                Kirim Payment Link
              </h1>

              <p className="mt-1 text-sm text-stone-600">
                Periksa data dan dokumen izin yang telah diverifikasi. Midtrans
                akan mengirim Payment Link ke email pemesan. Tiket baru aktif
                dan dikirim setelah pembayaran berhasil.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 rounded-2xl bg-stone-50 p-5 [&>*]:min-w-0 [&>*]:flex-1 [&>*]:basis-72">
              <div>
                <p className="text-sm text-stone-500">Booking ID</p>

                <p className="font-semibold">
                  {bookingId || "Akan dibuat saat pembayaran disiapkan"}
                </p>
              </div>

              <div>
                <p className="text-sm text-stone-500">Tanggal Pembelian</p>

                <p className="font-semibold">{purchaseDate}</p>
              </div>

              <div>
                <p className="text-sm text-stone-500">Tujuan Kunjungan</p>
                <p className="font-semibold">{visitingPurpose}</p>
              </div>

              <div>
                <p className="text-sm text-stone-500">Dokumen Izin</p>
                <p className="font-semibold">
                  {permitDocuments.length} dokumen
                </p>
              </div>

              <div>
                <p className="text-sm text-stone-500">Nama Pemesan</p>

                <p className="font-semibold">{formData.buyerName}</p>
              </div>

              <div>
                <p className="text-sm text-stone-500">Email Pemesan</p>

                <p className="break-all font-semibold">{effectiveBuyerEmail}</p>
              </div>

              {formData.usesOperator && (
                <div>
                  <p className="text-sm text-stone-500">Nama Operator</p>

                  <p className="font-semibold">{formData.operatorName}</p>
                </div>
              )}

              {formData.bringsBoat && (
                <div>
                  <p className="text-sm text-stone-500">Nama Kapal</p>

                  <p className="font-semibold">{formData.boatName}</p>
                </div>
              )}
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold">Tujuan</h2>

              <div className="flex flex-col gap-2">
                {formData.selectedAreas.map((area) => (
                  <div
                    key={area.id}
                    className="flex justify-between gap-4 rounded-xl bg-stone-100 p-3 text-sm"
                  >
                    <span>{area.name}</span>
                    <span className="font-medium">
                      {formatCurrency(area.ticketPrice)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 p-5">
              <h2 className="mb-4 text-lg font-semibold">Detail Transaksi</h2>

              <div className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span>Jumlah Pengunjung</span>
                  <span className="font-medium">{formData.visitorCount}</span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Jumlah Kawasan Konservasi</span>
                  <span className="font-medium">
                    {formData.selectedAreas.length}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>
                    {formData.visitorCount} Pengunjung ×{" "}
                    {formData.selectedAreas.length} Kawasan
                  </span>

                  <span className="font-medium">
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                {calculatedCharges.map((charge) => (
                  <div key={charge.id} className="flex justify-between gap-4">
                    <span>
                      {charge.name}
                      {charge.calculation_type === "percentage"
                        ? ` ${charge.value}%`
                        : ""}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(charge.amount)}
                    </span>
                  </div>
                ))}

                <div className="border-t border-stone-200 pt-3">
                  <div className="flex justify-between gap-4 text-base font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {bookingId && (
              <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700">
                Payment Link untuk Booking ID <strong>{bookingId}</strong>{" "}
                berhasil dibuat dan dikirim oleh Midtrans ke email pemesan.
                Tiket masih menunggu pembayaran.
                {paymentLinkUrl && (
                  <a
                    href={paymentLinkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-1 font-semibold underline"
                  >
                    Buka Payment Link
                  </a>
                )}
              </div>
            )}

            <div className="flex flex-col justify-between gap-4 sm:flex-row">
              <button
                type="button"
                onClick={() => changeStep(3)}
                disabled={preparingPayment || Boolean(bookingId)}
                className="rounded-xl border border-stone-300 px-6 py-3 text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sebelumnya
              </button>

              {!bookingId ? (
                <button
                  type="button"
                  onClick={handlePreparePayment}
                  disabled={preparingPayment}
                  className="rounded-xl bg-sky-800 px-6 py-3 text-white hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {preparingPayment
                    ? "Mengirim..."
                    : "Buat & Kirim Payment Link"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    resetPaymentData();
                    setPaymentLinkUrl(null);
                    setPermitDocuments([]);
                    changeStep(1);
                  }}
                  className="rounded-xl bg-sky-800 px-6 py-3 text-white hover:bg-sky-900"
                >
                  Buat Tiket Lain
                </button>
              )}
            </div>
          </section>
        )}
        {errorMsg && (
          <p
            role="alert"
            className="mt-6 rounded-xl bg-red-50 p-4 text-center text-sm text-red-700"
          >
            {rateLimitMessage || errorMsg}
          </p>
        )}
      </div>
    </div>
  );
}
