<script setup lang="ts">
import { Bot, Check, Send, Sparkles, X } from '@lucide/vue';
import { computed, ref } from 'vue';
import ServiceCard from './components/ServiceCard.vue';
import {
  getAssistantOpening,
  getMonitorOverview,
  getProfileSummary,
  saveProfileMemory,
  sendAssistantMessage,
  type AssistantReply,
  type MonitorOverview,
  type ProfileSummary,
  type ProfileUpdateCandidate,
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
const nextId = ref(1);
const savedCandidates = ref<string[]>([]);
const currentUserId = ref(resolveUserId());
const profile = ref<ProfileSummary | null>(null);
const displayName = computed(() => profile.value?.name || '我的');
const messages = ref<ChatMessage[]>([]);
const isMonitorPage = computed(() => {
  const pathname = window.location.pathname || '/';
  return pathname === '/monitor' || pathname.startsWith('/monitor/');
});
const monitor = ref<MonitorOverview | null>(null);
const monitorDays = ref(30);

const quickPrompts = ['云盘', '体育场馆预约', '学生档案查询', '会议室预约'];

if (isMonitorPage.value) {
  monitorLoading.value = true;
  getMonitorOverview(monitorDays.value)
    .then((data) => {
      monitor.value = data;
      monitorError.value = '';
    })
    .catch(() => {
      monitor.value = null;
      monitorError.value = '监测数据暂时不可用，请稍后重试';
    })
    .finally(() => {
      monitorLoading.value = false;
    });
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
    })
    .catch(() => {
      profile.value = null;
      messages.value.push(...defaultWelcomeMessages());
    });
} else {
  messages.value.push(...defaultWelcomeMessages());
}

function resolveUserId() {
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
  }
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
  <main class="app-shell">
    <template v-if="isMonitorPage">
      <header class="app-header">
        <div class="app-header__identity">
          <div class="brand-mark">
            <Sparkles :size="19" />
          </div>
          <div>
            <h1>AI办事监测看板</h1>
          </div>
        </div>
        <button class="ghost-button" type="button" @click="goHome">返回首页</button>
      </header>

      <section v-if="monitorLoading" class="monitor-empty">监测数据加载中...</section>
      <section v-else-if="monitorError" class="monitor-empty">{{ monitorError }}</section>
      <template v-else-if="monitor">
        <section class="monitor-card">
          <h2>事项点击排行（过去 {{ monitor.days }} 天）</h2>
          <p v-if="!monitor.topServices.length" class="monitor-empty">暂无数据</p>
          <ul v-else class="monitor-list">
            <li v-for="item in monitor.topServices" :key="item.serviceItemId">
              <strong>{{ item.title }}</strong>
              <span>点击 {{ item.clicks }} 次</span>
              <small>最新：{{ item.lastClick }} | 首次：{{ item.firstClick }}</small>
            </li>
          </ul>
        </section>

        <section class="monitor-card">
          <h2>按身份统计（提问来源）</h2>
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
          <h2>无结果问题（过去 {{ monitor.days }} 天）</h2>
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
          <h2>二次认证异常记录</h2>
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

      <section class="chat-panel" aria-label="AI办事对话">
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
