<template>
  <div class="task-item" :class="{ completed: task.completed }">
    <div class="task-left">
      <el-checkbox
        :model-value="task.completed"
        size="large"
        @change="handleToggle"
      />

      <div class="task-content">
        <el-input
          v-if="isEditing"
          v-model="editText"
          ref="editInput"
          size="default"
          @blur="handleSave"
          @keypress.enter="handleSave"
        />
        <div v-else class="task-info">
          <p class="task-text">{{ task.text }}</p>
          <p class="task-meta">
            <el-icon><Clock /></el-icon>
            创建于: {{ formatDate(task.created_at) }}
          </p>
        </div>
      </div>
    </div>

    <div class="task-actions">
      <el-button
        v-if="!isEditing"
        :icon="Edit"
        circle
        size="small"
        @click="handleEdit"
      />
      <el-button
        :icon="Delete"
        circle
        size="small"
        type="danger"
        @click="handleDelete"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Clock, Edit, Delete } from '@element-plus/icons-vue'
import { useTaskStore } from '../stores/taskStore'

const props = defineProps({
  task: {
    type: Object,
    required: true
  }
})

const taskStore = useTaskStore()
const isEditing = ref(false)
const editText = ref(props.task.text)
const editInput = ref(null)

const handleToggle = () => {
  taskStore.toggleTask(props.task.id)
}

const handleEdit = async () => {
  isEditing.value = true
  editText.value = props.task.text
  await nextTick()
  editInput.value?.focus()
}

const handleSave = () => {
  if (editText.value.trim() && editText.value !== props.task.text) {
    taskStore.updateTask(props.task.id, editText.value)
  }
  isEditing.value = false
}

const handleDelete = async () => {
  try {
    await ElMessageBox.confirm(
      '删除后将无法恢复！',
      '确定要删除这个任务吗？',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        center: true
      }
    )
    await taskStore.deleteTask(props.task.id)
  } catch (error) {
    // 用户取消或关闭对话框
    console.log('用户取消删除操作')
  }
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = now - date
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays}天前`

  return date.toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.task-item:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  background: rgba(255, 255, 255, 0.85);
}

.task-item.completed {
  opacity: 0.6;
}

.task-item.completed .task-text {
  text-decoration: line-through;
}

.task-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.task-content {
  flex: 1;
  min-width: 0;
}

.task-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-text {
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  word-wrap: break-word;
  white-space: pre-wrap;
  margin: 0;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin: 0;
}

.task-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .task-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .task-left {
    width: 100%;
  }

  .task-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
