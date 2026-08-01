// @vitest-environment jsdom

import assert from "node:assert/strict";
import { act, renderHook } from "@testing-library/react";

import { useRateLimitCountdown } from "@/app/hooks/useRateLimitCountdown";
import { useAuthStore } from "@/app/Stores/authStores";
import { useMessageStore } from "@/app/Stores/messageStores";
import { getDatasetListCache, invalidateDatasetListCache, setDatasetListCache } from "@/lib/utils/datasetListCache";
import { clearSessionCaches, getSessionCache, invalidateSessionCache, setSessionCache } from "@/lib/utils/sessionCache";

beforeEach(() => {
  window.sessionStorage.clear();
  useAuthStore.getState().clearAuth();
  useAuthStore.getState().setLoading(true);
  useMessageStore.getState().setUnreadCount(0);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
});

afterEach(() => vi.useRealTimers());

describe("browser caches", () => {
  it("stores, reads, expires, invalidates, and clears session values", () => {
    setSessionCache("one", { id: 1 });
    setSessionCache("two", { id: 2 });
    assert.deepEqual(getSessionCache("one", 1000), { id: 1 });
    invalidateSessionCache("one");
    assert.equal(getSessionCache("one", 1000), null);
    vi.advanceTimersByTime(1001);
    assert.equal(getSessionCache("two", 1000), null);
    setSessionCache("three", 3);
    clearSessionCaches();
    assert.equal(getSessionCache("three", 1000), null);
  });

  it("isolates dataset scopes and invalidates only dataset-list entries", () => {
    setSessionCache("unrelated", "keep");
    setDatasetListCache("public", [{ id: 1 }], [{ id: "owner" }]);
    assert.deepEqual(getDatasetListCache("public"), { datasets: [{ id: 1 }], owners: [{ id: "owner" }], cachedAt: Date.now() });
    invalidateDatasetListCache();
    assert.equal(getDatasetListCache("public"), null);
    assert.equal(getSessionCache("unrelated", 1000), "keep");
  });
});

describe("global application state", () => {
  it("tracks authentication, profile, loading, and logout", () => {
    const session = { user: { id: "user-1" } } as never;
    useAuthStore.getState().setAuth(session);
    useAuthStore.getState().setProfile({ id: "user-1", username: "tester", email: "test@example.com", organization: "DKP", role: "admin" });
    useAuthStore.getState().setLoading(false);
    assert.equal(useAuthStore.getState().isLoggedIn, true);
    assert.equal(useAuthStore.getState().role, "admin");
    assert.equal(useAuthStore.getState().loading, false);
    useAuthStore.getState().clearAuth();
    assert.equal(useAuthStore.getState().userId, null);
    assert.equal(useAuthStore.getState().profile, null);
  });

  it("updates the dashboard unread count", () => {
    useMessageStore.getState().setUnreadCount(7);
    assert.equal(useMessageStore.getState().unreadCount, 7);
  });
});

describe("rate-limit countdown", () => {
  it("ignores non-429 responses and counts down a throttled response", () => {
    const { result } = renderHook(() => useRateLimitCountdown());
    act(() => assert.equal(result.current.captureRateLimit(new Response(null, { status: 400 }), "No"), false));
    act(() => assert.equal(result.current.captureRateLimit(new Response(null, { status: 429, headers: { "Retry-After": "2" } }), "Terlalu cepat."), true));
    assert.equal(result.current.remainingSeconds, 2);
    assert.match(result.current.rateLimitMessage, /00:02/);
    act(() => vi.advanceTimersByTime(2000));
    assert.equal(result.current.remainingSeconds, 0);
    assert.match(result.current.rateLimitMessage, /telah dibuka/);
  });
});
