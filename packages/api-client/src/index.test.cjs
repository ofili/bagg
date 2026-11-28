
const test = require("node:test");
const assert = require("node:assert/strict");

const { BaggApiClient, BaggApiError } = require("../dist/index.js");

function mockFetch(t, implementation) {
    const originalFetch = global.fetch;

    global.fetch = implementation;

    t.after(() => {
        global.fetch = originalFetch;
    });
}

function jsonResponse(payload, status = 200) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: {
            "Content-Type": "application/json",
        },
    });
}

test("authenticated GET includes session credentials", async (t) => {
    let captured;

    mockFetch(t, async (url, options) => {
        captured = { url, options };
        return jsonResponse({ success: true });
    });

    const client = new BaggApiClient({ baseUrl: "/api" });

    await client.request("/invoices", {
        method: "GET",
    });

    assert.equal(captured.url, "/api/invoices");
    assert.equal(captured.options.credentials, "include");
});

test("public GET omits session credentials", async (t) => {
    let captured;

    mockFetch(t, async (url, options) => {
        captured = { url, options };
        return jsonResponse({ success: true });
    });

    const client = new BaggApiClient({ baseUrl: "/api" });

    await client.public.request("/share/token", {
        method: "GET",
    });

    assert.equal(captured.options.credentials, "omit");
});

test("public GET cannot override credentials to include", async (t) => {
    let captured;

    mockFetch(t, async (url, options) => {
        captured = { url, options };
        return jsonResponse({ success: true });
    });

    const client = new BaggApiClient({ baseUrl: "/api" });

    await client.public.request("/share/token", {
        method: "GET",
        credentials: "include",
    });

    assert.equal(captured.options.credentials, "omit");
});

test("authenticated POST sends JSON with the correct content type", async (t) => {
    let captured;

    mockFetch(t, async (url, options) => {
        captured = { url, options };
        return jsonResponse({ id: "inv-123" }, 201);
    });

    const client = new BaggApiClient({ baseUrl: "/api" });

    const body = {
        client_id: "client-123",
        currency: "NGN",
    };

    await client.request("/invoices", {
        method: "POST",
        body,
    });

    assert.equal(captured.options.credentials, "include");
    assert.equal(
        captured.options.headers.get("Content-Type"),
        "application/json",
    );
    assert.equal(
        captured.options.body,
        JSON.stringify(body),
    );
});

test("public POST sends JSON but omits session credentials", async (t) => {
    let captured;

    mockFetch(t, async (url, options) => {
        captured = { url, options };
        return jsonResponse({ success: true });
    });

    const client = new BaggApiClient({ baseUrl: "/api" });

    const body = {
        action: "approve",
    };

    await client.public.request("/quotes/token/accept", {
        method: "POST",
        body,
    });

    assert.equal(captured.options.credentials, "omit");
    assert.equal(
        captured.options.headers.get("Content-Type"),
        "application/json",
    );
    assert.equal(
        captured.options.body,
        JSON.stringify(body),
    );
});

test("FormData POST preserves the FormData body and leaves multipart content type to the browser", async (t) => {
    let captured;

    mockFetch(t, async (url, options) => {
        captured = { url, options };
        return jsonResponse({ uploaded: true });
    });

    const client = new BaggApiClient({ baseUrl: "/api" });
    const formData = new FormData();

    formData.append("description", "Test attachment");
    formData.append(
        "file",
        new Blob(["test content"], { type: "text/plain" }),
        "test.txt",
    );

    await client.request("/expenses/attachments", {
        method: "POST",
        body: formData,
    });

    assert.ok(captured.options.body instanceof FormData);
    assert.equal(
        captured.options.headers.has("Content-Type"),
        false,
    );
});

test("204 response returns undefined", async (t) => {
    mockFetch(t, async () => new Response(null, {
        status: 204,
    }));

    const client = new BaggApiClient({ baseUrl: "/api" });

    const result = await client.request("/invoices/123", {
        method: "DELETE",
    });

    assert.equal(result, undefined);
});

test("non-2xx JSON response throws BaggApiError", async (t) => {
    mockFetch(t, async () => jsonResponse(
        {
            detail: "Invoice cannot be recalled",
            code: "INVOICE_RECALL_BLOCKED",
        },
        409,
    ));

    const client = new BaggApiClient({ baseUrl: "/api" });

    await assert.rejects(
        client.request("/invoices/123/recall", {
            method: "POST",
            body: {},
        }),
        (error) => {
            assert.ok(error instanceof BaggApiError);
            assert.equal(error.status, 409);
            assert.equal(error.message, "Invoice cannot be recalled");
            assert.equal(error.code, "INVOICE_RECALL_BLOCKED");

            return true;
        },
    );
});
