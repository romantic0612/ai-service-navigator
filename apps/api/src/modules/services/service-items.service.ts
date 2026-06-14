import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileSummary } from '../profiles/profile-summary.types';
import { ServiceItemCard, ServiceSearchResult } from './service-item.types';

type DemoServiceItem = Omit<ServiceItemCard, 'assets' | 'targetRoles'> & {
  assets?: ServiceItemCard['assets'];
  targetRoles?: ServiceItemCard['targetRoles'];
  searchTerms: string[];
};

export const demoItems: DemoServiceItem[] = [
  {
    id: 'principal-secretary-mailbox',
    title: '书记校长信箱',
    category: '校务服务',
    description:
      '书记校长信箱平台是在校师生与学校沟通交流的重要渠道，是学校联系师生、服务师生、凝聚师生的重要平台，您的来信学校将按规定处理，并尽快向您答复。',
    handlerCount: undefined,
    entryUrl: 'https://xzxx.ahau.edu.cn/hmbwebapp/pmb/pmbhome/home.html?random=0.26669100176579286',
    department: '党政办公室',
    contactPerson: '岳老师',
    contactPhone: '0551-65786020',
    serviceTime: '工作日正常办公时间',
    basis: '-',
    materials: ['实名来信人员信息', '简明扼要、事实清楚、诉求明确的来信内容'],
    processSteps: [
      '阅读写信须知',
      '实名填写来信人员信息',
      '按照一信一事原则描述意见、建议、咨询或诉求',
      '学校按规定处理并尽快答复',
      '流程结束后对处理结果作出客观评价',
    ],
    notice:
      '来信应遵守宪法、法律、法规和社会公德，用语文明友善，不得捏造、歪曲事实。已经或依法应当通过诉讼、仲裁、行政复议等法定途径解决的事项，以及与学校职责无关的个人问题，不予受理。',
    lastVerifiedAt: '2026-06-14',
    searchTerms: ['书记校长信箱', '书记信箱', '校长信箱', '意见建议', '投诉', '咨询', '反馈', '学校沟通'],
  },
  {
    id: 'cloud-drive-service',
    title: '云盘服务',
    category: '信息化服务',
    description: '为师生提供大容量文件存储服务。每个用户云盘容量默认 1000GB。',
    entryUrl: 'https://pan.ahau.edu.cn/cloudservice/home.html',
    department: '数据管理处（信息化办公室）',
    contactPerson: '许老师',
    contactPhone: '0551-65786196',
    serviceTime: '任何时间',
    basis: '-',
    materials: ['已激活的数智安农账号'],
    processSteps: [
      '师生在数智安农账号激活后，即具有云盘使用权限',
      '进入“数智安农 / 安心办 / 云盘服务”',
      '申请或进入云盘使用',
      '使用前可先查看图文或视频教程',
    ],
    notice: '如需了解使用方法，请先参阅云盘图文教程或使用介绍视频。',
    lastVerifiedAt: '2026-06-14',
    searchTerms: ['云盘', '网盘', '文件存储', '大容量', '数智安农', '信息化', '数据管理处'],
  },
  {
    id: 'sports-venue-reservation',
    title: '体育场馆预约',
    category: '校园生活',
    description:
      '为进一步提升学校体育场馆的使用效能，面向在校学生在非教学时间段提供场地预约服务，包含校本部第三运动场羽毛球馆、九华山路校区乒羽运动馆等场地。',
    entryUrl:
      'https://my.ahau.edu.cn/default/work/process/processManager/managePageIndex.jsp?businessCode=ahau_cgyyxt',
    department: '体育部',
    contactPerson: '体育场馆管理人员',
    contactPhone: '校本部李老师：0551-65786023；九华山路校区高老师：18361228019',
    serviceTime: '工作日正常办公时间',
    basis: '-',
    materials: ['数智安农账号', '预约时间段'],
    processSteps: [
      '在校学生通过数智安农“体育场馆预约”提交预约',
      '每生每天可以预定不超过一小时',
      '每天中午 12 时开放预约本日 12 时以后及次日空闲场地',
      '如显示预约时间为空白，表示场地已全部预约满，可于次日中午 12:00 后预约',
      '如不能按预约时间来馆锻炼，须于预约时间 2 小时前取消',
    ],
    notice: '九华山路校区体育场馆资源有限，仅限九华山路校区学生预约使用。未按要求取消预约，后续可能被限制预约。',
    lastVerifiedAt: '2026-06-14',
    searchTerms: ['体育场馆', '场馆预约', '羽毛球', '乒乓球', '运动场', '体育部', '九华山路校区'],
  },
  {
    id: 'meeting-room-reservation',
    title: '会议室在线预约',
    category: '校园服务',
    description:
      '为在校师生提供会议室预约服务，服务范围包含安徽农业大学本部各教学办公楼宇、各单位部门已登记管理员信息并开放服务的会议室，以及九华山路校区综合楼、1 号楼。',
    handlerCount: 7354,
    entryUrl:
      'https://my.ahau.edu.cn/default/work/process/processManager/managePageIndex.jsp?businessCode=ahau_hyszxyygl',
    department: '国有资产管理处、采购与招标中心',
    contactPerson: '各会议室管理员老师',
    contactPhone: '-',
    serviceTime: '工作日正常办公时间',
    basis: '-',
    materials: ['数智安农账号', '预约会议室信息', '使用时间段'],
    processSteps: ['进入会议室在线预约系统', '选择开放预约的会议室', '填写使用时间和预约信息', '提交后等待管理员处理'],
    notice: '具体会议室开放范围和管理员要求，以系统内显示为准。',
    lastVerifiedAt: '2026-06-14',
    searchTerms: ['会议室', '会议室预约', '在线预约', '国资处', '采购与招标中心', '九华山路校区'],
  },
  {
    id: 'student-archive-destination-query',
    title: '学生档案去向查询',
    category: '档案服务',
    description: '提供学生档案去向在线查询服务。',
    entryUrl: 'https://archxs.ahau.edu.cn/#/queryStudentByNet',
    department: '图书馆、档案馆',
    contactPerson: '张老师',
    contactPhone: '0551-65786525',
    serviceTime: '任何时间',
    basis: '-',
    materials: ['学生身份信息'],
    processSteps: ['进入学生档案去向查询页面', '按页面要求填写身份信息', '提交查询并查看档案去向结果'],
    notice: '档案去向信息以档案馆系统查询结果为准。',
    lastVerifiedAt: '2026-06-14',
    searchTerms: ['学生档案', '档案去向', '档案查询', '毕业档案', '档案馆', '图书馆档案馆'],
  },
  {
    id: 'student-card-reissue',
    title: '学生证补办',
    category: '学籍',
    description: '适用于学生证遗失、损坏后的线上补办申请。',
    entryUrl: 'https://example.edu.cn/student-card/reissue',
    department: '学生处',
    materials: ['身份证明', '近期证件照', '补办申请说明'],
    processSteps: ['登录办事系统', '填写补办申请', '学院审核', '学生处制证或领取'],
    notice: '办理入口和材料要求需要以学校最新通知为准。',
    lastVerifiedAt: '2026-06-14',
    searchTerms: ['学生证', '补办学生证', '学生证丢了', '学生证损坏', '学籍'],
  },
  {
    id: 'campus-card-loss',
    title: '校园卡挂失与补办',
    category: '后勤',
    description: '适用于校园卡遗失后的挂失、解挂、补卡。',
    entryUrl: 'https://example.edu.cn/card/loss',
    department: '校园卡中心',
    materials: ['本人有效身份证件'],
    processSteps: ['先进行线上挂失', '确认余额和身份信息', '提交补卡申请', '按通知领取新卡'],
    notice: '如果涉及账户余额，请优先完成挂失。',
    lastVerifiedAt: '2026-06-14',
    searchTerms: ['校园卡', '一卡通', '饭卡', '挂失', '补卡', '卡丢了'],
  },
  {
    id: 'transcript-print',
    title: '成绩单打印',
    category: '教务',
    description: '适用于升学、就业、出国等场景的成绩单查询与打印。',
    entryUrl: 'https://example.edu.cn/academic/transcript',
    department: '教务处',
    materials: ['学生账号登录'],
    processSteps: ['进入教务系统', '选择成绩单打印', '确认用途和语言', '下载或预约打印'],
    notice: '如需盖章版，请查看教务处具体说明。',
    lastVerifiedAt: '2026-06-14',
    searchTerms: ['成绩单', '打印成绩单', '成绩证明', '考研', '升学', '出国', '教务'],
  },
  {
    id: 'dorm-repair',
    title: '宿舍报修',
    category: '后勤',
    description: '适用于宿舍水电、门窗、家具、网络等问题报修。',
    entryUrl: 'https://example.edu.cn/dorm/repair',
    department: '后勤服务中心',
    materials: ['宿舍楼栋', '房间号', '故障照片'],
    processSteps: ['填写报修信息', '上传照片', '等待派单', '维修完成后评价'],
    notice: '紧急安全问题建议同步联系宿管或后勤值班电话。',
    lastVerifiedAt: '2026-06-14',
    searchTerms: ['宿舍', '报修', '维修', '水电', '门窗', '家具', '网络', '后勤'],
  },
];

@Injectable()
export class ServiceItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(
    query: string,
    profile?: ProfileSummary,
    options: { ignoreRoleFilter?: boolean } = {},
  ): Promise<ServiceSearchResult> {
    const normalizedQuery = query.trim().toLowerCase();
    const allItems = await this.getSearchableItems();
    const searchableItems = options.ignoreRoleFilter ? allItems : this.filterByProfile(allItems, profile);

    if (!normalizedQuery) {
      return { items: searchableItems.slice(0, 3).map((item) => this.toCard(item)), matchedBy: 'mock' };
    }

    const scoredItems = searchableItems
      .map((item) => ({
        item,
        score: this.scoreItem(item, normalizedQuery),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);
    const resultItems = this.compactScoredItems(scoredItems).map(({ item }) => this.toCard(item));

    return {
      items: resultItems,
      matchedBy: resultItems.length > 0 ? 'keyword' : 'mock',
    };
  }

  async recommendForProfile(profile: ProfileSummary): Promise<ServiceItemCard[]> {
    const items = this.filterByProfile(await this.getSearchableItems(), profile);
    const tags = profile.tags;

    if (tags.includes('毕业生') || tags.includes('关注考研')) {
      return items.filter((item) => item.id === 'transcript-print').map((item) => this.toCard(item));
    }

    return items.slice(0, 3).map((item) => this.toCard(item));
  }

  private scoreItem(item: DemoServiceItem, query: string): number {
    const normalizedQuery = this.normalizeSearchText(query);
    const terms = [item.title, item.category, ...item.searchTerms]
      .map((term) => this.normalizeSearchText(term))
      .filter(Boolean);
    let baseScore = 0;
    const title = this.normalizeSearchText(item.title);
    const category = this.normalizeSearchText(item.category);

    if (normalizedQuery === title || normalizedQuery.includes(title)) {
      baseScore += 160;
    } else if (title.includes(normalizedQuery)) {
      baseScore += 120;
    } else {
      const titleSimilarity = this.ngramSimilarity(normalizedQuery, title);
      if (titleSimilarity >= 0.58) {
        baseScore += Math.round(100 * titleSimilarity);
      }
    }

    if (normalizedQuery.includes(category) || category.includes(normalizedQuery)) {
      baseScore += 18;
    }

    return terms.reduce((score, term) => {
      if (term.length < 2) {
        return score;
      }

      if (normalizedQuery.includes(term) || term.includes(normalizedQuery)) {
        return score + term.length + 5;
      }

      const similarity = this.ngramSimilarity(normalizedQuery, term);
      if (similarity >= 0.62) {
        return score + Math.round(40 * similarity);
      }

      return score;
    }, baseScore);
  }

  private normalizeSearchText(value: string): string {
    return value
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[，,。.!！？?；;：:“”"'‘’（）()【】\[\]《》<>、/\\|_-]/g, '')
      .replace(/教室/g, '教师')
      .replace(/老师/g, '教师')
      .replace(/導師/g, '导师')
      .replace(/導/g, '导')
      .replace(/師/g, '师');
  }

  private ngramSimilarity(left: string, right: string): number {
    if (!left || !right) {
      return 0;
    }

    if (left === right) {
      return 1;
    }

    const leftGrams = this.toNgrams(left);
    const rightGrams = this.toNgrams(right);
    const intersection = [...leftGrams].filter((gram) => rightGrams.has(gram)).length;
    const union = new Set([...leftGrams, ...rightGrams]).size;

    return union === 0 ? 0 : intersection / union;
  }

  private toNgrams(value: string): Set<string> {
    if (value.length <= 2) {
      return new Set([value]);
    }

    const grams = new Set<string>();
    for (let index = 0; index < value.length - 1; index += 1) {
      grams.add(value.slice(index, index + 2));
    }

    return grams;
  }

  private compactScoredItems<T extends { score: number }>(scoredItems: T[]): T[] {
    if (scoredItems.length <= 1) {
      return scoredItems;
    }

    const [top, second] = scoredItems;
    if (top.score >= 35 && top.score >= second.score * 1.35) {
      return [top];
    }

    return scoredItems.slice(0, 3);
  }

  private filterByProfile(items: DemoServiceItem[], profile?: ProfileSummary): DemoServiceItem[] {
    if (!profile?.role) {
      return items;
    }

    return items.filter((item) => this.isRoleAllowed(item.targetRoles, profile.role));
  }

  private isRoleAllowed(targetRoles?: string[], role?: string): boolean {
    if (!targetRoles?.length || !role) {
      return true;
    }

    const normalizedRole = role.trim();
    const allowedRoles = targetRoles.map((targetRole) => targetRole.trim());

    if (allowedRoles.includes(normalizedRole)) {
      return true;
    }

    if (allowedRoles.some((allowedRole) => allowedRole.includes(normalizedRole))) {
      return true;
    }

    if (normalizedRole === '教师' && allowedRoles.includes('教职工')) {
      return true;
    }

    return false;
  }

  private toCard(item: DemoServiceItem): ServiceItemCard {
    const { searchTerms: _searchTerms, ...card } = item;
    return {
      ...card,
      assets: card.assets ?? [],
      targetRoles: card.targetRoles ?? [],
    };
  }

  private async getSearchableItems(): Promise<DemoServiceItem[]> {
    try {
      const serviceItems = await this.prisma.serviceItem.findMany({
        where: { status: 'ENABLED' },
        include: {
          assets: {
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (serviceItems.length === 0) {
        return demoItems;
      }

      return serviceItems.map((item: any) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        description: item.description ?? undefined,
        handlerCount: item.handlerCount ?? undefined,
        targetRoles: this.toStringArray(item.targetRoles),
        entryUrl: item.entryUrl,
        department: item.department ?? undefined,
        contactPerson: item.contactPerson ?? undefined,
        contactPhone: item.contactPhone ?? undefined,
        serviceTime: item.serviceTime ?? undefined,
        basis: item.basis ?? undefined,
        materials: this.toStringArray(item.materials),
        processSteps: this.toStringArray(item.processSteps),
        notice: item.notice ?? undefined,
        assets: Array.isArray(item.assets)
          ? item.assets.map((asset: any) => ({
              id: asset.id,
              assetType: asset.assetType,
              title: asset.title ?? undefined,
              url: asset.url,
              altText: asset.altText ?? undefined,
            }))
          : [],
        lastVerifiedAt: item.lastVerifiedAt?.toISOString().slice(0, 10),
        searchTerms: this.toStringArray(item.keywords),
      }));
    } catch {
      return demoItems;
    }
  }

  private toStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }
}
