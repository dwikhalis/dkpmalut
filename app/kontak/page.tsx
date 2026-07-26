"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useLocaleStore } from "@/app/Stores/localeStore";
import AlertNotif from "../components/AlertNotif";
import SpinnerLoading from "../components/SpinnerLoading";
import {
  CmsPageCta,
  PageHeader,
  CmsPageProvider,
  useCmsText,
} from "../components/CmsPageContent";
import {
  contactPhoneCountries,
  DEFAULT_CONTACT_CALLING_CODE,
  DEFAULT_CONTACT_COUNTRY_ID,
} from "@/lib/contact/phoneCountries";
import { useRateLimitCountdown } from "@/app/hooks/useRateLimitCountdown";

function ContactPageContent() {
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const phoneCountryRef = useRef<HTMLDivElement | null>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
  const [showAlert, setShowAlert] = useState("");
  const [failureDetail, setFailureDetail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [phoneCountryOpen, setPhoneCountryOpen] = useState(false);
  const { captureRateLimit, rateLimitMessage } = useRateLimitCountdown();
  const locale = useLocaleStore((state) => state.locale);
  const title = useCmsText("page_contact_title", "Kontak Kami");
  const subtitle = useCmsText(
    "page_contact_subtitle",
    "Dinas Kelautan Dan Perikanan Maluku Utara",
  );
  const address = useCmsText(
    "page_contact_address",
    "Kelurahan Sofifi, Kecamatan Oba Utara, Kota Tidore Kepulauan, Provinsi Maluku Utara, Indonesia",
  );
  const nameLabel = useCmsText("page_contact_name_label", "Nama *");
  const namePlaceholder = useCmsText("page_contact_name_placeholder", "Nama");
  const emailLabel = useCmsText("page_contact_email_label", "Email *");
  const emailPlaceholder = useCmsText(
    "page_contact_email_placeholder",
    "Email",
  );
  const phoneLabel = useCmsText("page_contact_phone_label", "Nomor Handphone");
  const phonePlaceholder = useCmsText(
    "page_contact_phone_placeholder",
    "Nomor Handphone",
  );
  const messageLabel = useCmsText("page_contact_message_label", "Pesan *");
  const messagePlaceholder = useCmsText(
    "page_contact_message_placeholder",
    "Ketik pesan anda",
  );
  const submitLabel = useCmsText("page_contact_submit_label", "Kirim");
  const successMessage = locale === "en" ? "Message sent" : "Pesan terkirim";
  const failedMessage =
    locale === "en" ? "Failed to send message" : "Pesan gagal dikirim";
  const confirmLabel = locale === "en" ? "OK" : "Oke";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    countryId: DEFAULT_CONTACT_COUNTRY_ID,
    countryCallingCode: DEFAULT_CONTACT_CALLING_CODE,
    phone: "",
    message: "",
  });

  const selectedPhoneCountry =
    contactPhoneCountries.find(
      (country) => country.id === formData.countryId,
    ) ?? contactPhoneCountries[0];

  useEffect(() => {
    function closeCountryPicker(event: MouseEvent) {
      if (!phoneCountryRef.current?.contains(event.target as Node)) {
        setPhoneCountryOpen(false);
      }
    }

    document.addEventListener("mousedown", closeCountryPicker);
    return () => document.removeEventListener("mousedown", closeCountryPicker);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!turnstileSiteKey || !turnstileToken) {
      setFailureDetail(
        locale === "en"
          ? "Complete the security verification first."
          : "Selesaikan verifikasi keamanan terlebih dahulu.",
      );
      setShowAlert("failed");
      return;
    }

    setSubmitting(true);
    setFailureDetail("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, turnstileToken }),
      });
      const result = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      if (!response.ok) {
        captureRateLimit(response, result?.message || failedMessage);
        throw new Error(result?.message || failedMessage);
      }

      setShowAlert("success");
      setFormData({
        name: "",
        email: "",
        countryId: DEFAULT_CONTACT_COUNTRY_ID,
        countryCallingCode: DEFAULT_CONTACT_CALLING_CODE,
        phone: "",
        message: "",
      });
    } catch (err) {
      console.error(err);
      setFailureDetail(err instanceof Error ? err.message : failedMessage);
      setShowAlert("failed");
    } finally {
      setSubmitting(false);
      setTurnstileToken("");
      turnstileRef.current?.reset();
    }
  };

  const handleCorfirm = (confirmation: boolean) => {
    if (confirmation) setShowAlert("");
  };

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-7xl p-6 md:p-10">
      <PageHeader
        eyebrow={locale === "en" ? "Get in Touch" : "Hubungi Kami"}
        title={title}
        subtitle={subtitle}
      />

      <div className="mt-8 grid gap-7 lg:grid-cols-2">
        <section className="flex flex-col justify-center rounded-3xl bg-sky-50 p-7 shadow-lg ring-1 ring-sky-100 md:p-10">
          <h2 className="text-2xl font-bold text-sky-950">
            {locale === "en" ? "Office Address" : "Alamat Kantor"}
          </h2>
          {address && (
            <p className="mt-4 text-base leading-8 text-stone-600 md:text-lg">
              {address}
            </p>
          )}
        </section>

        <form
          className="flex flex-col rounded-3xl border border-stone-100 bg-white p-7 shadow-xl md:p-10"
          onSubmit={handleSubmit}
        >
          {nameLabel && (
            <label
              className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
              htmlFor="name"
            >
              {nameLabel}
            </label>
          )}
          <input
            type="text"
            id="name"
            name="name"
            placeholder={namePlaceholder ?? ""}
            className="h-6 md:h-10 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] bg-stone-100 p-3 rounded-xl mt-2 md:mb-6 mb-3"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          {emailLabel && (
            <label
              className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
              htmlFor="email"
            >
              {emailLabel}
            </label>
          )}
          <input
            type="email"
            id="email"
            name="email"
            placeholder={emailPlaceholder ?? ""}
            className="h-6 md:h-10 text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] bg-stone-100 p-3 rounded-xl mt-2 md:mb-6 mb-3"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            required
          />
          {phoneLabel && (
            <label
              className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
              htmlFor="phone"
            >
              {phoneLabel}
            </label>
          )}
          <div className="mt-2 mb-3 flex rounded-xl bg-stone-100 md:mb-6">
            <div className="relative shrink-0" ref={phoneCountryRef}>
              <button
                type="button"
                aria-label={
                  locale === "en" ? "Country calling code" : "Kode negara"
                }
                aria-expanded={phoneCountryOpen}
                className="flex min-h-10 w-12 items-center justify-center rounded-l-xl bg-sky-800 px-2 text-sm font-semibold text-white"
                onClick={() => setPhoneCountryOpen((open) => !open)}
              >
                <Image
                  src={selectedPhoneCountry.flagUrl}
                  alt=""
                  width={24}
                  height={18}
                  className="h-[18px] w-6 rounded-xs object-cover"
                />
              </button>
              {phoneCountryOpen && (
                <div className="absolute top-full left-0 z-30 mt-1 max-h-64 min-w-64 overflow-y-auto rounded-xl border border-stone-200 bg-white py-1 shadow-xl">
                  {contactPhoneCountries.map((country) => (
                    <button
                      key={`${country.name}-${country.code}`}
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-stone-100"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          countryId: country.id,
                          countryCallingCode: country.code,
                        });
                        setPhoneCountryOpen(false);
                      }}
                    >
                      <Image
                        src={country.flagUrl}
                        alt=""
                        width={24}
                        height={18}
                        className="h-[18px] w-6 shrink-0 rounded-xs object-cover"
                      />
                      <span className="grow">{country.name}</span>
                      <span className="text-stone-500">{country.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              data-contact-phone="true"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              id="phone"
              name="phone"
              placeholder={phonePlaceholder ?? ""}
              className="min-h-10 min-w-0 flex-1 rounded-r-xl rounded-l-none bg-white p-3 text-[2.8vw] outline-none md:text-[1.8vw] lg:text-[1.2vw]"
              value={formData.phone}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  phone: e.target.value.replace(/\D/g, ""),
                })
              }
            />
          </div>
          {messageLabel && (
            <label
              className="text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw]"
              htmlFor="message"
            >
              {messageLabel}
            </label>
          )}
          <textarea
            id="message"
            name="message"
            placeholder={messagePlaceholder ?? ""}
            className="h-30 mt-2 md:grow text-[2.8vw] md:text-[1.8vw] lg:text-[1.2vw] bg-stone-100 p-3 rounded-xl md-2 md:mb-6 mb-3"
            value={formData.message}
            onChange={(e) =>
              setFormData({ ...formData, message: e.target.value })
            }
            required
          />
          {turnstileSiteKey ? (
            <div className="mb-4 flex justify-center">
              <Turnstile
                ref={turnstileRef}
                siteKey={turnstileSiteKey}
                onSuccess={setTurnstileToken}
                onExpire={() => setTurnstileToken("")}
                onError={() => setTurnstileToken("")}
              />
            </div>
          ) : (
            <p className="mb-4 rounded-lg bg-red-50 p-3 text-center text-sm text-red-700">
              NEXT_PUBLIC_TURNSTILE_SITE_KEY belum dikonfigurasi.
            </p>
          )}
          {submitLabel && (
            <button
              type="submit"
              disabled={submitting || !turnstileSiteKey || !turnstileToken}
              className="flex min-h-11 items-center justify-center rounded-xl bg-sky-800 p-1.5 text-[2.8vw] text-white hover:bg-sky-300 hover:text-black disabled:cursor-not-allowed disabled:opacity-50 md:p-3 md:text-[1.8vw] lg:text-[1.2vw]"
            >
              {submitting ? (
                <SpinnerLoading size="sm" color="white" />
              ) : (
                submitLabel
              )}
            </button>
          )}
        </form>
        {showAlert === "success" && successMessage && confirmLabel && (
          <AlertNotif
            type="single"
            msg={successMessage}
            yesText={confirmLabel}
            icon="success"
            confirm={handleCorfirm}
          />
        )}
        {showAlert === "failed" && failedMessage && confirmLabel && (
          <AlertNotif
            type="single"
            msg={rateLimitMessage || failureDetail || failedMessage}
            yesText={confirmLabel}
            icon="failed"
            confirm={handleCorfirm}
          />
        )}
      </div>
      <CmsPageCta prefix="page_contact" />
    </main>
  );
}

export default function Page() {
  return (
    <CmsPageProvider component="page_contact">
      <ContactPageContent />
    </CmsPageProvider>
  );
}
