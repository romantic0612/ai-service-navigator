<script setup lang="ts">
import { ChevronDown, ChevronUp, Clock3, ExternalLink, Phone, UserRound } from '@lucide/vue';
import { ref } from 'vue';
import type { ServiceCard } from '../services/assistant';

const props = defineProps<{
  card: ServiceCard;
}>();

const expanded = ref(false);

function openService() {
  window.location.href = props.card.entryUrl;
}
</script>

<template>
  <article class="service-card">
    <div class="service-card__top">
      <div>
        <div class="service-card__category">{{ card.category }}</div>
        <h3>{{ card.title }}</h3>
      </div>
      <button class="icon-button" type="button" aria-label="去办理" @click="openService">
        <ExternalLink :size="18" />
      </button>
    </div>

    <p v-if="card.description" class="service-card__desc">{{ card.description }}</p>

    <div class="service-card__meta">
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
        <h4>所需信息</h4>
        <ul>
          <li v-for="material in card.materials" :key="material">{{ material }}</li>
        </ul>
      </section>
      <section v-if="card.processSteps.length">
        <h4>办理流程</h4>
        <ol>
          <li v-for="step in card.processSteps" :key="step">{{ step }}</li>
        </ol>
      </section>
      <section v-if="card.notice">
        <h4>注意事项</h4>
        <p>{{ card.notice }}</p>
      </section>
    </div>
  </article>
</template>
