import { Injectable } from '@nestjs/common';
import { databaseNow } from '../../common/time';
import { PrismaService } from '../prisma/prisma.service';
import { OAuthProfileDto } from './oauth-profile.dto';
import { ProfileSummary } from './profile-summary.types';
import { RecordEventDto } from './record-event.dto';
import { SaveMemoryDto } from './save-memory.dto';

export type NormalizedOAuthProfile = {
  userId: string;
  name?: string;
  email?: string;
  phone?: string;
  gender?: string;
  role?: string;
  groupName?: string;
  college?: string;
  major?: string;
  className?: string;
  birthDate?: string;
  oauthRaw: Record<string, string>;
};

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string): Promise<ProfileSummary> {
    try {
      const profile = await this.prisma.userProfile.findUnique({
        where: { userId },
        include: {
          memories: {
            orderBy: { updatedAt: 'desc' },
            take: 10,
          },
          events: {
            where: { eventType: 'ask' },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });

      if (profile) {
        return {
          userId,
          name: profile.name ?? undefined,
          role: profile.role ?? undefined,
          college: profile.college ?? undefined,
          major: profile.major ?? undefined,
          grade: profile.grade ?? undefined,
          campus: profile.campus ?? undefined,
          studentStatus: profile.studentStatus ?? undefined,
          tags: profile.memories.map((memory: any) => memory.memoryValue),
          recentIntents: profile.events
            .map((event: any) => event.queryText)
            .filter((text: unknown): text is string => typeof text === 'string' && Boolean(text)),
        };
      }
    } catch {
      // Local development can run without MySQL; fall back to a stable demo profile.
    }

    return this.getFallbackSummary(userId);
  }

  normalizeOAuthProfile(payload: OAuthProfileDto): NormalizedOAuthProfile {
    const attributes = payload.attributes.reduce<Record<string, string>>((result, item) => {
      const [key, value] = Object.entries(item)[0] ?? [];
      if (key) {
        result[key] = value ?? '';
      }

      return result;
    }, {});

    return {
      userId: payload.id,
      name: attributes.Name,
      email: attributes.Email,
      phone: attributes.Phone || attributes.ContactTel,
      gender: this.normalizeGender(attributes.Gender),
      role: this.parseRole(attributes.GroupName),
      groupName: attributes.GroupName,
      college: attributes.OrgName,
      major: attributes.Speciality,
      className: attributes.Clazz,
      birthDate: attributes.BirthDate,
      oauthRaw: attributes,
    };
  }

  async upsertOAuthProfile(payload: OAuthProfileDto): Promise<NormalizedOAuthProfile> {
    const profile = this.normalizeOAuthProfile(payload);
    const birthDate = profile.birthDate ? new Date(profile.birthDate) : undefined;
    const now = databaseNow();

    await this.prisma.userProfile.upsert({
      where: { userId: profile.userId },
      create: {
        userId: profile.userId,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        gender: profile.gender,
        role: profile.role,
        groupName: profile.groupName,
        college: profile.college,
        major: profile.major,
        className: profile.className,
        birthDate,
        oauthRaw: profile.oauthRaw,
        source: 'oauth',
        createdAt: now,
        updatedAt: now,
      },
      update: {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        gender: profile.gender,
        role: profile.role,
        groupName: profile.groupName,
        college: profile.college,
        major: profile.major,
        className: profile.className,
        birthDate,
        oauthRaw: profile.oauthRaw,
        source: 'oauth',
        updatedAt: now,
      },
    });

    return profile;
  }

  async saveConfirmedMemory(userId: string, dto: SaveMemoryDto) {
    try {
      await this.ensureUserProfile(userId);
      const existingMemory = await (this.prisma.userMemory as any).findFirst({
        where: {
          userId,
          memoryKey: dto.key,
          memoryValue: dto.value,
        },
      });
      const now = databaseNow();
      const memory = existingMemory
        ? await (this.prisma.userMemory as any).update({
            where: { id: existingMemory.id },
            data: {
              confidence: dto.confidence ?? 1,
              source: 'USER_CONFIRMED',
              sensitivity: this.toPrismaSensitivity(dto.sensitivity),
              updatedAt: now,
            },
          })
        : await (this.prisma.userMemory as any).create({
            data: {
              userId,
              memoryType: 'preference',
              memoryKey: dto.key,
              memoryValue: dto.value,
              confidence: dto.confidence ?? 1,
              source: 'USER_CONFIRMED',
              sensitivity: this.toPrismaSensitivity(dto.sensitivity),
              createdAt: now,
              updatedAt: now,
            },
          });

      return {
        saved: true,
        memory,
      };
    } catch {
      return {
        saved: false,
        reason: 'database_unavailable',
      };
    }
  }

  async recordAskEvent(userId: string, message: string) {
    try {
      await this.ensureUserProfile(userId);
      await this.prisma.userEvent.create({
        data: {
          userId,
          eventType: 'ask',
          queryText: message,
          createdAt: databaseNow(),
        },
      });
    } catch {
      // No-op when DB is not reachable; assistant still works in degraded mode.
    }
  }

  async recordUserEvent(userId: string, dto: RecordEventDto) {
    try {
      await this.ensureUserProfile(userId);
      await this.prisma.userEvent.create({
        data: {
          userId,
          eventType: dto.eventType,
          queryText: dto.queryText,
          serviceItemId: dto.serviceItemId,
          metadata: dto.metadata as any,
          createdAt: databaseNow(),
        },
      });

      return { recorded: true };
    } catch {
      return { recorded: false, reason: 'database_unavailable' };
    }
  }

  private async ensureUserProfile(userId: string) {
    await this.prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        source: 'mock',
        createdAt: databaseNow(),
        updatedAt: databaseNow(),
      },
      update: {},
    });
  }

  private toPrismaSensitivity(value?: 'low' | 'medium' | 'high') {
    if (value === 'high') {
      return 'HIGH';
    }

    if (value === 'medium') {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private getFallbackSummary(userId: string): ProfileSummary {
    return {
      userId,
      name: '访客',
      role: '学生',
      college: '智能网关',
      grade: '未知',
      campus: '校内',
      studentStatus: '在校',
      tags: ['待补充'],
      recentIntents: ['默认欢迎语'],
    };
  }

  private parseRole(groupName?: string): string | undefined {
    if (!groupName) {
      return undefined;
    }

    const knownRoles = ['本科生', '研究生', '教职工', '校友', '访客'];
    return knownRoles.find((role) => groupName.includes(role));
  }

  private normalizeGender(gender?: string): string | undefined {
    if (!gender) {
      return undefined;
    }

    const normalized = gender.trim();
    if (normalized === '男' || normalized.toLowerCase() === 'male' || normalized === '1') {
      return '男';
    }

    if (normalized === '女' || normalized.toLowerCase() === 'female' || normalized === '2') {
      return '女';
    }

    return normalized;
  }
}
