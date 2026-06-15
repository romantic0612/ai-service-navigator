<script setup lang="ts">
import {
  ArrowLeft,
  BarChart3,
  Bot,
  Check,
  KeyRound,
  LockKeyhole,
  SearchX,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  UsersRound,
  X,
} from '@lucide/vue';
import { computed, nextTick, ref } from 'vue';
import ServiceCard from './components/ServiceCard.vue';
import {
  getAssistantOpening,
  getMonitorOverview,
  getMonitorSession,
  loginMonitor,
  getProfileSummary,
  saveProfileMemory,
  sendAssistantMessage,
  type AssistantReply,
  type MonitorOverview,
  type ProfileSummary,
  type ProfileUpdateCandidate,
  type MonitorLoginResult,
} from './services/assistant';

type ChatMessage = {
  id: number;
  role: 'assistant' | 'user';
  content: string;
  reply?: AssistantReply;
};

const input = ref('');
const loading = ref(false);
const monitorLoading = ref(false);
const monitorError = ref('');
const monitorLoginLoading = ref(false);
const monitorLoginUserId = ref('');
const monitorLoginAccessCode = ref('');
const monitorLoginError = ref('');
const nextId = ref(1);
const savedCandidates = ref<string[]>([]);
const messages = ref<ChatMessage[]>([]);
const chatPanel = ref<HTMLElement | null>(null);
const isMonitorPage = computed(() => {
  const pathname = window.location.pathname || '/';
  return pathname === '/monitor' || pathname.startsWith('/monitor/');
});
const currentUserId = ref(resolveUserId(isMonitorPage.value));
const profile = ref<ProfileSummary | null>(null);
const displayName = computed(() => profile.value?.name || '我的');
const monitor = ref<MonitorOverview | null>(null);
const monitorDays = ref(30);
const monitorRequireLogin = ref(false);
const monitorTotalClicks = computed(() => monitor.value?.topServices.reduce((sum, item) => sum + item.clicks, 0) ?? 0);
const monitorNoResultTotal = computed(
  () => monitor.value?.noResultQuestions.reduce((sum, item) => sum + item.count, 0) ?? 0,
);
const monitorAskTotal = computed(() => monitor.value?.roleStats.reduce((sum, item) => sum + item.askCount, 0) ?? 0);
const monitorLoginTotal = computed(() => monitor.value?.trend.reduce((sum, item) => sum + item.logins, 0) ?? 0);
const monitorLatestTrend = computed(() => {
  const trend = monitor.value?.trend ?? [];
  return trend[trend.length - 1];
});
const monitorHitRate = computed(() => {
  if (!monitorAskTotal.value) {
    return 100;
  }

  return Math.max(0, Math.round(((monitorAskTotal.value - monitorNoResultTotal.value) / monitorAskTotal.value) * 100));
});
const monitorNoResultRate = computed(() => {
  if (!monitorAskTotal.value) {
    return 0;
  }

  return Math.round((monitorNoResultTotal.value / monitorAskTotal.value) * 100);
});
const monitorTopServicePeak = computed(() => Math.max(...(monitor.value?.topServices.map((item) => item.clicks) ?? [1]), 1));
const monitorTrendPeak = computed(() => {
  const trend = monitor.value?.trend ?? [];
  return Math.max(...trend.flatMap((item) => [item.asks, item.serviceOpens, item.logins]), 1);
});
const monitorHourlyPeak = computed(() => {
  const hourly = monitor.value?.hourlyActivity ?? [];
  return Math.max(...hourly.flatMap((item) => [item.asks, item.logins]), 1);
});
const monitorTopQuestionPeak = computed(() =>
  Math.max(...(monitor.value?.topQuestions.map((item) => item.count) ?? [1]), 1),
);
const monitorVisitorTrend = computed(() =>
  (monitor.value?.trend ?? []).map((item) => ({
    day: item.day,
    visitors: Math.max(item.activeUsers, item.logins),
  })),
);
const monitorVisitorPeak = computed(() => Math.max(...monitorVisitorTrend.value.map((item) => item.visitors), 1));
const monitorRoleShareChart = computed(() => (monitor.value?.roleStats ?? []).filter((item) => item.askCount > 0).slice(0, 6));
const monitorStudentQuestionChart = computed(() => (monitor.value?.studentTopQuestions ?? []).slice(0, 6));
const monitorTeacherQuestionChart = computed(() => (monitor.value?.teacherTopQuestions ?? []).slice(0, 6));
const monitorStudentQuestionPeak = computed(() =>
  Math.max(...monitorStudentQuestionChart.value.map((item) => item.count), 1),
);
const monitorTeacherQuestionPeak = computed(() =>
  Math.max(...monitorTeacherQuestionChart.value.map((item) => item.count), 1),
);

const quickPrompts = computed(() => {
  if (profile.value?.role === '教职工') {
    return ['教职工请假', '电子签章服务', '会议室预约', '科研发票'];
  }

  if (profile.value?.role === '研究生') {
    return ['研究生学籍异动', '研究生论文提交', '学生邮箱服务', '心理咨询预约'];
  }

  return ['云盘', '体育场馆预约', '学生档案查询', '会议室预约'];
});

if (isMonitorPage.value) {
  initMonitorPage();
} else if (currentUserId.value) {
  getProfileSummary(currentUserId.value)
    .then((summary) => {
      profile.value = summary;
      return getAssistantOpening(currentUserId.value);
    })
    .then((opening) => {
      messages.value.push({
        id: nextId.value++,
        role: 'assistant',
        content: opening.opening,
        reply: {
          action: 'guide',
          message: opening.opening,
          guideSuggestions: opening.quickActions,
        },
      });
      scrollToLatestMessage('auto');
    })
    .catch(() => {
      profile.value = null;
      messages.value.push(...defaultWelcomeMessages());
      scrollToLatestMessage('auto');
    });
} else {
  messages.value.push(...defaultWelcomeMessages());
  scrollToLatestMessage('auto');
}

function resolveUserId(isMonitor: boolean) {
  const url = new URL(window.location.href);
  const queryUserId = url.searchParams.get('userId');
  if (queryUserId) {
    window.localStorage.setItem('aibs_user_id', queryUserId);
    url.searchParams.delete('userId');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    return queryUserId;
  }

  const storedUserId = window.localStorage.getItem('aibs_user_id');
  if (storedUserId) {
    if (import.meta.env.PROD && storedUserId === 'demo-user') {
      window.localStorage.removeItem('aibs_user_id');
    } else {
      return storedUserId;
    }
  }

  if (import.meta.env.PROD) {
    if (isMonitor) {
      return '';
    }
    goAuthLogin();
    return '';
  }

  const devUserId = 'demo-user';
  if (storedUserId) {
    return storedUserId;
  }

  return devUserId;
}

function goHome() {
  window.location.href = '/';
}

function goAuthLogin() {
  window.location.href = '/auth/oauth/login';
}

async function initMonitorPage() {
  monitorLoading.value = true;
  try {
    const session = await getMonitorSession();
    if (!session.authorized) {
      monitorRequireLogin.value = true;
      return;
    }

    monitorRequireLogin.value = false;
    await loadMonitorData();
  } catch {
    monitorError.value = '监测数据暂时不可用，请稍后重试';
  } finally {
    monitorLoading.value = false;
  }
}

async function loadMonitorData() {
  monitorError.value = '';
  monitor.value = await getMonitorOverview(monitorDays.value);
}

async function parseLoginResult(result: MonitorLoginResult) {
  if (result.authorized) {
    monitorRequireLogin.value = false;
    monitorLoginError.value = '';
    monitorLoginAccessCode.value = '';
    monitorLoginUserId.value = '';
    monitorLoading.value = true;
    await loadMonitorData()
      .catch(() => {
        monitorError.value = '登录成功，但监测数据暂时不可用，请刷新重试';
      })
      .finally(() => {
        monitorLoading.value = false;
      });
    return;
  }

  monitorLoginError.value = result.message || '登录失败，请检查账号和口令';
}

async function handleMonitorLogin() {
  const userId = monitorLoginUserId.value.trim();
  if (!userId) {
    monitorLoginError.value = '请输入用于授权的用户编号';
    return;
  }

  monitorLoginLoading.value = true;
  monitorLoginError.value = '';
  try {
    const result = await loginMonitor(userId, monitorLoginAccessCode.value.trim() || undefined);
    await parseLoginResult(result);
  } catch (err: unknown) {
    monitorLoginError.value = err instanceof Error ? err.message : '登录失败，请检查网络或配置';
  } finally {
    monitorLoginLoading.value = false;
  }
}

const pendingCandidates = computed(() => {
  return messages.value
    .flatMap((message) => message.reply?.profileUpdateCandidates ?? [])
    .filter((candidate) => !savedCandidates.value.includes(candidateKey(candidate)));
});

async function submitMessage(text = input.value) {
  const message = text.trim();
  if (!message || loading.value) {
    return;
  }

  input.value = '';
  messages.value.push({
    id: nextId.value++,
    role: 'user',
    content: message,
  });

  loading.value = true;
  await scrollToLatestMessage();
  try {
    const reply = await sendAssistantMessage(message, currentUserId.value || 'demo-user');
    messages.value.push({
      id: nextId.value++,
      role: 'assistant',
      content: reply.message,
      reply,
    });
  } catch {
    messages.value.push({
      id: nextId.value++,
      role: 'assistant',
      content: '服务异常，请稍后再试或刷新页面。',
    });
  } finally {
    loading.value = false;
    await scrollToLatestMessage();
  }
}

async function scrollToLatestMessage(behavior: ScrollBehavior = 'smooth') {
  await nextTick();
  const latestMessage = chatPanel.value?.lastElementChild;
  latestMessage?.scrollIntoView({ block: 'end', behavior });
  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior,
  });
}

function candidateKey(candidate: ProfileUpdateCandidate) {
  return `${candidate.key}:${candidate.value}`;
}

async function rememberCandidate(candidate: ProfileUpdateCandidate) {
  await saveProfileMemory(candidate, currentUserId.value || 'demo-user');
  savedCandidates.value.push(candidateKey(candidate));
}

function dismissCandidate(candidate: ProfileUpdateCandidate) {
  savedCandidates.value.push(candidateKey(candidate));
}

function monitorColumnHeight(value: number, total: number) {
  if (!total) {
    return '0%';
  }

  return `${Math.max(10, Math.round((value / total) * 100))}%`;
}

function monitorQuestionColor(index: number, mode: 'student' | 'teacher') {
  const studentColors = ['#ff5a67', '#26d0a8', '#39bff2', '#ffa24a', '#d86cff', '#f6d84a'];
  const teacherColors = ['#1ea7ff', '#ff7f50', '#7d5cff', '#18c29c', '#ff4f8b', '#d6f542'];
  const colors = mode === 'teacher' ? teacherColors : studentColors;
  return colors[index % colors.length];
}

function monitorRoleColor(index: number) {
  const colors = ['#ff5a67', '#26d0a8', '#39bff2', '#ffa24a', '#d86cff', '#f6d84a'];
  return colors[index % colors.length];
}

function monitorRolePieBackground(items: MonitorOverview['roleStats']) {
  const total = items.reduce((sum, item) => sum + item.askCount, 0);
  if (!total) {
    return '#e8f5f3';
  }

  let cursor = 0;
  const segments = items.map((item, index) => {
    const start = cursor;
    const end = cursor + (item.askCount / total) * 360;
    cursor = end;
    return `${monitorRoleColor(index)} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`;
  });

  return `conic-gradient(${segments.join(', ')})`;
}

function monitorShortLabel(text: string) {
  return text.length > 8 ? `${text.slice(0, 8)}…` : text;
}

function monitorLinePoints(values: number[], total: number) {
  if (!values.length) {
    return '';
  }

  const width = 300;
  const height = 132;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  return values
    .map((value, index) => {
      const x = Math.round(index * step);
      const y = Math.round(height - (value / total) * 108 - 8);
      return `${x},${y}`;
    })
    .join(' ');
}

function monitorPointX(index: number, length: number) {
  if (length <= 1) {
    return 150;
  }

  return Math.round(index * (300 / (length - 1)));
}

function monitorPointY(value: number, total: number) {
  return Math.round(124 - (value / total) * 108);
}

function defaultWelcomeMessages(): ChatMessage[] {
  return [
    {
      id: nextId.value++,
      role: 'assistant',
      content: '欢迎，你可以直接问我“我要办理什么”，我会推荐可直接点击办理的入口。',
    },
    {
      id: nextId.value++,
      role: 'assistant',
      content: '先试试：云盘服务、体育场馆预约、学生档案查询。',
    },
  ];
}
</script>

<template>
  <main class="app-shell" :class="{ 'app-shell--monitor': isMonitorPage }">
    <template v-if="isMonitorPage">
      <header class="app-header monitor-header">
        <div class="app-header__identity">
          <div class="brand-mark monitor-brand-mark">
            <BarChart3 :size="19" />
          </div>
          <div>
            <p>AI Service Ops</p>
            <h1>监测看板</h1>
          </div>
        </div>
        <button class="ghost-button monitor-back-button" type="button" @click="goHome">
          <ArrowLeft :size="15" />
          首页
        </button>
      </header>

      <section v-if="monitorRequireLogin" class="monitor-login-card">
        <div class="monitor-login-card__glow"></div>
        <div class="monitor-login-card__top">
          <div class="monitor-lock">
            <ShieldCheck :size="22" />
          </div>
          <div>
            <p>授权访问</p>
            <h2>监测后台登录</h2>
          </div>
        </div>
        <p class="monitor-login-card__desc">查看实时访客量、访问人数趋势、学生和老师常问问题，用数据反推首页痛点推荐。</p>
        <div class="monitor-form">
          <label class="monitor-field">
            <UserRound :size="17" />
            <input v-model="monitorLoginUserId" placeholder="用户ID（如工号/学号）" />
          </label>
          <label class="monitor-field">
            <KeyRound :size="17" />
            <input v-model="monitorLoginAccessCode" type="password" placeholder="访问口令" />
          </label>
          <button :disabled="monitorLoginLoading" type="button" @click="handleMonitorLogin">
            <LockKeyhole :size="17" />
            {{ monitorLoginLoading ? '登录中...' : '进入看板' }}
          </button>
        </div>
        <p class="monitor-login-card__tip">仅白名单账号可进入，数据只用于校内办事体验优化。</p>
        <p v-if="monitorLoginError" class="monitor-empty monitor-empty--error">{{ monitorLoginError }}</p>
      </section>

      <section v-if="monitorLoading" class="monitor-state">
        <span></span>
        监测数据加载中...
      </section>
      <section v-else-if="monitorError" class="monitor-state monitor-state--error">{{ monitorError }}</section>
      <template v-else-if="monitor">
        <section class="monitor-hero monitor-hero--visitors">
          <div>
            <p>实时同步数据库</p>
            <h2>总访客量 {{ monitor.visitorSummary.totalVisitors }}</h2>
          </div>
          <span>今日活跃 {{ monitor.visitorSummary.todayActiveVisitors }}</span>
        </section>

        <section class="monitor-chart-card monitor-chart-card--primary">
          <div class="monitor-card__heading">
            <div>
              <span>Visitor Trend</span>
              <h2>访问人数趋势</h2>
            </div>
            <small>{{ monitor.days }} 天</small>
          </div>
          <div class="monitor-axis-chart">
            <div class="monitor-axis-chart__y">
              <span>{{ monitorVisitorPeak }}</span>
              <span>{{ Math.ceil(monitorVisitorPeak / 2) }}</span>
              <span>0</span>
            </div>
            <div class="monitor-axis-chart__plot">
              <svg viewBox="0 0 300 132" role="img" aria-label="访问人数随时间变化图">
                <polyline
                  :points="monitorLinePoints(monitorVisitorTrend.map((item) => item.visitors), monitorVisitorPeak)"
                  class="monitor-axis-chart__line"
                />
                <circle
                  v-for="(item, index) in monitorVisitorTrend"
                  :key="item.day"
                  :cx="monitorPointX(index, monitorVisitorTrend.length)"
                  :cy="monitorPointY(item.visitors, monitorVisitorPeak)"
                  r="4"
                />
              </svg>
              <div class="monitor-axis-chart__x">
                <span v-for="item in monitorVisitorTrend" :key="item.day">{{ item.day }}</span>
              </div>
            </div>
          </div>
          <div class="monitor-chart-summary">
            <article v-for="item in monitorVisitorTrend" :key="item.day">
              <strong>{{ item.visitors }}</strong>
              <span>{{ item.day }} 人数</span>
            </article>
          </div>
        </section>

        <section class="monitor-card monitor-card--pie">
          <div class="monitor-card__heading">
            <div>
              <span>Audience Share</span>
              <h2>身份占比</h2>
            </div>
            <small>{{ monitor.days }} 天</small>
          </div>
          <p v-if="!monitorRoleShareChart.length" class="monitor-empty">暂无身份统计数据</p>
          <div v-else class="monitor-pie-chart">
            <div class="monitor-pie-chart__visual">
              <div class="monitor-pie-chart__ring" :style="{ background: monitorRolePieBackground(monitorRoleShareChart) }">
                <span>{{ monitorAskTotal }}</span>
                <small>提问</small>
              </div>
            </div>
            <div class="monitor-pie-chart__legend">
              <article
                v-for="(item, index) in monitorRoleShareChart"
                :key="item.role"
                :style="{ '--chart-color': monitorRoleColor(index) }"
              >
                <div>
                  <i></i>
                  <strong>{{ item.role }}</strong>
                </div>
                <span>{{ item.rate }}%</span>
                <small>{{ item.askCount }} 条 / {{ item.affectedUsers }} 人</small>
              </article>
            </div>
          </div>
        </section>

        <section class="monitor-card monitor-card--question-chart">
          <div class="monitor-card__heading">
            <div>
              <span>Student Questions</span>
              <h2>学生常问什么</h2>
            </div>
            <small>{{ monitor.days }} 天</small>
          </div>
          <p v-if="!monitor.studentTopQuestions.length" class="monitor-empty">暂无学生提问数据</p>
          <div v-else class="monitor-column-chart" aria-label="学生常问问题柱状图">
            <div class="monitor-column-chart__legend">
              <span
                v-for="(item, index) in monitorStudentQuestionChart"
                :key="item.queryText"
                :style="{ '--chart-color': monitorQuestionColor(index, 'student') }"
              >
                <i></i>{{ monitorShortLabel(item.queryText) }}
              </span>
            </div>
            <div class="monitor-column-chart__plot">
              <article
                v-for="(item, index) in monitorStudentQuestionChart"
                :key="item.queryText"
                :style="{ '--chart-color': monitorQuestionColor(index, 'student') }"
              >
                <strong>{{ item.count }}</strong>
                <div>
                  <i :style="{ height: monitorColumnHeight(item.count, monitorStudentQuestionPeak) }"></i>
                </div>
                <span>{{ monitorShortLabel(item.queryText) }}</span>
              </article>
            </div>
            <div class="monitor-column-chart__details">
              <div v-for="item in monitorStudentQuestionChart" :key="item.queryText">
                <strong>{{ item.queryText }}</strong>
                <span>{{ item.users }} 人问过 · 最近 {{ item.latestAt }}</span>
              </div>
            </div>
            <p v-if="monitor.studentTopQuestions.length > monitorStudentQuestionChart.length" class="monitor-chart-note">
              已展示前 {{ monitorStudentQuestionChart.length }} 个高频问题
            </p>
          </div>
        </section>

        <section class="monitor-card monitor-card--question-chart">
          <div class="monitor-card__heading">
            <div>
              <span>Teacher Questions</span>
              <h2>老师常问什么</h2>
            </div>
            <small>{{ monitor.days }} 天</small>
          </div>
          <p v-if="!monitor.teacherTopQuestions.length" class="monitor-empty">暂无老师提问数据</p>
          <div v-else class="monitor-column-chart monitor-column-chart--teacher" aria-label="老师常问问题柱状图">
            <div class="monitor-column-chart__legend">
              <span
                v-for="(item, index) in monitorTeacherQuestionChart"
                :key="item.queryText"
                :style="{ '--chart-color': monitorQuestionColor(index, 'teacher') }"
              >
                <i></i>{{ monitorShortLabel(item.queryText) }}
              </span>
            </div>
            <div class="monitor-column-chart__plot">
              <article
                v-for="(item, index) in monitorTeacherQuestionChart"
                :key="item.queryText"
                :style="{ '--chart-color': monitorQuestionColor(index, 'teacher') }"
              >
                <strong>{{ item.count }}</strong>
                <div>
                  <i :style="{ height: monitorColumnHeight(item.count, monitorTeacherQuestionPeak) }"></i>
                </div>
                <span>{{ monitorShortLabel(item.queryText) }}</span>
              </article>
            </div>
            <div class="monitor-column-chart__details">
              <div v-for="item in monitorTeacherQuestionChart" :key="item.queryText">
                <strong>{{ item.queryText }}</strong>
                <span>{{ item.users }} 人问过 · 最近 {{ item.latestAt }}</span>
              </div>
            </div>
            <p v-if="monitor.teacherTopQuestions.length > monitorTeacherQuestionChart.length" class="monitor-chart-note">
              已展示前 {{ monitorTeacherQuestionChart.length }} 个高频问题
            </p>
          </div>
        </section>
      </template>
    </template>

    <template v-else>
      <header class="app-header">
        <div class="app-header__identity">
          <div class="brand-mark">
            <Sparkles :size="19" />
          </div>
          <div>
            <h1>AI办事</h1>
          </div>
        </div>
        <button class="ghost-button" type="button">{{ displayName }}</button>
      </header>

      <section ref="chatPanel" class="chat-panel" aria-label="AI办事对话">
        <div v-for="message in messages" :key="message.id" class="message-row" :class="`message-row--${message.role}`">
          <div v-if="message.role === 'assistant'" class="avatar">
            <Bot :size="17" />
          </div>
          <div class="message-bubble">
            <p>{{ message.content }}</p>
            <div v-if="message.reply?.serviceCards?.length" class="service-list">
              <ServiceCard
                v-for="card in message.reply.serviceCards"
                :key="card.id"
                :card="card"
                :user-id="currentUserId || 'demo-user'"
              />
            </div>
            <div v-if="message.reply?.guideSuggestions?.length" class="guide-suggestions">
              <button
                v-for="suggestion in message.reply.guideSuggestions"
                :key="suggestion"
                type="button"
                @click="submitMessage(suggestion)"
              >
                {{ suggestion }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="loading" class="message-row message-row--assistant">
          <div class="avatar">
            <Bot :size="17" />
          </div>
          <div class="message-bubble message-bubble--loading">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </section>

      <section v-if="pendingCandidates.length" class="memory-strip" aria-label="画像保存提示">
        <div>
          <strong>画像提醒</strong>
          <p>{{ pendingCandidates[0].reason }}</p>
        </div>
        <div class="memory-strip__actions">
          <button type="button" aria-label="保存画像" @click="rememberCandidate(pendingCandidates[0])">
            <Check :size="16" />
          </button>
          <button type="button" aria-label="暂不保存" @click="dismissCandidate(pendingCandidates[0])">
            <X :size="16" />
          </button>
        </div>
      </section>

      <section class="quick-prompts" aria-label="快速提问">
        <button v-for="prompt in quickPrompts" :key="prompt" type="button" @click="submitMessage(prompt)">
          {{ prompt }}
        </button>
      </section>

      <form class="composer" @submit.prevent="submitMessage()">
        <input v-model="input" type="text" placeholder="请直接提问，比如：云盘怎么用" autocomplete="off" />
        <button type="submit" :disabled="loading || !input.trim()" aria-label="发送">
          <Send :size="18" />
        </button>
      </form>
    </template>
  </main>
</template>

