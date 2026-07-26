import "server-only";

import QRCode from "qrcode";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

type GenerateTicketPdfParams = {
  orderId: string;
  buyerName: string;
  ticketCode: string;
  visitorNames: string[];
  conservationAreas: string[];
  paidAt: string;
  expiresAt: string;
  ticketUrl: string;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Makassar",
  }).format(new Date(value));
}

/*
 * StandardFonts use WinAnsi encoding.
 * Replace unsupported punctuation and characters to
 * prevent PDF generation from crashing.
 *
 * For full multilingual names later, you can bundle
 * and embed a Unicode TTF font.
 */
function makePdfSafe(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\u0020-\u007e\u00a0-\u00ff]/g, "?");
}

function splitLongWord({
  word,
  font,
  fontSize,
  maxWidth,
}: {
  word: string;
  font: PDFFont;
  fontSize: number;
  maxWidth: number;
}) {
  const pieces: string[] = [];
  let currentPiece = "";

  for (const character of word) {
    const candidate = currentPiece + character;

    const candidateWidth = font.widthOfTextAtSize(candidate, fontSize);

    if (candidateWidth <= maxWidth || currentPiece.length === 0) {
      currentPiece = candidate;
      continue;
    }

    pieces.push(currentPiece);
    currentPiece = character;
  }

  if (currentPiece) {
    pieces.push(currentPiece);
  }

  return pieces;
}

function wrapText({
  text,
  font,
  fontSize,
  maxWidth,
}: {
  text: string;
  font: PDFFont;
  fontSize: number;
  maxWidth: number;
}) {
  const safeText = makePdfSafe(text);
  const words = safeText.split(/\s+/);
  const lines: string[] = [];

  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    const candidateWidth = font.widthOfTextAtSize(candidate, fontSize);

    if (candidateWidth <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = "";
    }

    const wordWidth = font.widthOfTextAtSize(word, fontSize);

    if (wordWidth <= maxWidth) {
      currentLine = word;
      continue;
    }

    const pieces = splitLongWord({
      word,
      font,
      fontSize,
      maxWidth,
    });

    if (pieces.length > 1) {
      lines.push(...pieces.slice(0, -1));
    }

    currentLine = pieces.at(-1) ?? "";
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

export async function generateTicketPdf({
  orderId,
  buyerName,
  ticketCode,
  visitorNames,
  conservationAreas,
  paidAt,
  expiresAt,
  ticketUrl,
}: GenerateTicketPdfParams) {
  const pdfDocument = await PDFDocument.create();

  pdfDocument.setTitle(`Tiket Kawasan Konservasi - ${orderId}`);

  pdfDocument.setAuthor("KKP Maluku Utara");

  pdfDocument.setSubject("Tiket Kawasan Konservasi");

  pdfDocument.setCreator("Sistem Tiket KKP Maluku Utara");

  const regularFont = await pdfDocument.embedFont(StandardFonts.Helvetica);

  const boldFont = await pdfDocument.embedFont(StandardFonts.HelveticaBold);

  const qrCodeBuffer = await QRCode.toBuffer(ticketUrl, {
    type: "png",
    width: 600,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  const qrImage = await pdfDocument.embedPng(qrCodeBuffer);

  let page: PDFPage = pdfDocument.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  let cursorY = PAGE_HEIGHT - PAGE_MARGIN;

  const addPage = () => {
    page = pdfDocument.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    cursorY = PAGE_HEIGHT - PAGE_MARGIN;

    return page;
  };

  const ensureSpace = (requiredHeight: number) => {
    if (cursorY - requiredHeight < PAGE_MARGIN + 24) {
      addPage();
    }
  };

  const drawWrappedText = ({
    text,
    font = regularFont,
    fontSize = 11,
    color = rgb(0.25, 0.23, 0.22),
    maxWidth = CONTENT_WIDTH,
    x = PAGE_MARGIN,
    lineHeight = 16,
    gapAfter = 4,
  }: {
    text: string;
    font?: PDFFont;
    fontSize?: number;
    color?: ReturnType<typeof rgb>;
    maxWidth?: number;
    x?: number;
    lineHeight?: number;
    gapAfter?: number;
  }) => {
    const lines = wrapText({
      text,
      font,
      fontSize,
      maxWidth,
    });

    for (const line of lines) {
      ensureSpace(lineHeight);

      page.drawText(line, {
        x,
        y: cursorY,
        size: fontSize,
        font,
        color,
      });

      cursorY -= lineHeight;
    }

    cursorY -= gapAfter;
  };

  const drawSectionTitle = (title: string) => {
    ensureSpace(34);

    cursorY -= 4;

    page.drawText(makePdfSafe(title), {
      x: PAGE_MARGIN,
      y: cursorY,
      size: 14,
      font: boldFont,
      color: rgb(0.03, 0.35, 0.52),
    });

    cursorY -= 10;

    page.drawLine({
      start: {
        x: PAGE_MARGIN,
        y: cursorY,
      },
      end: {
        x: PAGE_WIDTH - PAGE_MARGIN,
        y: cursorY,
      },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.83),
    });

    cursorY -= 20;
  };

  const drawDetail = ({
    label,
    value,
    maxWidth,
  }: {
    label: string;
    value: string;
    maxWidth?: number;
  }) => {
    drawWrappedText({
      text: label,
      font: regularFont,
      fontSize: 9,
      color: rgb(0.47, 0.44, 0.42),
      maxWidth,
      lineHeight: 12,
      gapAfter: 0,
    });

    drawWrappedText({
      text: value,
      font: boldFont,
      fontSize: 11,
      color: rgb(0.12, 0.11, 0.1),
      maxWidth,
      lineHeight: 15,
      gapAfter: 7,
    });
  };

  /*
   * Header
   */
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 112,
    width: PAGE_WIDTH,
    height: 112,
    color: rgb(0.03, 0.35, 0.52),
  });

  page.drawText("TIKET KAWASAN KONSERVASI", {
    x: PAGE_MARGIN,
    y: PAGE_HEIGHT - 55,
    size: 21,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  page.drawText("KKP Maluku Utara", {
    x: PAGE_MARGIN,
    y: PAGE_HEIGHT - 79,
    size: 12,
    font: regularFont,
    color: rgb(0.88, 0.95, 0.98),
  });

  cursorY = PAGE_HEIGHT - 150;

  /*
   * Main ticket information and QR.
   */
  const qrSize = 150;

  const qrX = PAGE_WIDTH - PAGE_MARGIN - qrSize;

  const qrY = cursorY - qrSize + 12;

  page.drawRectangle({
    x: qrX - 10,
    y: qrY - 10,
    width: qrSize + 20,
    height: qrSize + 20,
    borderWidth: 1,
    borderColor: rgb(0.85, 0.85, 0.83),
    color: rgb(1, 1, 1),
  });

  page.drawImage(qrImage, {
    x: qrX,
    y: qrY,
    width: qrSize,
    height: qrSize,
  });

  const detailWidth = CONTENT_WIDTH - qrSize - 34;

  drawWrappedText({
    text: "PEMBAYARAN BERHASIL",
    font: boldFont,
    fontSize: 15,
    color: rgb(0.09, 0.4, 0.2),
    maxWidth: detailWidth,
    lineHeight: 18,
    gapAfter: 10,
  });

  drawDetail({
    label: "Booking ID",
    value: orderId,
    maxWidth: detailWidth,
  });

  drawDetail({
    label: "Ticket Code",
    value: ticketCode,
    maxWidth: detailWidth,
  });

  drawDetail({
    label: "Nama Pemesan",
    value: buyerName,
    maxWidth: detailWidth,
  });

  cursorY = Math.min(cursorY, qrY - 30);

  page.drawLine({
    start: {
      x: PAGE_MARGIN,
      y: cursorY,
    },
    end: {
      x: PAGE_WIDTH - PAGE_MARGIN,
      y: cursorY,
    },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.83),
  });

  cursorY -= 24;

  /*
   * Validity details.
   */
  drawSectionTitle("Informasi Tiket");

  drawDetail({
    label: "Tanggal Pembayaran",
    value: formatDate(paidAt),
  });

  drawDetail({
    label: "Berlaku Sampai",
    value: formatDate(expiresAt),
  });

  /*
   * Visitors.
   */
  drawSectionTitle(`Daftar Pengunjung (${visitorNames.length})`);

  if (visitorNames.length === 0) {
    drawWrappedText({
      text: "Data pengunjung tidak tersedia.",
    });
  } else {
    visitorNames.forEach((visitorName, index) => {
      drawWrappedText({
        text: `${index + 1}. ${visitorName}`,
        fontSize: 11,
        lineHeight: 16,
        gapAfter: 3,
      });
    });
  }

  /*
   * Conservation areas.
   */
  drawSectionTitle(`Kawasan Konservasi (${conservationAreas.length})`);

  if (conservationAreas.length === 0) {
    drawWrappedText({
      text: "Data kawasan konservasi tidak tersedia.",
    });
  } else {
    conservationAreas.forEach((areaName, index) => {
      drawWrappedText({
        text: `${index + 1}. ${areaName}`,
        fontSize: 11,
        lineHeight: 16,
        gapAfter: 3,
      });
    });
  }

  /*
   * Verification information.
   */
  drawSectionTitle("Verifikasi Tiket");

  drawWrappedText({
    text: "Tunjukkan QR pada tiket ini kepada petugas kawasan konservasi.",
    fontSize: 11,
    lineHeight: 16,
  });

  drawWrappedText({
    text: ticketUrl,
    fontSize: 8,
    color: rgb(0.03, 0.35, 0.52),
    lineHeight: 12,
    gapAfter: 10,
  });

  drawWrappedText({
    text: "Jangan membagikan PDF, QR, atau kode tiket kepada pihak yang tidak berkepentingan.",
    fontSize: 9,
    color: rgb(0.47, 0.44, 0.42),
    lineHeight: 13,
  });

  /*
   * Add page numbers and footer.
   */
  const pages = pdfDocument.getPages();

  pages.forEach((currentPage, pageIndex) => {
    currentPage.drawLine({
      start: {
        x: PAGE_MARGIN,
        y: 38,
      },
      end: {
        x: PAGE_WIDTH - PAGE_MARGIN,
        y: 38,
      },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.83),
    });

    currentPage.drawText("Sistem Tiket Kawasan Konservasi KKP Maluku Utara", {
      x: PAGE_MARGIN,
      y: 22,
      size: 7,
      font: regularFont,
      color: rgb(0.58, 0.55, 0.53),
    });

    const pageText = `Halaman ${pageIndex + 1} dari ${pages.length}`;

    const pageTextWidth = regularFont.widthOfTextAtSize(pageText, 7);

    currentPage.drawText(pageText, {
      x: PAGE_WIDTH - PAGE_MARGIN - pageTextWidth,
      y: 22,
      size: 7,
      font: regularFont,
      color: rgb(0.58, 0.55, 0.53),
    });
  });

  const pdfBytes = await pdfDocument.save();

  return Buffer.from(pdfBytes);
}
