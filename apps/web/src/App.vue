<script setup lang="ts">
import { Bot, Check, Send, Sparkles, X } from '@lucide/vue';
import { computed, ref } from 'vue';
import ServiceCard from './components/ServiceCard.vue';
import {
  getAssistantOpening,
  getProfileSummary,
  saveProfileMemory,
  sendAssistantMessage,
  type AssistantReply,
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
const nextId = ref(1);
const savedCandidates = ref<string[]>([]);
const currentUserId = ref(resolveUserId());
const profile = ref<ProfileSummary | null>(null);
const displayName = computed(() => profile.value?.name || '我的');
const messages = ref<ChatMessage[]>([]);

const quickPrompts = ['云盘怎么用', '体育场馆预约', '学生档案去向查询', '我想给学校提建议'];

if (currentUserId.value) {
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
    window.location.href = '/auth/oauth/login';
    return '';
  }

  const devUserId = 'demo-user';
  if (storedUserId) {
    return storedUserId;
  }

  return devUserId;
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
      content: '我刚才没连上办事服务。你可以稍后再试，或者先检查后端接口是否启动。',
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
      content: '你好，我是 AI 办事助手。你可以直接说想办什么，不用记事项名称。',
    },
    {
      id: nextId.value++,
      role: 'assistant',
      content: '比如：云盘怎么用、体育场馆预约、学生档案去哪查、我想给学校提建议。',
    },
  ];
}
</script>

<template>
  <main class="app-shell">
    <header class="app-header">
      <div class="app-header__identity">
        <div class="brand-mark">
          <Sparkles :size="19" />
        </div>
        <div>
          <h1>AI 办事</h1>
        </div>
      </div>
      <button class="ghost-button" type="button">{{ displayName }}</button>
    </header>

    <section class="chat-panel" aria-label="AI 办事对话">
      <div v-for="message in messages" :key="message.id" class="message-row" :class="`message-row--${message.role}`">
        <div v-if="message.role === 'assistant'" class="avatar">
          <Bot :size="17" />
        </div>
        <div class="message-bubble">
          <p>{{ message.content }}</p>
          <div v-if="message.reply?.serviceCards?.length" class="service-list">
            <ServiceCard v-for="card in message.reply.serviceCards" :key="card.id" :card="card" />
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
        <strong>记住偏好？</strong>
        <p>{{ pendingCandidates[0].reason }}</p>
      </div>
      <div class="memory-strip__actions">
        <button type="button" aria-label="保存偏好" @click="rememberCandidate(pendingCandidates[0])">
          <Check :size="16" />
        </button>
        <button type="button" aria-label="不保存偏好" @click="dismissCandidate(pendingCandidates[0])">
          <X :size="16" />
        </button>
      </div>
    </section>

    <section class="quick-prompts" aria-label="快捷提问">
      <button v-for="prompt in quickPrompts" :key="prompt" type="button" @click="submitMessage(prompt)">
        {{ prompt }}
      </button>
    </section>

    <form class="composer" @submit.prevent="submitMessage()">
      <input v-model="input" type="text" placeholder="说出你想办什么" autocomplete="off" />
      <button type="submit" aria-label="发送" :disabled="loading || !input.trim()">
        <Send :size="18" />
      </button>
    </form>
  </main>
</template>
