
import type { paths } from "./schema";

export * from "./types";

type HttpMethod =
    | "get"
    | "post"
    | "put"
    | "patch"
    | "delete";

type PathsForMethod<M extends HttpMethod> = {
  [P in keyof paths]: M extends keyof paths[P]
      ? paths[P][M] extends never | undefined
          ? never
          : P
      : never;
}[keyof paths];

type Operation<
    P extends keyof paths,
    M extends HttpMethod,
> = M extends keyof paths[P]
    ? NonNullable<paths[P][M]>
    : never;

type OperationParameters<
    P extends keyof paths,
    M extends HttpMethod,
> = Operation<P, M> extends { parameters: infer Params }
    ? Params
    : never;

type PathParameters<
    P extends keyof paths,
    M extends HttpMethod,
> = OperationParameters<P, M> extends {
      path?: infer Value;
    }
    ? Exclude<Value, undefined>
    : never;

type QueryParameters<
    P extends keyof paths,
    M extends HttpMethod,
> = OperationParameters<P, M> extends {
      query?: infer Value;
    }
    ? Exclude<Value, undefined>
    : never;

type RequestBody<
    P extends keyof paths,
    M extends HttpMethod,
> = Operation<P, M> extends {
      requestBody: {
        content: {
          "application/json": infer Body;
        };
      };
    }
    ? Body
    : never;

type SuccessResponses<Responses> = {
  [Status in keyof Responses]: Status extends `2${number}`
      ? Responses[Status]
      : never;
}[keyof Responses];

type JsonResponse<Response> =
    Response extends {
          content: {
            "application/json": infer Body;
          };
        }
        ? Body
        : undefined;

type OperationResponse<
    P extends keyof paths,
    M extends HttpMethod,
> = Operation<P, M> extends {
      responses: infer Responses;
    }
    ? JsonResponse<SuccessResponses<Responses>>
    : never;

type OperationOptions<
    P extends keyof paths,
    M extends HttpMethod,
> = Omit<
    RequestInit,
    "method" | "body" | "credentials"
> & {
  credentials?: RequestCredentials;
  query?: QueryParameters<P, M>;
} & (
    [PathParameters<P, M>] extends [never]
        ? { pathParams?: never }
        : { pathParams: PathParameters<P, M> }
    );

type OperationOptionsArgs<
    P extends keyof paths,
    M extends HttpMethod,
> = [PathParameters<P, M>] extends [never]
    ? [options?: OperationOptions<P, M>]
    : [options: OperationOptions<P, M>];

type OperationBodyArgs<
    P extends keyof paths,
    M extends HttpMethod,
> = [RequestBody<P, M>] extends [never]
    ? [body: undefined, ...options: OperationOptionsArgs<P, M>]
    : [
      body: RequestBody<P, M>,
      ...options: OperationOptionsArgs<P, M>,
    ];

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
  private readonly enforceCredentials: boolean;

  /**
   * Public, token-authorised API operations.
   *
   * These always omit browser credentials, even if a caller supplies
   * a credentials override in request options.
   */
  readonly public: BaggApiClient;

  constructor(
      options: BaggApiClientOptions = {},
      enforceCredentials = false,
  ) {
    this.baseUrl = (options.baseUrl ?? "/api").replace(/\/+$/, "");
    this.credentials = options.credentials ?? "include";
    this.enforceCredentials = enforceCredentials;

    this.public = enforceCredentials
        ? this
        : new BaggApiClient(
            {
              baseUrl: this.baseUrl,
              credentials: "omit",
            },
            true,
        );
  }

  private buildUrl(
      path: string,
      pathParams?: Record<string, string | number>,
      query?: Record<string, unknown>,
  ): string {
    const resolvedPath = path.replace(
        /\{([^}]+)\}/g,
        (_match, key: string) => {
          const value = pathParams?.[key];

          if (value === undefined || value === null) {
            throw new Error(
                `Missing required path parameter: ${key}`,
            );
          }

          return encodeURIComponent(String(value));
        },
    );

    const url = new URL(
        resolvedPath.startsWith("/")
            ? resolvedPath
            : `/${resolvedPath}`,
        "http://bagg.local",
    );

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) {
          continue;
        }

        if (Array.isArray(value)) {
          for (const item of value) {
            url.searchParams.append(key, String(item));
          }
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return `${url.pathname}${url.search}`;
  }

  /**
   * Low-level transport escape hatch.
   *
   * Prefer the OpenAPI-typed HTTP methods for normal API operations.
   */
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
      credentials: this.enforceCredentials
          ? "omit"
          : options.credentials ?? this.credentials,
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

    const contentType =
        response.headers.get("content-type") ?? "";

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

  get<P extends PathsForMethod<"get">>(
      path: P,
      ...args: OperationOptionsArgs<P, "get">
  ): Promise<OperationResponse<P, "get">> {
    const [options] = args;

    const url = this.buildUrl(
        String(path),
        options?.pathParams as
            | Record<string, string | number>
            | undefined,
        options?.query as Record<string, unknown> | undefined,
    );

    return this.request<OperationResponse<P, "get">>(
        url,
        {
          ...options,
          method: "GET",
        },
    );
  }

  post<P extends PathsForMethod<"post">>(
      path: P,
      ...args: OperationBodyArgs<P, "post">
  ): Promise<OperationResponse<P, "post">> {
    const [body, options] = args;

    const url = this.buildUrl(
        String(path),
        options?.pathParams as
            | Record<string, string | number>
            | undefined,
        options?.query as Record<string, unknown> | undefined,
    );

    return this.request<OperationResponse<P, "post">>(
        url,
        {
          ...options,
          method: "POST",
          body,
        },
    );
  }

  patch<P extends PathsForMethod<"patch">>(
      path: P,
      ...args: OperationBodyArgs<P, "patch">
  ): Promise<OperationResponse<P, "patch">> {
    const [body, options] = args;

    const url = this.buildUrl(
        String(path),
        options?.pathParams as
            | Record<string, string | number>
            | undefined,
        options?.query as Record<string, unknown> | undefined,
    );

    return this.request<OperationResponse<P, "patch">>(
        url,
        {
          ...options,
          method: "PATCH",
          body,
        },
    );
  }

  put<P extends PathsForMethod<"put">>(
      path: P,
      ...args: OperationBodyArgs<P, "put">
  ): Promise<OperationResponse<P, "put">> {
    const [body, options] = args;

    const url = this.buildUrl(
        String(path),
        options?.pathParams as
            | Record<string, string | number>
            | undefined,
        options?.query as Record<string, unknown> | undefined,
    );

    return this.request<OperationResponse<P, "put">>(
        url,
        {
          ...options,
          method: "PUT",
          body,
        },
    );
  }

  delete<P extends PathsForMethod<"delete">>(
      path: P,
      ...args: OperationOptionsArgs<P, "delete">
  ): Promise<OperationResponse<P, "delete">> {
    const [options] = args;

    const url = this.buildUrl(
        String(path),
        options?.pathParams as
            | Record<string, string | number>
            | undefined,
        options?.query as Record<string, unknown> | undefined,
    );

    return this.request<OperationResponse<P, "delete">>(
        url,
        {
          ...options,
          method: "DELETE",
        },
    );
  }

  getHealth() {
    return this.request<{
      status: string;
      environment: string;
      version: string;
    }>("/health", {
      method: "GET",
    });
  }

  getCurrencies() {
    return this.request<{
      currencies: Array<{
        code: string;
        name: string;
        symbol: string;
        decimals: number;
        minor_unit_factor: number;
        locale: string;
        flag: string;
      }>;
    }>("/currencies", {
      method: "GET",
    });
  }
}
