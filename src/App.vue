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
    <div v-else class="app-container">
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

            <el-dropdown @command="handleUserCommand">
              <el-avatar style="cursor: pointer" :src="authStore.user?.avatar_url">
                <span v-if="!authStore.user?.avatar_url">
                  {{ authStore.user?.username?.charAt(0).toUpperCase() }}
                </span>
              </el-avatar>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item disabled>
                    {{ authStore.user?.username }}
                  </el-dropdown-item>
                  <el-dropdown-item command="change-avatar">
                    <el-icon><Picture /></el-icon>
                    更换头像
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
                    @click="handleExport"
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

      <!-- 头像上传对话框 -->
      <AvatarUpload v-model="showAvatarUpload" />

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
  Delete,
  Download,
  Upload,
  Plus,
  Document,
  SwitchButton,
  Picture
} from '@element-plus/icons-vue'
import { useTaskStore } from './stores/taskStore'
import { useAuthStore } from './stores/authStore'
import TaskItem from './components/TaskItem.vue'
import LoginForm from './components/LoginForm.vue'
import RegisterForm from './components/RegisterForm.vue'
import AvatarUpload from './components/AvatarUpload.vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

const taskStore = useTaskStore()
const authStore = useAuthStore()
const newTaskText = ref('')
const locale = zhCn
const showLogin = ref(true)
const showAvatarUpload = ref(false)
const fileInput = ref(null)

onMounted(async () => {
  await authStore.init()
  if (authStore.isAuthenticated && authStore.user?.id) {
    taskStore.init(authStore.user.id)
  }
})

const handleAuthSuccess = () => {
  if (authStore.user?.id) {
    taskStore.init(authStore.user.id)
  }
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
  } else if (command === 'change-avatar') {
    showAvatarUpload.value = true
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

const handleExport = async () => {
  try {
    const tasks = taskStore.tasks
    const exportData = {
      tasks,
      exportDate: new Date().toISOString(),
      version: '2.0',
      userId: authStore.user?.id
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(dataBlob)
    link.download = `taskmaster-backup-${new Date().toISOString().split('T')[0]}.json`
    link.click()

    ElMessage.success('数据导出成功')
  } catch (error) {
    console.error('数据导出失败:', error)
    ElMessage.error('数据导出失败')
  }
}

const handleImport = () => {
  fileInput.value.click()
}

const handleFileChange = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    console.log('开始处理文件:', file.name)
    const text = await file.text()
    console.log('文件内容:', text)
    
    const data = JSON.parse(text)
    console.log('解析后的数据:', data)

    if (!data || typeof data !== 'object') {
      throw new Error('无效的数据格式')
    }

    if (!data.tasks || !Array.isArray(data.tasks)) {
      throw new Error('数据中缺少 tasks 字段或格式不正确')
    }

    if (data.tasks.length === 0) {
      ElMessage.warning('导入的数据中没有任务')
      return
    }

    console.log('准备导入', data.tasks.length, '个任务')

    // 导入任务到数据库
    await taskStore.importTasks(data.tasks)
    
    console.log('导入完成')
    ElMessage.success(`成功导入 ${data.tasks.length} 个任务`)
  } catch (error) {
    console.error('文件处理失败:', error)
    console.error('错误堆栈:', error.stack)
    if (error instanceof SyntaxError) {
      ElMessage.error('JSON 格式错误，请检查文件格式')
    } else {
      ElMessage.error(`文件导入失败: ${error.message}`)
    }
  } finally {
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
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%);
  transition: background-color 0.3s;
}

/* 头部样式 */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
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
  background: rgba(255, 255, 255, 0.75) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
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
  background: rgba(255, 255, 255, 0.75) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
}

/* 任务列表卡片 */
.task-list-card {
  min-height: 400px;
  background: rgba(255, 255, 255, 0.75) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
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
