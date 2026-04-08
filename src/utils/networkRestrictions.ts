import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { logForDebugging } from './debug.js'
import { isNonDeepSeekNetworkDisabled } from './privacyLevel.js'

const NETWORK_BLOCK_CODE = 'ERR_NON_DEEPSEEK_NETWORK_BLOCKED'
const ALLOWED_HOST_SUFFIXES = ['deepseek.com', 'deepseek.com.cn']

let restrictionsInstalled = false

function isHttpLikeProtocol(protocol: string): boolean {
  return (
    protocol === 'http:' ||
    protocol === 'https:' ||
    protocol === 'ws:' ||
    protocol === 'wss:'
  )
}

function isAllowedDeepSeekHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase()
  return ALLOWED_HOST_SUFFIXES.some(
    suffix => normalized === suffix || normalized.endsWith(`.${suffix}`),
  )
}

function resolveUrl(input: string, baseURL?: string): URL | undefined {
  try {
    return baseURL ? new URL(input, baseURL) : new URL(input)
  } catch {
    return undefined
  }
}

function getFetchMethod(
  input: string | URL | Request,
  init?: RequestInit,
): string {
  if (init?.method) {
    return init.method
  }
  if (typeof Request !== 'undefined' && input instanceof Request) {
    return input.method
  }
  return 'GET'
}

function createBlockedNetworkError(method: string, url: string): Error & {
  code: string
} {
  const error = new Error(
    `Blocked non-DeepSeek network request: ${method.toUpperCase()} ${url}`,
  ) as Error & { code: string }
  error.code = NETWORK_BLOCK_CODE
  return error
}

function assertDeepSeekOnlyUrl(method: string, rawUrl: string): void {
  if (!isNonDeepSeekNetworkDisabled()) {
    return
  }

  const url = resolveUrl(rawUrl)
  if (!url) {
    return
  }
  if (!isHttpLikeProtocol(url.protocol)) {
    return
  }
  if (isAllowedDeepSeekHost(url.hostname)) {
    return
  }

  logForDebugging(
    `[network-restrictions] blocked ${method.toUpperCase()} ${url.toString()}`,
    { level: 'error' },
  )
  throw createBlockedNetworkError(method, url.toString())
}

function applyAxiosRestriction(
  instance: AxiosInstance,
  originalCreate?: typeof axios.create,
): AxiosInstance {
  if ((instance.defaults as Record<string, unknown>)._deepseekRestrictionApplied) {
    return instance
  }

  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const rawUrl = config.url
    if (!rawUrl) {
      return config
    }

    const resolved = resolveUrl(rawUrl, config.baseURL)
    if (resolved) {
      assertDeepSeekOnlyUrl(config.method ?? 'GET', resolved.toString())
    }
    return config
  })

  ;(instance.defaults as Record<string, unknown>)._deepseekRestrictionApplied =
    true

  if (originalCreate) {
    ;(instance.defaults as Record<string, unknown>)._deepseekOriginalCreate =
      originalCreate
  }

  return instance
}

function installAxiosRestriction(): void {
  const axiosWithMutableCreate = axios as typeof axios & {
    create: typeof axios.create
  }

  const originalCreate =
    ((axios.defaults as Record<string, unknown>)._deepseekOriginalCreate as
      | typeof axios.create
      | undefined) ?? axiosWithMutableCreate.create.bind(axios)

  applyAxiosRestriction(axios, originalCreate)

  axiosWithMutableCreate.create = ((...args: Parameters<typeof axios.create>) =>
    applyAxiosRestriction(originalCreate(...args), originalCreate)) as typeof axios.create
}

function installFetchRestriction(): void {
  const globalWithMutableFetch = globalThis as typeof globalThis & {
    _deepseekOriginalFetch?: typeof fetch
  }

  const originalFetch =
    globalWithMutableFetch._deepseekOriginalFetch ?? globalThis.fetch.bind(globalThis)

  globalWithMutableFetch._deepseekOriginalFetch = originalFetch
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    const rawUrl =
      typeof Request !== 'undefined' && input instanceof Request
        ? input.url
        : String(input)
    assertDeepSeekOnlyUrl(getFetchMethod(input, init), rawUrl)
    return originalFetch(input, init)
  }) as typeof fetch
}

function installWebSocketRestriction(): void {
  const globalWithMutableWebSocket = globalThis as typeof globalThis & {
    _deepseekOriginalWebSocket?: typeof WebSocket
  }

  if (typeof globalThis.WebSocket === 'undefined') {
    return
  }

  const originalWebSocket =
    globalWithMutableWebSocket._deepseekOriginalWebSocket ?? globalThis.WebSocket

  globalWithMutableWebSocket._deepseekOriginalWebSocket = originalWebSocket
  globalThis.WebSocket = function (
    this: WebSocket,
    url: string | URL,
    protocols?: string | string[],
    options?: unknown,
  ): WebSocket {
    assertDeepSeekOnlyUrl('GET', String(url))
    return Reflect.construct(
      originalWebSocket as unknown as new (
        url: string | URL,
        protocols?: string | string[],
        options?: unknown,
      ) => WebSocket,
      [url, protocols, options],
      new.target ??
        (originalWebSocket as unknown as new (...args: unknown[]) => WebSocket),
    )
  } as typeof WebSocket
  Object.setPrototypeOf(globalThis.WebSocket, originalWebSocket)
  globalThis.WebSocket.prototype = originalWebSocket.prototype
}

export function installNonDeepSeekNetworkRestrictions(): void {
  if (restrictionsInstalled) {
    return
  }

  restrictionsInstalled = true
  installAxiosRestriction()
  installFetchRestriction()
  installWebSocketRestriction()
}
