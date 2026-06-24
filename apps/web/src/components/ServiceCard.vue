<script setup lang="ts">
import { ChevronDown, ChevronUp, Clock3, ExternalLink, Phone, UserRound } from '@lucide/vue';
import { ref } from 'vue';
import { recordUserEvent, serviceAssetUrl, type ServiceCard } from '../services/assistant';

type TextPart = {
  type: 'text' | 'link';
  value: string;
};

const props = defineProps<{
  card: ServiceCard;
  userId?: string;
}>();

const expanded = ref(false);
const urlPattern = /https?:\/\/[^\s)]+/g;

function openService() {
  const go = () => {
    window.location.href = props.card.entryUrl;
  };

  if (!props.userId) {
    go();
    return;
  }

  void recordUserEvent(props.userId, 'open_service', props.card.id, { title: props.card.title }).catch(() => undefined).finally(go);
}

function openUrl(url: string) {
  window.location.href = serviceAssetUrl(url);
}

function isImageAsset(assetType: string) {
  return ['image', 'qrcode'].includes(assetType);
}

function linkParts(text?: string): TextPart[] {
  if (!text) {
    return [];
  }

  const parts: TextPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(urlPattern)) {
    const rawUrl = match[0];
    const startIndex = match.index ?? 0;
    const trailingRegex = /[，。；;)]+$/;
    const url = rawUrl.replace(trailingRegex, '');
    const trailing = rawUrl.slice(url.length);

    if (startIndex > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, startIndex) });
    }

    parts.push({ type: 'link', value: url });

    if (trailing) {
      parts.push({ type: 'text', value: trailing });
    }

    lastIndex = startIndex + rawUrl.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts.length ? parts : [{ type: 'text', value: text }];
}
</script>

<template>
  <article class="service-card">
    <div class="service-card__top">
      <div>
        <div class="service-card__category">{{ card.category }}</div>
        <h3>{{ card.title }}</h3>
      </div>
      <button class="icon-button" type="button" aria-label="打开外部办理入口" @click="openService">
        <ExternalLink :size="18" />
      </button>
    </div>

    <p v-if="card.description" class="service-card__desc">
      <template v-for="(part, index) in linkParts(card.description)" :key="`${part.value}-${index}`">
        <a v-if="part.type === 'link'" class="text-link" :href="part.value" @click.prevent="openUrl(part.value)">
          {{ part.value }}
        </a>
        <span v-else>{{ part.value }}</span>
      </template>
    </p>

    <div class="service-card__meta">
      <div v-if="card.targetRoles.length">
        <UserRound :size="15" />
        <span>适用对象：{{ card.targetRoles.join('，') }}</span>
      </div>
      <div v-if="card.department">
        <UserRound :size="15" />
        <span>{{ card.department }}</span>
      </div>
      <div v-if="card.serviceTime">
        <Clock3 :size="15" />
        <span>{{ card.serviceTime }}</span>
      </div>
      <div v-if="card.contactPhone">
        <Phone :size="15" />
        <span>{{ card.contactPhone }}</span>
      </div>
    </div>

    <div class="service-card__actions">
      <button class="primary-action" type="button" @click="openService">
        <ExternalLink :size="16" />
        <span>去办理</span>
      </button>
      <button class="secondary-action" type="button" @click="expanded = !expanded">
        <component :is="expanded ? ChevronUp : ChevronDown" :size="16" />
        <span>{{ expanded ? '收起流程' : '查看流程' }}</span>
      </button>
    </div>

    <div v-if="expanded" class="service-card__details">
      <section v-if="card.materials.length">
        <h4>办理材料</h4>
        <ul>
          <li v-for="material in card.materials" :key="material">
            <template v-for="(part, index) in linkParts(material)" :key="`${part.value}-${index}`">
              <a v-if="part.type === 'link'" class="text-link" :href="part.value" @click.prevent="openUrl(part.value)">
                {{ part.value }}
              </a>
              <span v-else>{{ part.value }}</span>
            </template>
          </li>
        </ul>
      </section>
      <section v-if="card.processSteps.length">
        <h4>办理流程</h4>
        <ol>
          <li v-for="step in card.processSteps" :key="step">
            <template v-for="(part, index) in linkParts(step)" :key="`${part.value}-${index}`">
              <a v-if="part.type === 'link'" class="text-link" :href="part.value" @click.prevent="openUrl(part.value)">
                {{ part.value }}
              </a>
              <span v-else>{{ part.value }}</span>
            </template>
          </li>
        </ol>
      </section>
      <section v-if="card.notice">
        <h4>注意事项</h4>
        <p>
          <template v-for="(part, index) in linkParts(card.notice)" :key="`${part.value}-${index}`">
            <a v-if="part.type === 'link'" class="text-link" :href="part.value" @click.prevent="openUrl(part.value)">
              {{ part.value }}
            </a>
            <span v-else>{{ part.value }}</span>
          </template>
        </p>
      </section>
      <section v-if="card.assets.length">
        <h4>附件/链接</h4>
        <div class="service-assets">
          <template v-for="asset in card.assets" :key="asset.id">
            <figure v-if="isImageAsset(asset.assetType)" class="service-asset-image">
              <img :src="serviceAssetUrl(asset.url)" :alt="asset.altText || asset.title || card.title" loading="lazy" />
              <figcaption v-if="asset.title">{{ asset.title }}</figcaption>
            </figure>
            <a v-else class="service-asset-link" :href="serviceAssetUrl(asset.url)" @click.prevent="openUrl(asset.url)">
              {{ asset.title || '查看附件链接' }}
            </a>
          </template>
        </div>
      </section>
    </div>
  </article>
</template>
