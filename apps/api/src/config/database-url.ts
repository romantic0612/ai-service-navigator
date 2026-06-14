function encodeDatabasePart(value: string) {
  return encodeURIComponent(value);
}

export function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return;
  }

  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;
  const port = process.env.MYSQL_PORT ?? '3306';

  if (!host || !user || !password || !database) {
    return;
  }

  process.env.DATABASE_URL = `mysql://${encodeDatabasePart(user)}:${encodeDatabasePart(password)}@${host}:${port}/${database}`;
}
