import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import {
  TicketValidationError,
  type TicketLookupMethod,
  validateAndConsumeTicket,
} from "@/lib/tickets/validateTicket";

export async function POST(request: Request) {
  try {
    const token = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return NextResponse.json({ message: "Missing auth token" }, { status: 401 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { message: "Admin access required" },
        { status: 403 },
      );
    }

    const body = (await request.json()) as {
      credential?: unknown;
      method?: unknown;
      ticketCode?: unknown;
    };
    const method: TicketLookupMethod =
      body.method === "manual" ? "manual" : "qr";
    // ticketCode supports older scanner clients during deployment.
    const credential =
      typeof body.credential === "string"
        ? body.credential
        : typeof body.ticketCode === "string"
          ? body.ticketCode
          : "";

    const result = await validateAndConsumeTicket({
      credential,
      method,
      scannerUserId: user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof TicketValidationError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Unexpected validation error";
    return NextResponse.json({ message }, { status });
  }
}
