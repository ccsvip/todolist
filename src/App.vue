<template>
  <el-config-provider :locale="locale">
    <!-- 未登录时显示登录/注册页面 -->
    <div v-if="!authStore.isAuthenticated">
      <LoginForm
        v-if="showLogin"
        @login-success="handleAuthSuccess"
        @switch-to-register="showLogin = false"
      />
      <RegisterForm
        v-else
        @register-success="handleAuthSuccess"
        @switch-to-login="showLogin = true"
      />
    </div>

    <!-- 已登录时显示主应用 -->
    <div v-else class="app-container" :class="{ dark: taskStore.isDark }">
      <el-container>
        <!-- 头部 -->
        <el-header class="app-header">
          <div class="header-left">
            <el-icon :size="24" color="var(--el-color-primary)">
              <Calendar />
            </el-icon>
            <h1 class="app-title">TaskMaster</h1>
          </div>

          <div class="header-right">
            <el-input
              v-model="taskStore.searchQuery"
              placeholder="搜索任务"
              :prefix-icon="Search"
              clearable
              class="search-input"
            />

            <el-tooltip content="切换主题" placement="bottom">
              <el-button
                :icon="taskStore.isDark ? Sunny : Moon"
                circle
                @click="taskStore.toggleTheme()"
              />
            </el-tooltip>

            <el-dropdown @command="handleUserCommand">
              <el-avatar style="cursor: pointer">
                {{ authStore.user?.username?.charAt(0).toUpperCase() }}
              </el-avatar>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item disabled>
                    {{ authStore.user?.username }}
                  </el-dropdown-item>
                  <el-dropdown-item divided command="logout">
                    <el-icon><SwitchButton /></el-icon>
                    退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>

        <!-- 主要内容 -->
        <el-main class="app-main">
          <div class="content-wrapper">
            <!-- 标题和统计 -->
            <div class="stats-section">
              <h2 class="page-title">我的任务</h2>
              <div class="stats">
                <el-statistic title="总计" :value="taskStore.totalCount" />
                <el-statistic title="已完成" :value="taskStore.completedCount" />
                <el-statistic title="进行中" :value="taskStore.activeCount" />
              </div>
            </div>

            <!-- 筛选和操作按钮 -->
            <el-card class="filter-card" shadow="never">
              <div class="filter-section">
                <el-radio-group v-model="taskStore.currentFilter" size="default">
                  <el-radio-button value="all">全部</el-radio-button>
                  <el-radio-button value="active">进行中</el-radio-button>
                  <el-radio-button value="completed">已完成</el-radio-button>
                </el-radio-group>

                <div class="action-buttons">
                  <el-button
                    :icon="Delete"
                    @click="handleClearCompleted"
                  >
                    清除已完成
                  </el-button>
                  <el-button
                    :icon="Delete"
                    type="danger"
                    @click="handleClearAll"
                  >
                    删除全部
                  </el-button>
                  <el-button
                    :icon="Download"
                    @click="taskStore.exportData()"
                  >
                    导出
                  </el-button>
                  <el-button
                    :icon="Upload"
                    @click="handleImport"
                  >
                    导入
                  </el-button>
                </div>
              </div>
            </el-card>

            <!-- 添加任务 -->
            <el-card class="add-task-card" shadow="never">
              <el-input
                v-model="newTaskText"
                placeholder="添加新任务"
                size="large"
                clearable
                @keypress.enter="handleAddTask"
              >
                <template #append>
                  <el-button
                    :icon="Plus"
                    type="primary"
                    @click="handleAddTask"
                  >
                    添加
                  </el-button>
                </template>
              </el-input>
            </el-card>

            <!-- 任务列表 -->
            <el-card class="task-list-card" shadow="never" v-loading="taskStore.isLoading">
              <transition-group name="list" tag="div" class="task-list">
                <TaskItem
                  v-for="task in taskStore.filteredTasks"
                  :key="task.id"
                  :task="task"
                />
              </transition-group>

              <!-- 空状态 -->
              <el-empty
                v-if="taskStore.filteredTasks.length === 0 && !taskStore.isLoading"
                description="暂无任务"
                :image-size="150"
              >
                <template #image>
                  <el-icon :size="80" color="var(--el-color-info)">
                    <Document />
                  </el-icon>
                </template>
              </el-empty>
            </el-card>
          </div>
        </el-main>
      </el-container>

      <!-- 导入文件对话框 -->
      <input
        ref="fileInput"
        type="file"
        accept=".json"
        style="display: none"
        @change="handleFileChange"
      />
    </div>
  </el-config-provider>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Calendar,
  Search,
  Sunny,
  Moon,
  Delete,
  Download,
  Upload,
  Plus,
  Document,
  SwitchButton
} from '@element-plus/icons-vue'
import { useTaskStore } from './stores/taskStore'
import { useAuthStore } from './stores/authStore'
import TaskItem from './components/TaskItem.vue'
import LoginForm from './components/LoginForm.vue'
import RegisterForm from './components/RegisterForm.vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

const taskStore = useTaskStore()
const authStore = useAuthStore()
const newTaskText = ref('')
const fileInput = ref(null)
const locale = zhCn
const showLogin = ref(true)

onMounted(async () => {
  await authStore.init()
  if (authStore.isAuthenticated) {
    taskStore.init()
  }
})

const handleAuthSuccess = () => {
  taskStore.init()
}

const handleUserCommand = async (command) => {
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm(
        '确定要退出登录吗？',
        '退出登录',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      authStore.logout()
      ElMessage.success('已退出登录')
    } catch {
      // 用户取消
    }
  }
}

const handleAddTask = () => {
  if (newTaskText.value.trim()) {
    taskStore.addTask(newTaskText.value)
    newTaskText.value = ''
  }
}

const handleClearCompleted = async () => {
  if (taskStore.completedCount === 0) {
    ElMessage.info('没有已完成的任务需要清除')
    return
  }

  try {
    await ElMessageBox.confirm(
      `将清除 ${taskStore.completedCount} 个已完成的任务，此操作不可恢复！`,
      '确定要清除已完成的任务吗？',
      {
        confirmButtonText: '确定清除',
        cancelButtonText: '取消',
        type: 'warning',
        center: true
      }
    )
    await taskStore.clearCompleted()
  } catch (error) {
    // 用户取消或关闭对话框
    console.log('用户取消清除操作')
  }
}

const handleClearAll = async () => {
  if (taskStore.totalCount === 0) {
    ElMessage.info('没有任务需要删除')
    return
  }

  try {
    await ElMessageBox.confirm(
      `将删除全部 ${taskStore.totalCount} 个任务，此操作不可恢复！`,
      '确定要删除全部任务吗？',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error',
        center: true,
        confirmButtonClass: 'el-button--danger'
      }
    )
    await taskStore.clearAll()
  } catch (error) {
    // 用户取消或关闭对话框
    console.log('用户取消删除全部操作')
  }
}

const handleImport = () => {
  fileInput.value.click()
}

const handleFileChange = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    const text = await file.text()
    console.log('文件内容:', text)

    const data = JSON.parse(text)
    console.log('解析后的数据:', data)

    await taskStore.importData(data)
  } catch (error) {
    console.error('文件处理失败:', error)
    if (error instanceof SyntaxError) {
      ElMessage.error('JSON 格式错误，请检查文件格式')
    } else {
      ElMessage.error(`文件导入失败: ${error.message}`)
    }
  } finally {
    // 清空文件选择
    event.target.value = ''
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}

.app-container {
  min-height: 100vh;
  background-color: var(--el-bg-color-page);
  transition: background-color 0.3s;
}

/* 深色模式 */
.dark {
  --el-bg-color-page: #141414;
}

/* 头部样式 */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-input {
  width: 250px;
}

/* 主要内容 */
.app-main {
  padding: 32px;
}

.content-wrapper {
  max-width: 960px;
  margin: 0 auto;
}

/* 统计区域 */
.stats-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  margin: 0;
}

.stats {
  display: flex;
  gap: 32px;
}

/* 筛选卡片 */
.filter-card {
  margin-bottom: 16px;
}

.filter-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

/* 添加任务卡片 */
.add-task-card {
  margin-bottom: 16px;
}

/* 任务列表卡片 */
.task-list-card {
  min-height: 400px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 列表动画 */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.list-leave-active {
  position: absolute;
  width: 100%;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .app-header {
    padding: 0 16px;
  }

  .app-main {
    padding: 16px;
  }

  .search-input {
    width: 180px;
  }

  .stats-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .filter-section {
    flex-direction: column;
    align-items: stretch;
  }

  .action-buttons {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
