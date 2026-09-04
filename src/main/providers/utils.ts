export function num(v: unknown): number | undefined {
  if (v == null) return undefined
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined
  if (typeof v === 'object') {
    const o = v as { value?: unknown }
    return num(o.value)
  }
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

/** 带 HTTP 状态码的错误，便于上层判断「换 key」还是「重试」 */
export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = 'ApiError'
  }
}

/** 把可能包含多个 key 的字符串拆成数组（逗号 / 换行 / 分号分隔，去空） */
export function splitKeys(apiKey: string): string[] {
  return apiKey
    .split(/[\n,;]+/)
    .map((k) => k.trim())
    .filter(Boolean)
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/** 瞬时错误（网络层失败、HTTP 5xx）才重试；429/401/403 等交由上层处理 */
function isTransient(err: unknown): boolean {
  if (err instanceof ApiError) {
    return err.status != null && err.status >= 500
  }
  return true // 网络层 TypeError: fetch failed 等按瞬时处理
}

/** 对瞬时错误自动重试（默认最多 2 次，指数退避） */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  backoff: number[] = [400, 900]
): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === retries || !isTransient(err)) throw err
      lastErr = err
      await sleep(backoff[Math.min(i, backoff.length - 1)])
    }
  }
  throw lastErr
}
