/**
 * Trên Windows, `localhost` đôi khi resolve sang IPv6 (::1) trong khi MariaDB/MySQL
 * chỉ bind 127.0.0.1 → ECONNREFUSED ::1:3306. Ép host `localhost` → 127.0.0.1.
 */
export function preferIpv4Localhost(databaseUrl: string): string {
  return databaseUrl.replace(/@localhost(?=[:/])/i, '@127.0.0.1')
}
