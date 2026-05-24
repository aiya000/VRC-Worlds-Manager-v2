export function info(message: string): void {
  console.info(`[INFO] ${message}`)
}

export function error(message: string): void {
  console.error(`[ERROR] ${message}`)
}

export function warn(message: string): void {
  console.warn(`[WARN] ${message}`)
}

export function debug(message: string): void {
  console.debug(`[DEBUG] ${message}`)
}

export function trace(message: string): void {
  console.trace(`[TRACE] ${message}`)
}
