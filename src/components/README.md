# Component Library

## DataTable Component

A generic, reusable table component with pagination, search, sorting, view toggle, and bulk actions.

### Basic Usage

```vue
<template>
  <DataTable
    :items="containers"
    :columns="columns"
    :loading="loading"
    :searchable="true"
    :search-fields="['name', 'image', 'id']"
    :selectable="true"
    :toggleable="true"
    item-key="id"
    empty-icon="pi pi-box"
    empty-title="No Containers Found"
    empty-text="There are no containers running."
  >
    <!-- Custom column rendering -->
    <template #cell-status="{ item }">
      <span class="status-indicator" :class="item.state"></span>
    </template>

    <template #cell-name="{ item }">
      <div class="container-info">
        <span class="name">{{ item.name }}</span>
        <span class="id">{{ item.id.substring(0, 12) }}</span>
      </div>
    </template>

    <template #cell-actions="{ item }">
      <button @click="stopContainer(item.id)">Stop</button>
    </template>

    <!-- Grid view (when toggleable) -->
    <template #grid="{ items, selectedItems, toggleSelect }">
      <div class="grid grid-cols-3 gap-4">
        <div v-for="item in items" :key="item.id" class="card">
          {{ item.name }}
        </div>
      </div>
    </template>

    <!-- Bulk actions -->
    <template #bulk-actions="{ selectedItems, clearSelection }">
      <button @click="bulkStop(selectedItems)">Stop Selected</button>
      <button @click="bulkRemove(selectedItems)">Remove Selected</button>
    </template>

    <!-- Custom filters -->
    <template #filters>
      <div class="filter-group">
        <button @click="filter = 'all'">All</button>
        <button @click="filter = 'running'">Running</button>
      </div>
    </template>

    <!-- Action buttons -->
    <template #actions>
      <button @click="refresh">Refresh</button>
    </template>

    <!-- Empty state action -->
    <template #empty-action>
      <button @click="createContainer">Create Container</button>
    </template>
  </DataTable>
</template>

<script setup>
const columns = [
  { key: 'status', label: 'Status', width: '60px' },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'image', label: 'Image', sortable: true },
  { key: 'state', label: 'State' },
  { key: 'created', label: 'Created', sortable: true },
  { key: 'actions', label: 'Actions', width: '120px' }
]
</script>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `Array` | required | Array of data items |
| `columns` | `Array<Column>` | required | Table column definitions |
| `itemKey` | `String` | `'id'` | Property to use as unique key |
| `loading` | `Boolean` | `false` | Show loading state |
| `searchable` | `Boolean` | `true` | Enable search box |
| `searchPlaceholder` | `String` | `'Search...'` | Search input placeholder |
| `searchFields` | `Array<String>` | `[]` | Fields to search (supports nested: `'user.name'`) |
| `selectable` | `Boolean` | `false` | Enable row selection |
| `toggleable` | `Boolean` | `false` | Enable grid/table view toggle |
| `emptyIcon` | `String` | `'pi pi-inbox'` | Icon for empty state |
| `emptyTitle` | `String` | `'No items found'` | Title for empty state |
| `emptyText` | `String` | `'...'` | Description for empty state |
| `loadingText` | `String` | `'Loading...'` | Loading state text |
| `defaultPageSize` | `Number` | `25` | Initial page size |
| `defaultViewMode` | `'table' \| 'grid'` | `'table'` | Initial view mode |

### Column Definition

```typescript
interface Column {
  key: string        // Data property key (supports nested: 'user.name')
  label: string      // Column header text
  width?: string     // Optional fixed width
  sortable?: boolean // Enable sorting
}
```

### Slots

| Slot | Props | Description |
|------|-------|-------------|
| `cell-{key}` | `{ item, value }` | Custom cell rendering |
| `grid` | `{ items, selectedItems, toggleSelect }` | Grid view layout |
| `bulk-actions` | `{ selectedItems, clearSelection }` | Bulk action buttons |
| `filters` | - | Custom filter controls |
| `actions` | - | Header action buttons |
| `empty-action` | - | Empty state action button |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:selected` | `Array<any>` | Selected items changed |
| `row-click` | `item` | Row was clicked |

---

## Design System

The design system provides CSS custom properties for consistent styling.

### Using Design Tokens

```css
.my-component {
  /* Colors */
  background: var(--color-primary-500);
  color: var(--color-gray-700);

  /* Border Radius */
  border-radius: var(--radius-md); /* 6px */

  /* Spacing */
  padding: var(--space-4); /* 1rem */
  margin-bottom: var(--space-2); /* 0.5rem */

  /* Typography */
  font-size: var(--text-md); /* 0.875rem */
  font-weight: var(--font-semibold);

  /* Shadows */
  box-shadow: var(--shadow-md);

  /* Transitions */
  transition: all var(--transition-base);

  /* Focus Ring */
  box-shadow: 0 0 0 var(--ring-width) var(--ring-color);
}
```

### Available Tokens

#### Border Radius
- `--radius-xs`: 2px
- `--radius-sm`: 4px
- `--radius-md`: 6px (buttons, inputs)
- `--radius-lg`: 8px (cards, modals)
- `--radius-xl`: 12px
- `--radius-full`: 9999px (pills, badges)

#### Spacing Scale
- `--space-1`: 0.25rem (4px)
- `--space-2`: 0.5rem (8px)
- `--space-3`: 0.75rem (12px)
- `--space-4`: 1rem (16px)
- `--space-5`: 1.25rem (20px)
- `--space-6`: 1.5rem (24px)
- `--space-8`: 2rem (32px)

#### Typography
- `--text-xs`: 0.6875rem (11px)
- `--text-sm`: 0.75rem (12px)
- `--text-base`: 0.8125rem (13px)
- `--text-md`: 0.875rem (14px)
- `--text-lg`: 0.9375rem (15px)
- `--text-xl`: 1rem (16px)

### Pre-built Components

Use these classes from the design system:

```html
<!-- Buttons -->
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-danger">Danger</button>
<button class="btn btn-sm">Small</button>

<!-- Badges -->
<span class="badge badge-success">Active</span>
<span class="badge badge-warning">Warning</span>
<span class="badge badge-danger">Error</span>

<!-- Status Indicators -->
<span class="status-indicator running"></span>
<span class="status-indicator stopped"></span>

<!-- Cards -->
<div class="card">Card content</div>

<!-- Forms -->
<input type="text" class="form-input" />

<!-- Tables -->
<table class="data-table">...</table>

<!-- States -->
<div class="empty-state">...</div>
<div class="loading-state">...</div>

<!-- Modals -->
<div class="modal-overlay">
  <div class="modal-container">
    <div class="modal-header">...</div>
    <div class="modal-body">...</div>
    <div class="modal-footer">...</div>
  </div>
</div>
```

This ensures consistent styling across the application and makes it easy to update the entire design by changing CSS variables in one place.
