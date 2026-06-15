import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type MonitorRangeOptions = {
  days: number;
};

type MonitorListOptions = MonitorRangeOptions & {
  limit: number;
};

@Injectable()
export class MonitorService {
  private readonly defaultDays = 30;
  private readonly maxLimit = 200;
  private readonly timezone = process.env.APP_TIMEZONE || 'Asia/Shanghai';

  constructor(private readonly prisma: PrismaService) {}

  async getOverview(query: { days?: number }) {
    const days = this.normalizeDays(query.days);
    const [
      topServices,
      roleStats,
      noResultQuestions,
      authIssues,
      trend,
      hourlyActivity,
      topQuestions,
      visitorSummary,
      studentTopQuestions,
      teacherTopQuestions,
    ] = await Promise.all([
      this.getServiceClickRank({ days, limit: 10 }),
      this.getRoleStats({ days }),
      this.getNoResultQuestions({ days, limit: 20 }),
      this.getSecondaryAuthIssues({ days, limit: 20 }),
      this.getUsageTrend({ days }),
      this.getHourlyActivity({ days }),
      this.getTopQuestions({ days, limit: 12 }),
      this.getVisitorSummary(),
      this.getTopQuestionsByRoles({ days, limit: 10 }, ['本科生', '研究生']),
      this.getTopQuestionsByRoles({ days, limit: 10 }, ['教职工']),
    ]);

    return {
      days,
      topServices,
      roleStats,
      noResultQuestions,
      secondaryAuthIssues: authIssues,
      trend,
      hourlyActivity,
      topQuestions,
      visitorSummary,
      studentTopQuestions,
      teacherTopQuestions,
      updatedAt: this.formatDisplayTime(new Date()),
    };
  }

  async getServiceClickRank(query: MonitorListOptions) {
    const { days, limit } = this.normalizeRange(query);
    const from = this.dateFrom(days);

    const rows = await this.prisma.$queryRaw<
      Array<{
        serviceItemId: string;
        title: string | null;
        clicks: bigint;
        firstClick: Date;
        lastClick: Date;
      }>
    >(Prisma.sql`
      SELECT e.service_item_id AS serviceItemId, si.title AS title,
             COUNT(*) AS clicks, MIN(e.created_at) AS firstClick, MAX(e.created_at) AS lastClick
      FROM user_events e
      LEFT JOIN service_items si ON e.service_item_id = si.id
      WHERE e.event_type = 'open_service'
        AND e.created_at >= ${from}
        AND e.service_item_id IS NOT NULL
      GROUP BY e.service_item_id, si.title
      ORDER BY clicks DESC, lastClick DESC
      LIMIT ${limit}
    `);

    return rows.map((row) => ({
      serviceItemId: row.serviceItemId,
      title: row.title ?? '未知事项',
      clicks: Number(row.clicks),
      firstClick: this.formatDisplayTime(row.firstClick),
      lastClick: this.formatDisplayTime(row.lastClick),
    }));
  }

  async getRoleStats(query: MonitorRangeOptions) {
    const days = this.normalizeDays(query.days);
    const from = this.dateFrom(days);

    const rows = await this.prisma.$queryRaw<
      Array<{ role: string | null; askCount: bigint; affectedUsers: bigint }>
    >(Prisma.sql`
      SELECT
        p.role AS role,
        COUNT(*) AS askCount,
        COUNT(DISTINCT e.user_id) AS affectedUsers
      FROM user_events e
      LEFT JOIN user_profiles p ON e.user_id = p.user_id
      WHERE e.event_type = 'ask'
        AND e.created_at >= ${from}
      GROUP BY p.role
      ORDER BY askCount DESC
    `);

    const total = rows.reduce((sum, row) => sum + Number(row.askCount), 0);

    return rows.map((row) => ({
      role: row.role || '未知身份',
      askCount: Number(row.askCount),
      affectedUsers: Number(row.affectedUsers),
      rate: total > 0 ? Number(((Number(row.askCount) / total) * 100).toFixed(2)) : 0,
    }));
  }

  async getNoResultQuestions(query: MonitorListOptions) {
    const { days, limit } = this.normalizeRange(query);
    const from = this.dateFrom(days);

    const rows = await this.prisma.$queryRaw<
      Array<{ queryText: string | null; count: bigint; firstAt: Date; lastAt: Date }>
    >(Prisma.sql`
      SELECT e.query_text AS queryText, COUNT(*) AS count, MIN(e.created_at) AS firstAt, MAX(e.created_at) AS lastAt
      FROM user_events e
      WHERE e.event_type = 'no_result'
        AND e.created_at >= ${from}
        AND e.query_text IS NOT NULL
        AND e.query_text <> ''
      GROUP BY e.query_text
      ORDER BY count DESC, lastAt DESC
      LIMIT ${limit}
    `);

    return rows.map((row) => ({
      queryText: row.queryText ?? '未命中查询',
      count: Number(row.count),
      firstAt: this.formatDisplayTime(row.firstAt),
      lastAt: this.formatDisplayTime(row.lastAt),
    }));
  }

  async getSecondaryAuthIssues(query: MonitorListOptions) {
    const { days, limit } = this.normalizeRange(query);
    const from = this.dateFrom(days);

    const aggregated = await this.prisma.$queryRaw<
      Array<{ serviceItemId: string | null; title: string | null; issues: bigint; latestAt: Date }>
    >(Prisma.sql`
      SELECT e.service_item_id AS serviceItemId, si.title AS title,
             COUNT(*) AS issues, MAX(e.created_at) AS latestAt
      FROM user_events e
      LEFT JOIN service_items si ON e.service_item_id = si.id
      WHERE e.event_type = 'secondary_auth_issue'
        AND e.created_at >= ${from}
      GROUP BY e.service_item_id, si.title
      ORDER BY issues DESC, latestAt DESC
      LIMIT ${limit}
    `);

    const recentList = await this.prisma.$queryRaw<
      Array<{
        id: string;
        userId: string;
        serviceItemId: string | null;
        userName: string | null;
        userRole: string | null;
        metadata: Prisma.JsonValue;
        createdAt: Date;
      }>
    >(Prisma.sql`
      SELECT e.id, e.user_id AS userId, e.service_item_id AS serviceItemId,
             p.name AS userName, p.role AS userRole, e.metadata AS metadata, e.created_at AS createdAt
      FROM user_events e
      LEFT JOIN user_profiles p ON e.user_id = p.user_id
      WHERE e.event_type = 'secondary_auth_issue'
        AND e.created_at >= ${from}
      ORDER BY e.created_at DESC
      LIMIT ${limit}
    `);

    return {
      hotItems: aggregated.map((row) => ({
        serviceItemId: row.serviceItemId,
        title: row.title ?? '未知事项',
        issues: Number(row.issues),
        latestAt: this.formatDisplayTime(row.latestAt),
      })),
      recentCases: recentList.map((row) => ({
        id: row.id,
        userId: row.userId,
        userName: row.userName || '匿名用户',
        userRole: row.userRole || '未知身份',
        serviceItemId: row.serviceItemId,
        metadata: row.metadata,
        createdAt: this.formatDisplayTime(row.createdAt),
      })),
    };
  }

  async getUsageTrend(query: MonitorRangeOptions) {
    const days = this.normalizeDays(query.days);
    const from = this.dateFrom(days);

    const eventRows = await this.prisma.$queryRaw<
      Array<{ day: string; eventType: string; count: bigint; users: bigint }>
    >(Prisma.sql`
      SELECT DATE_FORMAT(e.created_at, '%m-%d') AS day,
             e.event_type AS eventType,
             COUNT(*) AS count,
             COUNT(DISTINCT e.user_id) AS users
      FROM user_events e
      WHERE e.created_at >= ${from}
        AND e.event_type IN ('ask', 'open_service', 'no_result')
      GROUP BY day, e.event_type
      ORDER BY MIN(e.created_at) ASC
    `);

    const loginRows = await this.prisma.$queryRaw<Array<{ day: string; logins: bigint }>>(Prisma.sql`
      SELECT DATE_FORMAT(p.updated_at, '%m-%d') AS day,
             COUNT(*) AS logins
      FROM user_profiles p
      WHERE p.updated_at >= ${from}
      GROUP BY day
      ORDER BY MIN(p.updated_at) ASC
    `);

    const bucketMap = new Map<
      string,
      { day: string; asks: number; serviceOpens: number; noResults: number; activeUsers: number; logins: number }
    >();

    for (const row of eventRows) {
      const bucket = bucketMap.get(row.day) ?? {
        day: row.day,
        asks: 0,
        serviceOpens: 0,
        noResults: 0,
        activeUsers: 0,
        logins: 0,
      };
      if (row.eventType === 'ask') {
        bucket.asks = Number(row.count);
        bucket.activeUsers = Math.max(bucket.activeUsers, Number(row.users));
      }
      if (row.eventType === 'open_service') {
        bucket.serviceOpens = Number(row.count);
      }
      if (row.eventType === 'no_result') {
        bucket.noResults = Number(row.count);
      }
      bucketMap.set(row.day, bucket);
    }

    for (const row of loginRows) {
      const bucket = bucketMap.get(row.day) ?? {
        day: row.day,
        asks: 0,
        serviceOpens: 0,
        noResults: 0,
        activeUsers: 0,
        logins: 0,
      };
      bucket.logins = Number(row.logins);
      bucketMap.set(row.day, bucket);
    }

    return [...bucketMap.values()].sort((left, right) => left.day.localeCompare(right.day));
  }

  async getHourlyActivity(query: MonitorRangeOptions) {
    const days = this.normalizeDays(query.days);
    const from = this.dateFrom(days);

    const eventRows = await this.prisma.$queryRaw<
      Array<{ hour: number; eventType: string; count: bigint }>
    >(Prisma.sql`
      SELECT HOUR(e.created_at) AS hour,
             e.event_type AS eventType,
             COUNT(*) AS count
      FROM user_events e
      WHERE e.created_at >= ${from}
        AND e.event_type IN ('ask', 'open_service')
      GROUP BY hour, e.event_type
      ORDER BY hour ASC
    `);

    const loginRows = await this.prisma.$queryRaw<Array<{ hour: number; logins: bigint }>>(Prisma.sql`
      SELECT HOUR(p.updated_at) AS hour,
             COUNT(*) AS logins
      FROM user_profiles p
      WHERE p.updated_at >= ${from}
      GROUP BY hour
      ORDER BY hour ASC
    `);

    const buckets = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: `${hour.toString().padStart(2, '0')}:00`,
      asks: 0,
      serviceOpens: 0,
      logins: 0,
    }));

    for (const row of eventRows) {
      const bucket = buckets[row.hour];
      if (!bucket) {
        continue;
      }
      if (row.eventType === 'ask') {
        bucket.asks = Number(row.count);
      }
      if (row.eventType === 'open_service') {
        bucket.serviceOpens = Number(row.count);
      }
    }

    for (const row of loginRows) {
      const bucket = buckets[row.hour];
      if (bucket) {
        bucket.logins = Number(row.logins);
      }
    }

    return buckets;
  }

  async getTopQuestions(query: MonitorListOptions) {
    const { days, limit } = this.normalizeRange(query);
    const from = this.dateFrom(days);

    const rows = await this.prisma.$queryRaw<
      Array<{ queryText: string | null; count: bigint; latestAt: Date; users: bigint }>
    >(Prisma.sql`
      SELECT e.query_text AS queryText,
             COUNT(*) AS count,
             MAX(e.created_at) AS latestAt,
             COUNT(DISTINCT e.user_id) AS users
      FROM user_events e
      WHERE e.event_type = 'ask'
        AND e.created_at >= ${from}
        AND e.query_text IS NOT NULL
        AND e.query_text <> ''
      GROUP BY e.query_text
      ORDER BY count DESC, latestAt DESC
      LIMIT ${limit}
    `);

    return rows.map((row) => ({
      queryText: row.queryText ?? '未知问题',
      count: Number(row.count),
      users: Number(row.users),
      latestAt: this.formatDisplayTime(row.latestAt),
    }));
  }

  async getTopQuestionsByRoles(query: MonitorListOptions, roles: string[]) {
    const { days, limit } = this.normalizeRange(query);
    const from = this.dateFrom(days);

    const rows = await this.prisma.$queryRaw<
      Array<{ queryText: string | null; count: bigint; latestAt: Date; users: bigint }>
    >(Prisma.sql`
      SELECT e.query_text AS queryText,
             COUNT(*) AS count,
             MAX(e.created_at) AS latestAt,
             COUNT(DISTINCT e.user_id) AS users
      FROM user_events e
      LEFT JOIN user_profiles p ON e.user_id = p.user_id
      WHERE e.event_type = 'ask'
        AND e.created_at >= ${from}
        AND e.query_text IS NOT NULL
        AND e.query_text <> ''
        AND p.role IN (${Prisma.join(roles)})
      GROUP BY e.query_text
      ORDER BY count DESC, latestAt DESC
      LIMIT ${limit}
    `);

    return rows.map((row) => ({
      queryText: row.queryText ?? '未知问题',
      count: Number(row.count),
      users: Number(row.users),
      latestAt: this.formatDisplayTime(row.latestAt),
    }));
  }

  async getVisitorSummary() {
    const [totalRows, todayRows] = await Promise.all([
      this.prisma.$queryRaw<Array<{ totalVisitors: bigint }>>(Prisma.sql`
        SELECT COUNT(*) AS totalVisitors
        FROM user_profiles
      `),
      this.prisma.$queryRaw<Array<{ todayActiveVisitors: bigint }>>(Prisma.sql`
        SELECT COUNT(*) AS todayActiveVisitors
        FROM user_profiles
        WHERE DATE(updated_at) = CURDATE()
      `),
    ]);

    return {
      totalVisitors: Number(totalRows[0]?.totalVisitors ?? 0),
      todayActiveVisitors: Number(todayRows[0]?.todayActiveVisitors ?? 0),
    };
  }

  private normalizeDays(days?: number) {
    const value = Number.isFinite(days as number) ? days : this.defaultDays;
    if (value === undefined || value <= 0) {
      return this.defaultDays;
    }

    return Math.min(365, Math.max(1, value));
  }

  private normalizeRange(query: MonitorRangeOptions | MonitorListOptions) {
    const days = this.normalizeDays(query.days);
    const rawLimit = (query as MonitorListOptions).limit;
    const normalizedLimit =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(this.maxLimit, Math.max(5, rawLimit)) : 20;

    return {
      days,
      limit: normalizedLimit,
    };
  }

  private dateFrom(days: number) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  private formatDisplayTime(date: Date) {
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: this.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
  }
}
