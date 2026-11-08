"use client";

/*
* Handles an expired or revoked session inside the signed-in app.
*
* The middleware can only see that a cookie exists, so an expired cookie lets people
* into pages whose data calls then fail with 401 and show "could not load" messages.
* This watches API responses and, on the first 401, clears the cookie (logout) and
* sends the person to /login?expired=1&next=<where they are>.
*
* Mount once in (app)/layout.tsx. It only wraps fetch while the signed-in app is open,
* so public pages (/i, /q, /r) are untouched. /api/auth/* is ignored on purpose:
* a wrong login code must not look like an expired session.
* Note: it treats 401 as "signed out". If your API ever returns 401 for anything else,
* narrow the check.
 */

import { useEffect } from "react";

export function SessionGuard() {
    useEffect(() => {
        const original = window.fetch;
        let redirecting = false;

        window.fetch = async (...args: Parameters<typeof fetch>) => {
            const res = await original(...args);
            if (res.status == 401 && !redirecting) {
                const input = args[0];
                const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
                const path = new URL(raw, window.location.origin).pathname;
                if (path.startsWith('/api/') && !path.startsWith('/api/auth')) {
                    redirecting = true;
                    const next = window.location.pathname + window.location.search;
                    original('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {}).finally(() =>
                    window.location.assign(`/login?expired=1&next=${encodeURIComponent(next)}`));
                }
            }
            return res
        };
        return () => {
            window.fetch = original;
        };
    }, []);
    return null
}