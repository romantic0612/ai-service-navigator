import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AiMemoryService } from '../ai-memory/ai-memory.service';
import { ProfileSummary } from '../profiles/profile-summary.types';
import { ServiceItemCard } from '../services/service-item.types';
import { DifyService } from '../dify/dify.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { ServiceItemsService } from '../services/service-items.service';
import { AssistantReply, ProfileUpdateCandidate } from './assistant.types';

const ELECTRICITY_TRANSFER_URL =
  'https://myvpn.ahau.edu.cn:10443/http/webvpn47107d807fd53f8c72c1effc7563ea4f/ZSANAPP/WEB/PowerGridTransferAuth.aspx';

type DormInfoRow = {
  XH: string;
  XM: string | null;
  LD: string | null;
  FJ: string | null;
  CW: string | null;
};

type ElectricityBalanceRow = {
  LD: string | null;
  fjh: string | null;
  sydl: Prisma.Decimal | string | number | null;
  ydlx: string | null;
};

type ElectricityBalanceInfo = {
  usage: 'lighting' | 'airConditioner' | 'unknown';
  usageLabel: string;
  remainingText: string;
};

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly profilesService: ProfilesService,
    private readonly serviceItemsService: ServiceItemsService,
    private readonly difyService: DifyService,
    private readonly aiMemoryService: AiMemoryService,
    private readonly prisma: PrismaService,
  ) {}

  async opening(userId: string) {
    const profile = await this.profilesService.getSummary(userId);
    return this.aiMemoryService.generateOpening(userId, profile);
  }

  async reply(userId: string, message: string): Promise<AssistantReply> {
    const profile = await this.profilesService.getSummary(userId);
    await this.profilesService.recordAskEvent(userId, message);

    if (this.isElectricityTransferQuery(message)) {
      const electricityReply = await this.buildElectricityTransferReply(userId, profile, message);
      await this.recordTurn(userId, message, {
        action: 'recommend_service',
        responseText: electricityReply.message,
        serviceCards: electricityReply.serviceCards,
        intent: '电费转账',
        metadata: {
          matchedBy: 'dorm_info',
          sourceTable: ['xszsxx', 'sssydl'],
        },
      });
      return electricityReply;
    }

    if (this.isServiceRecommendationQuery(message)) {
      const recommendationReply = await this.buildServiceRecommendationReply(userId, profile, message);
      return recommendationReply;
    }

    if (this.aiMemoryService.isGuideQuery(message)) {
      const guide = await this.aiMemoryService.generateGuide(profile, message);
      await this.recordTurn(userId, message, {
        action: 'guide',
        responseText: guide.reply,
        serviceCards: [],
      });
      return {
        action: 'guide',
        message: guide.reply,
        guideSuggestions: guide.suggestions,
        profileUpdateCandidates: [],
      };
    }

    let difyIntent: Awaited<ReturnType<DifyService['recognizeIntent']>> = null;
    let searchQuery = message;
    let searchResult = await this.serviceItemsService.search(searchQuery, profile);

    if (searchResult.items.length === 0) {
      difyIntent = await this.difyService.recognizeIntent(message, profile);
      searchQuery = [message, difyIntent?.intent, difyIntent?.category, ...(difyIntent?.keywords ?? [])]
        .filter(Boolean)
        .join(' ');
      searchResult = await this.serviceItemsService.search(searchQuery, profile);
    }

    const roleMismatchResult =
      searchResult.items.length === 0
        ? await this.serviceItemsService.search(searchQuery, profile, { ignoreRoleFilter: true })
        : undefined;
    const serviceCards = searchResult.items.length > 0 ? searchResult.items : [];

    const profileUpdateCandidates = this.mergeProfileCandidates([
      ...this.extractProfileUpdateCandidates(message),
      ...(difyIntent?.profileUpdateCandidates ?? []),
    ]);

    if (serviceCards.length === 0 && !roleMismatchResult?.items.length) {
      await this.profilesService.recordUserEvent(userId, {
        eventType: 'no_result',
        queryText: message,
        metadata: {
          fallbackUsed: Boolean(difyIntent?.intent),
          intent: difyIntent?.intent,
          category: difyIntent?.category,
        },
      });
      const responseText = '当前问题没匹配到稳定可办理的事项。你可以换一种说法，或补充办理对象、业务类型，我会继续从学校事项库里查。';
      await this.recordTurn(userId, message, {
        action: 'no_reliable_result',
        responseText,
        serviceCards: [],
        usedDify: Boolean(difyIntent?.intent),
        intent: difyIntent?.intent,
        metadata: {
          category: difyIntent?.category,
        },
      });
      return {
        action: 'no_reliable_result',
        message: responseText,
        profileUpdateCandidates,
      };
    }

    if (searchResult.items.length === 0 && roleMismatchResult?.items.length) {
      const alternatives = await this.serviceItemsService.recommendAlternatives(profile, message, 3);
      const messageText = this.buildRoleMismatchMessage(profile, roleMismatchResult.items, alternatives);
      this.aiMemoryService.processTurnInBackground(profile, {
        userId,
        message,
        replyMessage: messageText,
        serviceCards: alternatives,
      });
      await this.recordTurn(userId, message, {
        action: 'role_mismatch',
        responseText: messageText,
        serviceCards: alternatives,
        usedDify: Boolean(difyIntent?.intent),
        intent: difyIntent?.intent,
        metadata: {
          mismatchedServiceIds: roleMismatchResult.items.map((item) => item.id),
        },
      });

      return {
        action: 'role_mismatch',
        message: messageText,
        serviceCards: alternatives,
        profileUpdateCandidates,
      };
    }

    const messageText = this.buildReplyMessage(serviceCards.length, Boolean(difyIntent?.intent), difyIntent?.intent);
    this.aiMemoryService.processTurnInBackground(profile, {
      userId,
      message,
      replyMessage: messageText,
      serviceCards,
    });
    await this.recordTurn(userId, message, {
      action: 'recommend_service',
      responseText: messageText,
      serviceCards,
      usedDify: Boolean(difyIntent?.intent),
      intent: difyIntent?.intent,
      metadata: {
        matchedBy: searchResult.matchedBy,
      },
    });

    return {
      action: 'recommend_service',
      message: messageText,
      serviceCards,
      profileUpdateCandidates,
    };
  }

  private buildReplyMessage(count: number, usedDify: boolean, intent?: string): string {
    if (usedDify && intent) {
      return `已识别到你要办“${intent}”，我给你筛出了 ${count} 个可直接办理入口，先试试看吧。`;
    }

    return `我给你找到了 ${count} 个可直接办理的入口，点开就能开始。`;
  }

  private buildRoleMismatchMessage(
    profile: ProfileSummary,
    mismatchedCards: ServiceItemCard[],
    alternatives: ServiceItemCard[],
  ): string {
    const roleText = profile.role ? `当前身份为【${profile.role}】` : '当前身份未知';
    const targetRoles = [...new Set(mismatchedCards.flatMap((card) => card.targetRoles))].filter(Boolean);
    const targetText = targetRoles.length ? `该事项适配身份为：${targetRoles.join('，')}` : '';
    const alternativeText = alternatives.length
      ? `我没有返回这个不匹配入口，下面只给你当前身份可用的相关事项。`
      : '我没有返回这个不匹配入口，你可以换成当前身份可办理的事项再问。';

    return `这条事项和${roleText}不匹配。${targetText}。${alternativeText}`;
  }

  private async buildServiceRecommendationReply(
    userId: string,
    profile: ProfileSummary,
    message: string,
  ): Promise<AssistantReply> {
    const [guide, serviceCards] = await Promise.all([
      this.aiMemoryService.generateGuide(profile, message),
      this.serviceItemsService.recommendForProfile(profile),
    ]);
    const messageText = this.buildServiceRecommendationMessage(guide.reply, serviceCards);

    await this.recordTurn(userId, message, {
      action: 'guide',
      responseText: messageText,
      serviceCards,
      metadata: {
        route: 'service_recommendation',
        matchedBy: 'profile_recommendation',
      },
    });

    return {
      action: 'guide',
      message: messageText,
      serviceCards,
      guideSuggestions: guide.suggestions,
      profileUpdateCandidates: [],
    };
  }

  private buildServiceRecommendationMessage(
    guideReply: string,
    serviceCards: ServiceItemCard[],
  ): string {
    const cardText = serviceCards.length
      ? `我先给你放 ${serviceCards.length} 个可直接点开的入口。`
      : '我暂时没有筛到可直接点开的入口，你可以补充一个方向，比如缴费、宿舍、学籍、图书馆或网络账号。';
    return `${guideReply}\n${cardText}`;
  }

  private isServiceRecommendationQuery(message: string) {
    const normalized = message.replace(/\s+/g, '');
    return [
      '还有什么',
      '还有哪些',
      '其他事项',
      '其他事情',
      '还有别的',
      '还有没有',
      '能办哪些',
      '可以办哪些',
      '我能办哪些',
      '有什么事项',
      '有哪些事项',
      '推荐事项',
      '推荐一下',
      '帮我推荐',
    ].some((keyword) => normalized.includes(keyword));
  }

  private isElectricityTransferQuery(message: string) {
    const normalized = message.replace(/\s+/g, '');
    return [
      '电费',
      '充电',
      '电费转账',
      '电费充值',
      '充电费',
      '宿舍电',
      '照明费',
      '空调费',
      '空调电',
    ].some((keyword) => normalized.includes(keyword));
  }

  private async buildElectricityTransferReply(
    userId: string,
    profile: ProfileSummary,
    message: string,
  ): Promise<AssistantReply> {
    const dormInfo = await this.getDormInfo(userId);
    const profileName = profile.name || dormInfo?.XM || '同学';
    const requestedUsage = this.detectElectricityUsage(message);

    if (!dormInfo || !dormInfo.LD || !dormInfo.FJ || dormInfo.LD.includes('走读')) {
      const responseText = `${profileName}，我还没有查到稳定的住宿楼栋和房间信息，暂时不能直接告诉你电费转账该选哪个房间。请先联系辅导员或宿管确认住宿信息，再进入电费转账页面操作，避免充错房间。`;
      return {
        action: 'recommend_service',
        message: responseText,
        serviceCards: [this.buildElectricityFallbackCard()],
        profileUpdateCandidates: [],
      };
    }

    const guide = this.parseDormElectricityGuide(dormInfo);
    const electricityBalances = await this.getElectricityBalances(dormInfo);
    if (!guide) {
      const responseText = `${profileName}，我查到了住宿信息，但楼栋编码“${dormInfo.LD}”暂时无法判断属于校本部宿舍还是大学生公寓。请先核对宿舍信息，再进行电费转账。`;
      return {
        action: 'recommend_service',
        message: responseText,
        serviceCards: [this.buildElectricityFallbackCard()],
        profileUpdateCandidates: [],
      };
    }

    const usageText =
      requestedUsage === 'lighting' ? '照明' : requestedUsage === 'airConditioner' ? '空调' : '照明或空调';
    const balanceLines = this.buildElectricityBalanceLines(electricityBalances, requestedUsage);
    const guideSteps = this.buildElectricityGuideSteps(guide, dormInfo, usageText, requestedUsage);
    const responseText = [
      `${profileName}，我已根据住宿表查到你的宿舍：${guide.roomDisplay}。`,
      ...balanceLines,
      '电费转账时请按下面字段填写，避免充错房间：',
      ...guideSteps.map((step, index) => `${index + 1}. ${step}`),
      '如果你只是问电费政策，也请先按这个信息核对房间；真正付款前一定确认楼宇、楼层、房间无误。',
    ].join('\n');

    return {
      action: 'recommend_service',
      message: responseText,
      serviceCards: [this.buildElectricityGuideCard(guide, dormInfo, usageText, requestedUsage, electricityBalances)],
      profileUpdateCandidates: [],
    };
  }

  private async getDormInfo(userId: string): Promise<DormInfoRow | null> {
    const rows = await this.prisma.$queryRaw<DormInfoRow[]>(Prisma.sql`
      SELECT XH, XM, LD, FJ, CW
      FROM xszsxx
      WHERE XH = ${userId}
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  private async getElectricityBalances(dormInfo: DormInfoRow): Promise<ElectricityBalanceInfo[]> {
    if (!dormInfo.LD || !dormInfo.FJ) {
      return [];
    }

    try {
      const rows = await this.prisma.$queryRaw<ElectricityBalanceRow[]>(Prisma.sql`
        SELECT LD, fjh, sydl, ydlx
        FROM sssydl
        WHERE LD = ${dormInfo.LD}
          AND fjh = ${dormInfo.FJ}
      `);

      return rows
        .map((row) => this.normalizeElectricityBalance(row))
        .sort((left, right) => this.electricityUsageOrder(left.usage) - this.electricityUsageOrder(right.usage));
    } catch (error) {
      this.logger.warn(`Failed to read sssydl electricity balance for ${dormInfo.LD}-${dormInfo.FJ}: ${String(error)}`);
      return [];
    }
  }

  private normalizeElectricityBalance(row: ElectricityBalanceRow): ElectricityBalanceInfo {
    const rawUsage = row.ydlx?.trim() || '未知类型';
    const usage = rawUsage.includes('空调') ? 'airConditioner' : rawUsage.includes('照明') ? 'lighting' : 'unknown';
    const usageLabel = usage === 'lighting' ? '照明' : usage === 'airConditioner' ? '空调' : rawUsage;

    return {
      usage,
      usageLabel,
      remainingText: this.formatElectricityBalance(row.sydl),
    };
  }

  private electricityUsageOrder(usage: ElectricityBalanceInfo['usage']) {
    if (usage === 'lighting') {
      return 1;
    }
    if (usage === 'airConditioner') {
      return 2;
    }
    return 3;
  }

  private formatElectricityBalance(value: ElectricityBalanceRow['sydl']) {
    if (value === null || value === undefined || value === '') {
      return '暂无数据';
    }

    const text = String(value);
    const numeric = Number(text);
    if (Number.isFinite(numeric)) {
      return `${Number.isInteger(numeric) ? numeric : numeric.toFixed(2).replace(/\.?0+$/, '')} 度`;
    }

    return `${text} 度`;
  }

  private buildElectricityBalanceLines(
    balances: ElectricityBalanceInfo[],
    requestedUsage: 'lighting' | 'airConditioner' | 'both',
  ) {
    const matchedBalances =
      requestedUsage === 'both' ? balances : balances.filter((balance) => balance.usage === requestedUsage);

    if (matchedBalances.length === 0) {
      const usageText =
        requestedUsage === 'lighting' ? '照明' : requestedUsage === 'airConditioner' ? '空调' : '照明/空调';
      return [`当前暂未从剩余电量表查到该房间的${usageText}剩余电量，下面先给你填写方式。`];
    }

    return [`当前剩余电量：${matchedBalances.map((balance) => `${balance.usageLabel} ${balance.remainingText}`).join('，')}。`];
  }

  private detectElectricityUsage(message: string): 'lighting' | 'airConditioner' | 'both' {
    if (message.includes('空调')) {
      return 'airConditioner';
    }
    if (message.includes('照明')) {
      return 'lighting';
    }
    return 'both';
  }

  private parseDormElectricityGuide(dormInfo: DormInfoRow) {
    const buildingCode = dormInfo.LD?.trim().toUpperCase() ?? '';
    const roomNumber = dormInfo.FJ?.trim() ?? '';
    const match = buildingCode.match(/^([NB])0*(\d+)$/);
    if (!match || !roomNumber) {
      return null;
    }

    const [, prefix, buildingNumber] = match;
    const isMainCampus = prefix === 'N';
    const area = isMainCampus ? '校本部宿舍' : '大学生公寓';
    const floorNumber = this.inferFloorNumber(roomNumber);
    const roomDisplay = isMainCampus ? `${buildingNumber}栋${roomNumber}室` : `K${buildingNumber}-${roomNumber}`;

    return {
      area,
      buildingNumber,
      floorNumber,
      roomNumber,
      roomDisplay,
      lightingBuilding: `${area}·照明_${buildingNumber}栋`,
      airConditionerBuilding: `${area}·空调_${buildingNumber}栋`,
    };
  }

  private inferFloorNumber(roomNumber: string) {
    const trimmed = roomNumber.trim();
    if (/^\d{4,}$/.test(trimmed)) {
      return Number.parseInt(trimmed.slice(0, -2), 10);
    }
    return Number.parseInt(trimmed.slice(0, 1), 10);
  }

  private buildElectricityGuideCard(
    guide: NonNullable<ReturnType<AssistantService['parseDormElectricityGuide']>>,
    dormInfo: DormInfoRow,
    usageText: string,
    requestedUsage: 'lighting' | 'airConditioner' | 'both',
    balances: ElectricityBalanceInfo[],
  ): ServiceItemCard {
    const steps = this.buildElectricityGuideSteps(guide, dormInfo, usageText, requestedUsage);
    const balanceLines = this.buildElectricityBalanceLines(balances, requestedUsage);

    return {
      id: 'electricity-transfer-dorm-guide',
      title: '电费转账填写指南',
      category: '校园缴费',
      description: `已根据住宿信息生成：${guide.roomDisplay}。${balanceLines.join('')} 金额范围 1-500 元，请核对楼宇、楼层、房间后再付款。`,
      targetRoles: ['本科生', '研究生'],
      entryUrl: ELECTRICITY_TRANSFER_URL,
      department: '财务处 / 一卡通微门户',
      contactPerson: '陈老师',
      contactPhone: '0551-65786419',
      serviceTime: '任何时间',
      materials: ['本人住宿信息'],
      processSteps: [...balanceLines, ...steps],
      notice: '请先核对楼宇、楼层、房间后再付款。支付完成后，请持卡前往自助多媒体写卡，完成校园卡余额更新操作。',
      assets: [],
      lastVerifiedAt: '2026-06-17',
    };
  }

  private buildElectricityGuideSteps(
    guide: NonNullable<ReturnType<AssistantService['parseDormElectricityGuide']>>,
    dormInfo: DormInfoRow,
    usageText: string,
    requestedUsage: 'lighting' | 'airConditioner' | 'both',
  ) {
    const steps = [
      `选择区域：${guide.area}`,
      `选择用途：${usageText}`,
    ];

    if (requestedUsage === 'lighting') {
      steps.push(`选择楼宇：${guide.lightingBuilding}`);
    } else if (requestedUsage === 'airConditioner') {
      steps.push(`选择楼宇：${guide.airConditionerBuilding}`);
    } else {
      steps.push(`如果充照明，选择楼宇：${guide.lightingBuilding}`);
      steps.push(`如果充空调，选择楼宇：${guide.airConditionerBuilding}`);
    }

    steps.push(`选择楼层：第${guide.floorNumber}层`);
    steps.push(`选择房间：${guide.roomDisplay}`);
    steps.push('输入转账金额：1-500元');
    steps.push(`付款前再次核对：${dormInfo.XM || '本人'}，${guide.roomDisplay}`);

    return steps;
  }

  private buildElectricityFallbackCard(): ServiceItemCard {
    return {
      id: 'electricity-transfer-dorm-guide',
      title: '电费转账',
      category: '校园缴费',
      description: '当前未能自动匹配住宿信息，请确认宿舍楼栋和房间后再办理。',
      targetRoles: ['本科生', '研究生'],
      entryUrl: ELECTRICITY_TRANSFER_URL,
      department: '财务处 / 一卡通微门户',
      contactPerson: '陈老师',
      contactPhone: '0551-65786419',
      serviceTime: '任何时间',
      materials: ['宿舍楼栋', '楼层', '房间号'],
      processSteps: [
        '进入电费转账页面',
        '依次选择区域、用途、楼宇、楼层、房间',
        '确认信息无误后输入金额并付款',
        '支付完成后，请持卡前往自助多媒体写卡，完成校园卡余额更新操作',
      ],
      notice: '没有查到住宿信息时不要凭印象充值，避免充错房间。',
      assets: [],
      lastVerifiedAt: '2026-06-17',
    };
  }

  private async recordTurn(
    userId: string,
    queryText: string,
    input: {
      action: AssistantReply['action'];
      responseText: string;
      serviceCards?: ServiceItemCard[];
      usedDify?: boolean;
      intent?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    await this.profilesService.recordAssistantTurn(userId, {
      queryText,
      responseText: input.responseText,
      action: input.action,
      serviceCards: input.serviceCards,
      usedDify: input.usedDify,
      intent: input.intent,
      metadata: input.metadata,
    });
  }

  private mergeProfileCandidates(candidates: ProfileUpdateCandidate[]): ProfileUpdateCandidate[] {
    const result = new Map<string, ProfileUpdateCandidate>();
    for (const candidate of candidates) {
      result.set(`${candidate.key}:${candidate.value}`, candidate);
    }

    return [...result.values()];
  }

  private extractProfileUpdateCandidates(message: string): ProfileUpdateCandidate[] {
    const candidates: ProfileUpdateCandidate[] = [];

    if (message.includes('考试')) {
      candidates.push({
        key: 'exam_plan',
        value: '考试',
        confidence: 0.92,
        sensitivity: 'medium',
        needConfirm: true,
        reason: '识别到你可能在提到考试相关场景，可用于后续更精细的提醒。',
      });
    }

    if (message.includes('就业') || message.includes('考研') || message.includes('实习')) {
      candidates.push({
        key: 'interest',
        value: '就业',
        confidence: 0.86,
        sensitivity: 'medium',
        needConfirm: true,
        reason: '识别到你关注就业/实习/考研方向，后续可优先推荐相关入口。',
      });
    }

    return candidates;
  }
}
