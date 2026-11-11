export * from "./types";

export interface BaggApiClientOptions {
  baseUrl?: string;
  credentials?: RequestCredentials;
}

export interface ApiRequestOptions
  extends Omit<RequestInit, "body" | "credentials"> {
  body?: unknown;
  credentials?: RequestCredentials;
}

export interface ApiErrorPayload {
  detail?: string | Array<{
    loc?: Array<string | number>;
    msg?: string;
    type?: string;
  }>;
  code?: string;
}

export class BaggApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "BaggApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class BaggApiClient {
  private readonly baseUrl: string;
  private readonly credentials: RequestCredentials;

  constructor(options: BaggApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "/api").replace(/\/+$/, "");
    this.credentials = options.credentials ?? "include";
  }

  async request<T>(
    path: string,
    options: ApiRequestOptions = {},
  ): Promise<T> {
    const normalizedPath = path.startsWith("/")
      ? path
      : `/${path}`;

    const url = `${this.baseUrl}${normalizedPath}`;

    const headers = new Headers(options.headers);

    if (
      options.body !== undefined &&
      !(options.body instanceof FormData)
    ) {
      headers.set("Content-Type", "application/json");
    }

    headers.set("Accept", "application/json");

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: options.credentials ?? this.credentials,
      body:
        options.body === undefined
          ? undefined
          : options.body instanceof FormData
            ? options.body
            : JSON.stringify(options.body),
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get("content-type") ?? "";

    const payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const errorPayload = (
        typeof payload === "object" && payload !== null
          ? payload
          : {}
      ) as ApiErrorPayload;

      let message = `Request failed (${response.status})`;

      if (typeof errorPayload.detail === "string") {
        message = errorPayload.detail;
      } else if (Array.isArray(errorPayload.detail)) {
        message = errorPayload.detail
          .map((item) => item.msg ?? "Invalid request")
          .join("; ");
      } else if (typeof payload === "string" && payload) {
        message = payload;
      }

      throw new BaggApiError(
        message,
        response.status,
        errorPayload.code,
        payload,
      );
    }

    return payload as T;
  }

  get<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "GET",
    });
  }

  post<T>(
    path: string,
    body?: unknown,
    options?: ApiRequestOptions,
  ): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "POST",
      body,
    });
  }

  patch<T>(
    path: string,
    body?: unknown,
    options?: ApiRequestOptions,
  ): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "PATCH",
      body,
    });
  }

  put<T>(
    path: string,
    body?: unknown,
    options?: ApiRequestOptions,
  ): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "PUT",
      body,
    });
  }

  delete<T>(
    path: string,
    options?: ApiRequestOptions,
  ): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "DELETE",
    });
  }

  getHealth() {
    return this.get<{
      status: string;
      environment: string;
      version: string;
    }>("/health");
  }

  getCurrencies() {
    return this.get<{
      currencies: Array<{
        code: string;
        name: string;
        symbol: string;
        decimals: number;
        minor_unit_factor: number;
        locale: string;
        flag: string;
      }>;
    }>("/currencies");
  }
}
