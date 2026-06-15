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

const quickPrompts = ['云盘', '体育场馆预约', '学生档案查询', '会议室预约'];

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

function monitorBarWidth(value: number, total: number) {
  if (!total) {
    return '0%';
  }

  return `${Math.max(8, Math.round((value / total) * 100))}%`;
}

function monitorLinePoints(values: number[], total: number) {
  if (!values.length) {
    return '';
  }

  const width = 300;
  const height = 84;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  return values
    .map((value, index) => {
      const x = Math.round(index * step);
      const y = Math.round(height - (value / total) * 68 - 8);
      return `${x},${y}`;
    })
    .join(' ');
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
        <p class="monitor-login-card__desc">查看事项点击、无结果问题和入口异常数据，帮助我们判断哪些办事最痛、哪里最卡。</p>
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
        <section class="monitor-hero">
          <div>
            <p>过去 {{ monitor.days }} 天</p>
            <h2>实时使用趋势</h2>
          </div>
          <span>{{ monitor.updatedAt }}</span>
        </section>

        <section class="monitor-metrics" aria-label="监测指标概览">
          <article>
            <TrendingUp :size="18" />
            <span>办理跳转</span>
            <strong>{{ monitorTotalClicks }}</strong>
          </article>
          <article>
            <Target :size="18" />
            <span>AI命中率</span>
            <strong>{{ monitorHitRate }}%</strong>
          </article>
          <article>
            <SearchX :size="18" />
            <span>无结果率</span>
            <strong>{{ monitorNoResultRate }}%</strong>
          </article>
          <article>
            <UsersRound :size="18" />
            <span>登录/活跃</span>
            <strong>{{ monitorLoginTotal }}</strong>
          </article>
        </section>

        <section class="monitor-chart-card">
          <div class="monitor-card__heading">
            <div>
              <span>Trend</span>
              <h2>访问是否在增加</h2>
            </div>
            <small>最新 {{ monitorLatestTrend?.day || '-' }}</small>
          </div>
          <div class="monitor-line-chart">
            <svg viewBox="0 0 300 92" role="img" aria-label="每日提问和办理跳转趋势">
              <polyline
                :points="monitorLinePoints(monitor.trend.map((item) => item.asks), monitorTrendPeak)"
                class="monitor-line-chart__asks"
              />
              <polyline
                :points="monitorLinePoints(monitor.trend.map((item) => item.serviceOpens), monitorTrendPeak)"
                class="monitor-line-chart__opens"
              />
            </svg>
          </div>
          <div class="monitor-chart-bars">
            <div v-for="item in monitor.trend" :key="item.day">
              <span
                class="monitor-chart-bars__login"
                :style="{ height: monitorBarWidth(item.logins, monitorTrendPeak) }"
                :title="`${item.day} 登录 ${item.logins}`"
              ></span>
              <small>{{ item.day }}</small>
            </div>
          </div>
          <div class="monitor-chart-legend">
            <span><i class="legend-ask"></i>提问</span>
            <span><i class="legend-open"></i>办理跳转</span>
            <span><i class="legend-login"></i>登录/活跃</span>
          </div>
        </section>

        <section class="monitor-chart-card">
          <div class="monitor-card__heading">
            <div>
              <span>Time Slot</span>
              <h2>哪个时间段使用最多</h2>
            </div>
            <small>24 小时</small>
          </div>
          <div class="monitor-hour-grid">
            <div v-for="item in monitor.hourlyActivity" :key="item.hour">
              <span :style="{ height: monitorBarWidth(item.asks + item.logins, monitorHourlyPeak) }"></span>
              <small v-if="item.hour % 4 === 0">{{ item.hour }}</small>
            </div>
          </div>
        </section>

        <section class="monitor-card monitor-card--rank">
          <div class="monitor-card__heading">
            <div>
              <span>Hot Services</span>
              <h2>事项点击排行</h2>
            </div>
            <small>{{ monitor.days }} 天</small>
          </div>
          <p v-if="!monitor.topServices.length" class="monitor-empty">暂无数据</p>
          <ul v-else class="monitor-list monitor-list--rank">
            <li v-for="(item, index) in monitor.topServices" :key="item.serviceItemId">
              <b>{{ index + 1 }}</b>
              <div>
                <strong>{{ item.title }}</strong>
                <small>最新：{{ item.lastClick }}</small>
                <i :style="{ width: monitorBarWidth(item.clicks, monitorTopServicePeak) }"></i>
              </div>
              <span>{{ item.clicks }} 次</span>
            </li>
          </ul>
        </section>

        <section class="monitor-card">
          <div class="monitor-card__heading">
            <div>
              <span>Top Questions</span>
              <h2>学生问什么最多</h2>
            </div>
            <small>{{ monitor.days }} 天</small>
          </div>
          <p v-if="!monitor.topQuestions.length" class="monitor-empty">暂无提问数据</p>
          <ul v-else class="monitor-list monitor-list--questions">
            <li v-for="item in monitor.topQuestions" :key="item.queryText">
              <div>
                <strong>{{ item.queryText }}</strong>
                <small>{{ item.users }} 人问过 · 最近 {{ item.latestAt }}</small>
                <i :style="{ width: monitorBarWidth(item.count, monitorTopQuestionPeak) }"></i>
              </div>
              <span>{{ item.count }} 次</span>
            </li>
          </ul>
        </section>

        <section class="monitor-card">
          <div class="monitor-card__heading">
            <div>
              <span>Audience</span>
              <h2>按身份统计</h2>
            </div>
          </div>
          <p v-if="!monitor.roleStats.length" class="monitor-empty">暂无数据</p>
          <ul v-else class="monitor-list">
            <li v-for="item in monitor.roleStats" :key="item.role">
              <strong>{{ item.role }}</strong>
              <span>提问 {{ item.askCount }} 条 / {{ item.affectedUsers }} 人</span>
              <small>{{ item.rate }}%</small>
            </li>
          </ul>
        </section>

        <section class="monitor-card">
          <div class="monitor-card__heading">
            <div>
              <span>Missing Answers</span>
              <h2>无结果问题</h2>
            </div>
            <small>{{ monitor.days }} 天</small>
          </div>
          <p v-if="!monitor.noResultQuestions.length" class="monitor-empty">暂无无结果问题</p>
          <ul v-else class="monitor-list">
            <li v-for="item in monitor.noResultQuestions" :key="item.queryText">
              <strong>{{ item.queryText }}</strong>
              <span>出现 {{ item.count }} 次</span>
              <small>首次：{{ item.firstAt }} | 最近：{{ item.lastAt }}</small>
            </li>
          </ul>
        </section>

        <section class="monitor-card">
          <div class="monitor-card__heading">
            <div>
              <span>Access Issues</span>
              <h2>入口异常记录</h2>
            </div>
          </div>
          <p v-if="!monitor.secondaryAuthIssues.hotItems.length" class="monitor-empty">暂无记录</p>
          <ul v-else class="monitor-list">
            <li v-for="item in monitor.secondaryAuthIssues.hotItems" :key="item.serviceItemId || 'unknown'">
              <strong>{{ item.title }}</strong>
              <span>异常 {{ item.issues }} 次</span>
              <small>最近：{{ item.latestAt }}</small>
            </li>
          </ul>
          <h3 class="monitor-subtitle">最新上报</h3>
          <ul v-if="monitor.secondaryAuthIssues.recentCases.length" class="monitor-list">
            <li
              v-for="item in monitor.secondaryAuthIssues.recentCases"
              :key="item.id"
            >
              <strong>{{ item.userName || item.userId }}</strong>
              <span>{{ item.userRole }}</span>
              <small>{{ item.createdAt }}</small>
            </li>
          </ul>
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
