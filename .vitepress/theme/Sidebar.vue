<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vitepress'
import { navIcons } from './navIcons'

const route = useRoute()
const searchQuery = ref('')

interface NavItem {
  url: string
  label: string
  icon?: string
  children?: NavItem[]
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const props = defineProps<{
  sidebar: NavGroup[]
}>()

const expandedItems = ref<Set<string>>(new Set())

function isChildActive(item: NavItem): boolean {
  if (!item.children) return false
  return item.children.some(child => route.path === child.url || route.path === child.url.replace('.html', ''))
}

function isExpanded(url: string, item: NavItem): boolean {
  return expandedItems.value.has(url) || isChildActive(item)
}

function toggleExpand(url: string) {
  if (expandedItems.value.has(url)) {
    expandedItems.value.delete(url)
  } else {
    expandedItems.value.add(url)
  }
}

function isActive(url: string): boolean {
  return route.path === url || route.path === url.replace('.html', '')
}

function getIconSvg(iconName: string | undefined): string | null {
  if (!iconName || !navIcons[iconName]) return null
  return navIcons[iconName]
}

const filteredSidebar = computed(() => {
  if (!searchQuery.value.trim()) return props.sidebar
  const q = searchQuery.value.toLowerCase()
  return props.sidebar
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (item.label.toLowerCase().includes(q)) return true
        if (item.children?.some(c => c.label.toLowerCase().includes(q))) return true
        return false
      })
    }))
    .filter(group => group.items.length > 0)
})
</script>

<template>
  <aside class="docs-sidebar">
    <div class="docs-search">
      <svg class="docs-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        class="docs-search-input"
        placeholder="Search..."
        autocomplete="off"
      />
    </div>

    <template v-for="group in filteredSidebar" :key="group.title">
      <details class="docs-nav-group" open>
        <summary>
          <div class="docs-nav-title">
            <span class="docs-nav-title-content">
              <span v-if="getIconSvg(group.icon)" class="nav-icon nav-icon--section" v-html="'<svg width=&quot;14&quot; height=&quot;14&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;none&quot; stroke=&quot;currentColor&quot; stroke-width=&quot;2&quot; stroke-linecap=&quot;round&quot; stroke-linejoin=&quot;round&quot;>' + getIconSvg(group.icon) + '</svg>'"></span>
              {{ group.title }}
            </span>
            <svg class="docs-nav-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </summary>
        <div class="docs-nav">
          <template v-for="item in group.items" :key="item.url">
            <!-- Item with children -->
            <template v-if="item.children && item.children.length">
              <div class="docs-nav-item-parent" :class="{ expanded: isExpanded(item.url, item) }">
                <a :href="item.url" :class="{ active: isActive(item.url) }">
                  <span v-if="getIconSvg(item.icon)" class="nav-icon" v-html="'<svg width=&quot;16&quot; height=&quot;16&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;none&quot; stroke=&quot;currentColor&quot; stroke-width=&quot;2&quot; stroke-linecap=&quot;round&quot; stroke-linejoin=&quot;round&quot;>' + getIconSvg(item.icon) + '</svg>'"></span>
                  {{ item.label }}
                </a>
                <button
                  class="docs-nav-expand"
                  @click.prevent="toggleExpand(item.url)"
                  aria-label="Toggle submenu"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
              </div>
              <div v-if="isExpanded(item.url, item)" class="docs-nav-sub">
                <a
                  v-for="child in item.children"
                  :key="child.url"
                  :href="child.url"
                  :class="{ active: isActive(child.url) }"
                >
                  {{ child.label }}
                </a>
              </div>
            </template>

            <!-- Simple item (no children) -->
            <a v-else :href="item.url" :class="{ active: isActive(item.url) }">
              <span v-if="getIconSvg(item.icon)" class="nav-icon" v-html="'<svg width=&quot;16&quot; height=&quot;16&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;none&quot; stroke=&quot;currentColor&quot; stroke-width=&quot;2&quot; stroke-linecap=&quot;round&quot; stroke-linejoin=&quot;round&quot;>' + getIconSvg(item.icon) + '</svg>'"></span>
              {{ item.label }}
            </a>
          </template>
        </div>
      </details>
    </template>
  </aside>
</template>
