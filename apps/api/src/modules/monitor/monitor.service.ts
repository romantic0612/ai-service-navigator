import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { databaseNow } from '../../common/time';
import { MiniMaxService } from '../ai-memory/minimax.service';
import { PrismaService } from '../prisma/prisma.service';

type MonitorRangeOptions = {
  days: number;
};

type MonitorListOptions = MonitorRangeOptions & {
  limit: number;
};

type UnmetNeedModelGroup = {
  key: string;
  suggestedIntent?: string;
  suggestedCategory?: string;
  priority?: 'high' | 'medium' | 'low';
  status?: string;
  reason?: string;
  suggestedKeywords?: string[];
};

type UnmetNeedsResult = {
  days: number;
  total: number;
  modelEnabled: boolean;
  classificationStatus: 'local' | 'pending' | 'ready';
  items: Array<Record<string, unknown>>;
  generatedAt: string;
};

type UnmetNeedReviewRow = {
  needKey: string;
  manualPriority: 'high' | 'medium' | 'low' | null;
  status: 'OPEN' | 'RESOLVED' | 'ARCHIVED';
  adminNote: string | null;
  resolvedTitle: string | null;
  resolvedMessage: string | null;
  resolvedAt: Date | null;
};

@Injectable()
export class MonitorService {
  private readonly defaultDays = 30;
  private readonly maxLimit = 200;
  private unmetNeedsCache:
    | {
        key: string;
        expiresAt: number;
        value: UnmetNeedsResult;
      }
    | undefined;
  private readonly unmetNeedsClassifyInFlight = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly miniMaxService: MiniMaxService,
  ) {}

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
      recentAssistantTurns,
      unmetNeeds,
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
      this.getRecentAssistantTurns(30),
      this.getUnmetNeeds({ days, limit: 20 }),
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
      recentAssistantTurns,
      unmetNeeds,
      updatedAt: this.formatRuntimeTime(new Date()),
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
      SELECT DATE_FORMAT(e.created_at, '%m-%d') AS day,
             COUNT(DISTINCT e.user_id) AS logins
      FROM user_events e
      WHERE e.created_at >= ${from}
        AND e.event_type = 'app_open'
      GROUP BY day
      ORDER BY MIN(e.created_at) ASC
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
      SELECT HOUR(e.created_at) AS hour,
             COUNT(DISTINCT e.user_id) AS logins
      FROM user_events e
      WHERE e.created_at >= ${from}
        AND e.event_type = 'app_open'
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
      SELECT t.query_text AS queryText,
             COUNT(*) AS count,
             MAX(t.created_at) AS latestAt,
             COUNT(DISTINCT t.user_id) AS users
      FROM assistant_turns t
      WHERE t.created_at >= ${from}
        AND t.action <> 'guide'
        AND t.query_text IS NOT NULL
        AND t.query_text <> ''
      GROUP BY t.query_text
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
      SELECT t.query_text AS queryText,
             COUNT(*) AS count,
             MAX(t.created_at) AS latestAt,
             COUNT(DISTINCT t.user_id) AS users
      FROM assistant_turns t
      LEFT JOIN user_profiles p ON t.user_id = p.user_id
      WHERE t.created_at >= ${from}
        AND t.action <> 'guide'
        AND t.query_text IS NOT NULL
        AND t.query_text <> ''
        AND p.role IN (${Prisma.join(roles)})
      GROUP BY t.query_text
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
        SELECT COUNT(DISTINCT visitor.user_id) AS totalVisitors
        FROM (
          SELECT user_id FROM user_profiles
          UNION
          SELECT user_id FROM user_events WHERE event_type = 'app_open'
        ) visitor
      `),
      this.prisma.$queryRaw<Array<{ todayActiveVisitors: bigint }>>(Prisma.sql`
        SELECT COUNT(DISTINCT user_id) AS todayActiveVisitors
        FROM user_events
        WHERE event_type = 'app_open'
          AND DATE(created_at) = CURDATE()
      `),
    ]);

    return {
      totalVisitors: Number(totalRows[0]?.totalVisitors ?? 0),
      todayActiveVisitors: Number(todayRows[0]?.todayActiveVisitors ?? 0),
    };
  }

  async getRecentAssistantTurns(limit = 30) {
    try {
      const normalizedLimit = Math.min(this.maxLimit, Math.max(5, limit));
      const rows = await this.prisma.$queryRaw<
        Array<{
          id: string;
          userId: string;
          userName: string | null;
          userRole: string | null;
          queryText: string;
          responseText: string;
          action: string;
          matchedServiceIds: Prisma.JsonValue;
          usedDify: boolean;
          intent: string | null;
          createdAt: Date;
        }>
      >(Prisma.sql`
        SELECT
          t.id,
          t.user_id AS userId,
          p.name AS userName,
          p.role AS userRole,
          t.query_text AS queryText,
          t.response_text AS responseText,
          t.action,
          t.matched_service_ids AS matchedServiceIds,
          t.used_dify AS usedDify,
          t.intent,
          t.created_at AS createdAt
        FROM assistant_turns t
        LEFT JOIN user_profiles p ON p.user_id = t.user_id
        ORDER BY t.created_at DESC
        LIMIT ${normalizedLimit}
      `);

      return rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        userName: row.userName || '匿名用户',
        userRole: row.userRole || '未知身份',
        queryText: row.queryText,
        responseText: row.responseText,
        action: row.action,
        matchedServiceIds: row.matchedServiceIds,
        usedDify: Boolean(row.usedDify),
        intent: row.intent ?? undefined,
        createdAt: this.formatDisplayTime(row.createdAt),
      }));
    } catch {
      return [];
    }
  }

  async getUnmetNeeds(query: MonitorListOptions): Promise<UnmetNeedsResult> {
    const { days, limit } = this.normalizeRange(query);
    const cacheKey = `${days}:${limit}`;
    if (this.unmetNeedsCache?.key === cacheKey && this.unmetNeedsCache.expiresAt > Date.now()) {
      return this.unmetNeedsCache.value;
    }

    const from = this.dateFrom(days);
    const rows = await this.prisma.$queryRaw<
      Array<{
        queryText: string;
        responseText: string;
        action: string;
        userId: string;
        userName: string | null;
        userRole: string | null;
        college: string | null;
        createdAt: Date;
      }>
    >(Prisma.sql`
      SELECT
        t.query_text AS queryText,
        t.response_text AS responseText,
        t.action,
        t.user_id AS userId,
        p.name AS userName,
        p.role AS userRole,
        p.college AS college,
        t.created_at AS createdAt
      FROM assistant_turns t
      LEFT JOIN user_profiles p ON p.user_id = t.user_id
      WHERE t.created_at >= ${from}
        AND t.action IN ('no_reliable_result', 'role_mismatch')
        AND t.query_text IS NOT NULL
        AND t.query_text <> ''
      ORDER BY t.created_at DESC
      LIMIT ${Math.min(this.maxLimit, Math.max(limit * 8, 60))}
    `);

    const grouped = this.groupUnmetNeedRows(rows, limit);
    const reviewMap = await this.getUnmetNeedReviews(grouped.map((group) => group.key));
    const result = this.buildUnmetNeedsResult(days, rows.length, grouped, [], 'pending', reviewMap);
    this.unmetNeedsCache = {
      key: cacheKey,
      expiresAt: Date.now() + 2 * 60 * 1000,
      value: result,
    };

    this.classifyUnmetNeedsInBackground(cacheKey, days, rows.length, grouped);

    return result;
  }

  async updateUnmetNeedPriority(
    needKey: string,
    dto: { priority?: string; note?: string },
  ): Promise<{ updated: boolean; needKey: string }> {
    const priority = this.toPriority(dto.priority);
    if (!priority) {
      return { updated: false, needKey };
    }

    const now = databaseNow();
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO unmet_need_reviews
        (need_key, manual_priority, status, admin_note, created_at, updated_at)
      VALUES
        (${needKey}, ${priority}, 'OPEN', ${dto.note ?? null}, ${now}, ${now})
      ON DUPLICATE KEY UPDATE
        manual_priority = VALUES(manual_priority),
        admin_note = VALUES(admin_note),
        updated_at = VALUES(updated_at)
    `);

    this.clearUnmetNeedsCache();
    return { updated: true, needKey };
  }

  async resolveUnmetNeed(
    needKey: string,
    dto: { resolvedTitle?: string; message?: string; serviceItemId?: string; resolvedBy?: string },
  ): Promise<{ resolved: boolean; needKey: string; notifiedUsers: number }> {
    const rows = await this.getUnmetNeedCandidateRows(365, 1000);
    const matchedRows = rows.filter((row) => this.normalizeNeedKey(row.queryText) === needKey);
    const userIds = [...new Set(matchedRows.map((row) => row.userId).filter(Boolean))];
    const sampleText = matchedRows[0]?.queryText ?? needKey;
    const title = dto.resolvedTitle?.trim() || sampleText;
    const content = dto.message?.trim() || '现在可以回到 AI 办事继续查询或办理。';
    const now = databaseNow();

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO unmet_need_reviews
        (need_key, status, resolved_title, resolved_message, resolved_service_id, resolved_by, resolved_at, created_at, updated_at)
      VALUES
        (${needKey}, 'RESOLVED', ${title}, ${content}, ${dto.serviceItemId ?? null}, ${dto.resolvedBy ?? null}, ${now}, ${now}, ${now})
      ON DUPLICATE KEY UPDATE
        status = 'RESOLVED',
        resolved_title = VALUES(resolved_title),
        resolved_message = VALUES(resolved_message),
        resolved_service_id = VALUES(resolved_service_id),
        resolved_by = VALUES(resolved_by),
        resolved_at = VALUES(resolved_at),
        updated_at = VALUES(updated_at)
    `);

    for (const userId of userIds) {
      await this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO user_notifications
          (id, user_id, need_key, service_item_id, title, content, status, created_at)
        VALUES
          (${this.createNotificationId(userId, needKey)}, ${userId}, ${needKey}, ${dto.serviceItemId ?? null}, ${`你问过的“${title}”已落实`}, ${content}, 'UNREAD', ${now})
        ON DUPLICATE KEY UPDATE
          service_item_id = VALUES(service_item_id),
          title = VALUES(title),
          content = VALUES(content),
          status = 'UNREAD',
          created_at = VALUES(created_at),
          read_at = NULL
      `);
    }

    this.clearUnmetNeedsCache();
    return { resolved: true, needKey, notifiedUsers: userIds.length };
  }

  async archiveUnmetNeed(needKey: string): Promise<{ archived: boolean; needKey: string }> {
    const now = databaseNow();
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO unmet_need_reviews
        (need_key, status, created_at, updated_at)
      VALUES
        (${needKey}, 'ARCHIVED', ${now}, ${now})
      ON DUPLICATE KEY UPDATE
        status = 'ARCHIVED',
        updated_at = VALUES(updated_at)
    `);

    this.clearUnmetNeedsCache();
    return { archived: true, needKey };
  }

  private buildUnmetNeedsResult(
    days: number,
    total: number,
    grouped: ReturnType<MonitorService['groupUnmetNeedRows']>,
    modelGroups: UnmetNeedModelGroup[],
    fallbackStatus: 'local' | 'pending' | 'ready',
    reviewMap = new Map<string, UnmetNeedReviewRow>(),
  ): UnmetNeedsResult {
    const modelByKey = new Map(modelGroups.map((group) => [group.key, group]));
    const items = grouped
      .map((group) => {
        const model = modelByKey.get(group.key);
        const review = reviewMap.get(group.key);
        if (review?.status === 'RESOLVED' || review?.status === 'ARCHIVED') {
          return null;
        }

        return {
          ...group,
          suggestedIntent: model?.suggestedIntent ?? group.queryText,
          suggestedCategory: model?.suggestedCategory ?? this.fallbackCategory(group.queryText),
          priority: review?.manualPriority ?? model?.priority ?? this.fallbackPriority(group.count, group.users),
          reviewStatus: review?.status ?? 'OPEN',
          manualPriority: review?.manualPriority,
          adminNote: review?.adminNote,
          reason: model?.reason ?? this.fallbackUnmetReason(group.action),
          suggestedKeywords: model?.suggestedKeywords ?? this.extractKeywords(group.queryText),
          suggestedAction: model?.status ?? this.fallbackUnmetStatus(group.action),
        };
      })
      .filter(Boolean) as Array<Record<string, unknown>>;

    const classificationStatus =
      modelGroups.length > 0 ? 'ready' : this.miniMaxService.isEnabled() ? fallbackStatus : 'local';

    return {
      days,
      total,
      modelEnabled: this.miniMaxService.isEnabled(),
      classificationStatus,
      items,
      generatedAt: this.formatRuntimeTime(new Date()),
    };
  }

  private classifyUnmetNeedsInBackground(
    cacheKey: string,
    days: number,
    total: number,
    grouped: ReturnType<MonitorService['groupUnmetNeedRows']>,
  ): void {
    if (!this.miniMaxService.isEnabled() || grouped.length === 0 || this.unmetNeedsClassifyInFlight.has(cacheKey)) {
      return;
    }

    this.unmetNeedsClassifyInFlight.add(cacheKey);
    void this.classifyUnmetNeeds(grouped)
      .then(async (modelGroups) => {
        if (modelGroups.length === 0) {
          return;
        }
        const reviewMap = await this.getUnmetNeedReviews(grouped.map((group) => group.key));
        this.unmetNeedsCache = {
          key: cacheKey,
          expiresAt: Date.now() + 10 * 60 * 1000,
          value: this.buildUnmetNeedsResult(days, total, grouped, modelGroups, 'ready', reviewMap),
        };
      })
      .finally(() => {
        this.unmetNeedsClassifyInFlight.delete(cacheKey);
      });
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

  private groupUnmetNeedRows(
    rows: Array<{
      queryText: string;
      responseText: string;
      action: string;
      userId: string;
      userName: string | null;
      userRole: string | null;
      college: string | null;
      createdAt: Date;
    }>,
    limit: number,
  ) {
    const groupMap = new Map<
      string,
      {
        key: string;
        queryText: string;
        count: number;
        users: Set<string>;
        roleCounts: Map<string, number>;
        colleges: Map<string, number>;
        action: string;
        firstAt: Date;
        lastAt: Date;
        samples: Array<{
          queryText: string;
          responseText: string;
          userId: string;
          userName: string;
          userRole: string;
          college?: string;
          createdAt: string;
        }>;
      }
    >();

    for (const row of rows) {
      const key = this.normalizeNeedKey(row.queryText);
      const group = groupMap.get(key) ?? {
        key,
        queryText: row.queryText,
        count: 0,
        users: new Set<string>(),
        roleCounts: new Map<string, number>(),
        colleges: new Map<string, number>(),
        action: row.action,
        firstAt: row.createdAt,
        lastAt: row.createdAt,
        samples: [],
      };

      group.count += 1;
      group.users.add(row.userId);
      const role = row.userRole || '未知身份';
      group.roleCounts.set(role, (group.roleCounts.get(role) ?? 0) + 1);
      if (row.college) {
        group.colleges.set(row.college, (group.colleges.get(row.college) ?? 0) + 1);
      }
      if (row.createdAt < group.firstAt) {
        group.firstAt = row.createdAt;
      }
      if (row.createdAt > group.lastAt) {
        group.lastAt = row.createdAt;
        group.queryText = row.queryText;
        group.action = row.action;
      }
      if (group.samples.length < 3) {
        group.samples.push({
          queryText: row.queryText,
          responseText: row.responseText,
          userId: row.userId,
          userName: row.userName || '匿名用户',
          userRole: role,
          college: row.college ?? undefined,
          createdAt: this.formatDisplayTime(row.createdAt),
        });
      }

      groupMap.set(key, group);
    }

    return [...groupMap.values()]
      .sort((left, right) => right.count - left.count || right.lastAt.getTime() - left.lastAt.getTime())
      .slice(0, limit)
      .map((group) => ({
        key: group.key,
        queryText: group.queryText,
        count: group.count,
        users: group.users.size,
        primaryRole: this.topMapEntry(group.roleCounts)?.[0] ?? '未知身份',
        roleBreakdown: this.mapToRankedObjects(group.roleCounts, 'role'),
        topCollege: this.topMapEntry(group.colleges)?.[0],
        action: group.action,
        firstAt: this.formatDisplayTime(group.firstAt),
        lastAt: this.formatDisplayTime(group.lastAt),
        samples: group.samples,
      }));
  }

  private async getUnmetNeedReviews(keys: string[]) {
    if (keys.length === 0) {
      return new Map<string, UnmetNeedReviewRow>();
    }

    try {
      const rows = await this.prisma.$queryRaw<UnmetNeedReviewRow[]>(Prisma.sql`
        SELECT
          need_key AS needKey,
          manual_priority AS manualPriority,
          status,
          admin_note AS adminNote,
          resolved_title AS resolvedTitle,
          resolved_message AS resolvedMessage,
          resolved_at AS resolvedAt
        FROM unmet_need_reviews
        WHERE need_key IN (${Prisma.join(keys)})
      `);

      return new Map(rows.map((row) => [row.needKey, row]));
    } catch {
      return new Map<string, UnmetNeedReviewRow>();
    }
  }

  private async getUnmetNeedCandidateRows(days: number, limit: number) {
    const from = this.dateFrom(days);
    return this.prisma.$queryRaw<
      Array<{
        queryText: string;
        responseText: string;
        action: string;
        userId: string;
        userName: string | null;
        userRole: string | null;
        college: string | null;
        createdAt: Date;
      }>
    >(Prisma.sql`
      SELECT
        t.query_text AS queryText,
        t.response_text AS responseText,
        t.action,
        t.user_id AS userId,
        p.name AS userName,
        p.role AS userRole,
        p.college AS college,
        t.created_at AS createdAt
      FROM assistant_turns t
      LEFT JOIN user_profiles p ON p.user_id = t.user_id
      WHERE t.created_at >= ${from}
        AND t.action IN ('no_reliable_result', 'role_mismatch')
        AND t.query_text IS NOT NULL
        AND t.query_text <> ''
      ORDER BY t.created_at DESC
      LIMIT ${Math.min(this.maxLimit * 10, Math.max(limit, 100))}
    `);
  }

  private async classifyUnmetNeeds(
    groups: Array<{
      key: string;
      queryText: string;
      count: number;
      users: number;
      primaryRole: string;
      action: string;
      samples: Array<{ queryText: string; responseText: string; userRole: string; createdAt: string }>;
    }>,
  ): Promise<UnmetNeedModelGroup[]> {
    if (groups.length === 0 || !this.miniMaxService.isEnabled()) {
      return [];
    }

    const modelResult = await this.miniMaxService.jsonChat(this.unmetNeedsPrompt(), {
      groups: groups.slice(0, 20).map((group) => ({
        key: group.key,
        query_text: group.queryText,
        count: group.count,
        users: group.users,
        primary_role: group.primaryRole,
        action: group.action,
        samples: group.samples.map((sample) => ({
          query_text: sample.queryText,
          assistant_reply: sample.responseText,
          role: sample.userRole,
          created_at: sample.createdAt,
        })),
      })),
      allowed_categories: ['教务服务', '学生服务', '信息化服务', '保卫服务', '财务服务', '图书馆服务', '后勤服务', '招生服务', '校务服务', '其他'],
      output_schema: {
        groups: [
          {
            key: '归类键',
            suggested_intent: '用户真实想办的事',
            suggested_category: '建议分类',
            priority: 'high|medium|low',
            status: '补充事项库|补关键词|确认入口可用性|身份规则复核|暂不处理',
            reason: '简短原因',
            suggested_keywords: ['关键词'],
          },
        ],
      },
    });

    const rawGroups = Array.isArray(modelResult?.groups) ? modelResult.groups : [];
    return rawGroups
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }
        const record = item as Record<string, unknown>;
        const key = this.toOptionalString(record.key);
        if (!key) {
          return null;
        }
        const group: UnmetNeedModelGroup = {
          key,
          suggestedIntent: this.toOptionalString(record.suggested_intent),
          suggestedCategory: this.toOptionalString(record.suggested_category),
          priority: this.toPriority(record.priority),
          status: this.toOptionalString(record.status),
          reason: this.toOptionalString(record.reason),
          suggestedKeywords: this.toStringArray(record.suggested_keywords).slice(0, 6),
        };
        return group;
      })
      .filter((item): item is UnmetNeedModelGroup => Boolean(item));
  }

  private unmetNeedsPrompt() {
    return [
      '你是安徽农业大学 AI 办事后台的需求归类模型。',
      '输入是未能直接满足的用户提问分组：no_reliable_result 表示事项库没有稳定命中；role_mismatch 表示可能有事项但身份不匹配。',
      '请帮助后台人员判断：应补充事项库、补关键词、确认入口可用性、身份规则复核或暂不处理。',
      '只能基于输入内容归类，不要编造学校已有入口，不要输出 URL。',
      '输出严格 JSON，结构为 {"groups":[...]}。priority 只能是 high、medium、low。',
    ].join('\n');
  }

  private normalizeNeedKey(queryText: string) {
    return queryText
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[，,。.!！？?；;：:“”"'‘’（）()【】\[\]《》<>、/\\|_-]/g, '')
      .replace(/怎么(办|弄|用|查|申请|办理)$/g, '')
      .replace(/如何(办|弄|用|查|申请|办理)$/g, '')
      .slice(0, 40);
  }

  private topMapEntry(map: Map<string, number>) {
    return [...map.entries()].sort((left, right) => right[1] - left[1])[0];
  }

  private mapToRankedObjects(map: Map<string, number>, keyName: string) {
    return [...map.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([name, count]) => ({ [keyName]: name, count }));
  }

  private fallbackCategory(queryText: string) {
    if (/(课程|课表|选课|考试|缓考|成绩|教务|学生证)/.test(queryText)) {
      return '教务服务';
    }
    if (/(宿舍|走读|退宿|请假|销假|困难|补助|心理)/.test(queryText)) {
      return '学生服务';
    }
    if (/(校园网|密码|邮箱|云盘|vpn|软件|服务器|系统|账号)/i.test(queryText)) {
      return '信息化服务';
    }
    if (/(一卡通|缴费|充值|发票|报销|财务)/.test(queryText)) {
      return '财务服务';
    }
    if (/(车辆|门禁|访客|消防|治安|保卫)/.test(queryText)) {
      return '保卫服务';
    }
    if (/(图书|档案|座位|报告厅)/.test(queryText)) {
      return '图书馆服务';
    }

    return '其他';
  }

  private fallbackPriority(count: number, users: number): 'high' | 'medium' | 'low' {
    if (count >= 10 || users >= 5) {
      return 'high';
    }
    if (count >= 3 || users >= 2) {
      return 'medium';
    }
    return 'low';
  }

  private fallbackUnmetStatus(action: string) {
    return action === 'role_mismatch' ? '身份规则复核' : '补充事项库';
  }

  private fallbackUnmetReason(action: string) {
    return action === 'role_mismatch'
      ? '系统找到相似事项，但当前身份不匹配，需要核对面向对象或补充对应身份入口。'
      : '系统没有匹配到稳定可办理事项，建议检查是否需要新增事项或补充关键词。';
  }

  private extractKeywords(queryText: string) {
    const normalized = this.normalizeNeedKey(queryText);
    const keywords = new Set<string>([queryText.trim(), normalized]);
    for (const token of ['成绩', '课表', '选课', '缴费', '宿舍', '请假', '密码', '邮箱', '一卡通', '访客', '消防', '档案']) {
      if (queryText.includes(token)) {
        keywords.add(token);
      }
    }
    return [...keywords].filter(Boolean).slice(0, 6);
  }

  private toOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private toStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : [];
  }

  private toPriority(value: unknown): 'high' | 'medium' | 'low' | undefined {
    if (value === 'high' || value === 'medium' || value === 'low') {
      return value;
    }

    return undefined;
  }

  private clearUnmetNeedsCache() {
    this.unmetNeedsCache = undefined;
  }

  private createNotificationId(userId: string, needKey: string) {
    return `notice_${Buffer.from(`${userId}:${needKey}`).toString('base64url').slice(0, 64)}`;
  }

  private dateFrom(days: number) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  private formatDisplayTime(date: Date) {
    // MySQL DATETIME values are already stored in the database session timezone.
    // Formatting them again with Asia/Shanghai would shift displayed monitor times by +8 hours.
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getUTCFullYear()}/${pad(date.getUTCMonth() + 1)}/${pad(date.getUTCDate())} ${pad(
      date.getUTCHours(),
    )}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
  }

  private formatRuntimeTime(date: Date) {
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: process.env.APP_TIMEZONE || 'Asia/Shanghai',
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
