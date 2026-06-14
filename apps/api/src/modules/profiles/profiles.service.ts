import { Injectable } from '@nestjs/common';
import { OAuthProfileDto } from './oauth-profile.dto';
import { ProfileSummary } from './profile-summary.types';

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
  getSummary(userId: string): ProfileSummary {
    return {
      userId,
      role: '本科生',
      college: '计算机学院',
      grade: '大四',
      campus: '主校区',
      studentStatus: '在校',
      tags: ['毕业生'],
      recentIntents: ['成绩单打印'],
    };
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
      gender: attributes.Gender,
      role: this.parseRole(attributes.GroupName),
      groupName: attributes.GroupName,
      college: attributes.OrgName,
      major: attributes.Speciality,
      className: attributes.Clazz,
      birthDate: attributes.BirthDate,
      oauthRaw: attributes,
    };
  }

  private parseRole(groupName?: string): string | undefined {
    if (!groupName) {
      return undefined;
    }

    const knownRoles = ['本科生', '研究生', '教职工', '教师'];
    return knownRoles.find((role) => groupName.includes(role));
  }
}
