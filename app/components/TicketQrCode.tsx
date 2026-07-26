"use client";

import { QRCodeCanvas } from "qrcode.react";

type TicketQrCodeProps = {
  value: string;
  size?: number;
};

export default function TicketQrCode({ value, size = 176 }: TicketQrCodeProps) {
  return (
    <QRCodeCanvas
      value={value}
      size={size}
      level="M"
      includeMargin
      className="h-full w-full"
    />
  );
}
