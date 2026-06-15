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
    const [topServices, roleStats, noResultQuestions, authIssues] = await Promise.all([
      this.getServiceClickRank({ days, limit: 10 }),
      this.getRoleStats({ days }),
      this.getNoResultQuestions({ days, limit: 20 }),
      this.getSecondaryAuthIssues({ days, limit: 20 }),
    ]);

    return {
      days,
      topServices,
      roleStats,
      noResultQuestions,
      secondaryAuthIssues: authIssues,
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
