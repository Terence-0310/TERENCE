// Browser-safe lightweight logger. Wraps console.* with a uniform API
// matching the server-side pino logger (lib/be/shared/utils/logger.ts)
// so call sites read the same. Avoids bundling pino into the client bundle.

type LogFn = (obj: unknown, msg?: string) => void

export interface ClientLogger {
  debug: LogFn
  info: LogFn
  warn: LogFn
  error: LogFn
  child(bindings: Record<string, unknown>): ClientLogger
}

function emit(
  level: 'debug' | 'info' | 'warn' | 'error',
  bindings: Record<string, unknown>,
  arg1: unknown,
  arg2?: string,
) {
  const [data, msg] = typeof arg1 === 'string' ? [undefined, arg1] : [arg1, arg2]
  const tag = bindings.module ? `[${bindings.module}]` : ''
  const fn =
    level === 'error'
      ? console.error
      : level === 'warn'
        ? console.warn
        : level === 'debug'
          ? console.debug
          : console.info
  if (msg && data !== undefined) {
    fn(tag, msg, data)
  } else if (msg) {
    fn(tag, msg)
  } else {
    fn(tag, data)
  }
}

function make(bindings: Record<string, unknown> = {}): ClientLogger {
  return {
    debug: (o, m) => emit('debug', bindings, o, m),
    info: (o, m) => emit('info', bindings, o, m),
    warn: (o, m) => emit('warn', bindings, o, m),
    error: (o, m) => emit('error', bindings, o, m),
    child: (more) => make({ ...bindings, ...more }),
  }
}

export const logger: ClientLogger = make()
