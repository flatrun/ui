<template>
  <div class="review-view">
    <header>
      <div>
        <h1>Autoscaling review</h1>
        <p>Preview the deployment policy without changing a running deployment.</p>
      </div>
      <RouterLink to="/cluster?review=fleet" class="review-link"
        ><Icon name="network" :size="16" /> Review Fleet</RouterLink
      >
    </header>
    <DeploymentAutoscaleCard deployment="review-app" :can-write="true" />
  </div>
</template>

<script setup lang="ts">
import DeploymentAutoscaleCard from "@/components/DeploymentAutoscaleCard.vue";
import Icon from "@/components/base/Icon.vue";
</script>

<style scoped>
.review-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-5);
  color: var(--text);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

h1,
p {
  margin: 0;
}

h1 {
  font-size: var(--text-3xl);
}

p {
  margin-top: var(--space-1);
  color: var(--text-muted);
  font-size: var(--text-md);
}

.review-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  color: var(--color-primary-700);
  background: var(--accent-subtle);
  border: 1px solid var(--color-primary-200);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  text-decoration: none;
}

@media (max-width: 640px) {
  header {
    align-items: stretch;
    flex-direction: column;
  }

  .review-link {
    justify-content: center;
    width: 100%;
    box-sizing: border-box;
  }
}
</style>
