import { defineStore } from 'pinia'
import localforage from 'localforage'
import { ElMessage } from 'element-plus'

// 配置 localforage
const storage = localforage.createInstance({
  name: 'TaskMaster',
  storeName: 'tasks_store',
  description: '待办事项数据存储'
})

export const useTaskStore = defineStore('task', {
  state: () => ({
    tasks: [],
    currentFilter: 'all',
    searchQuery: '',
    isDark: true,
    isLoading: false
  }),

  getters: {
    filteredTasks: (state) => {
      let tasks = state.tasks

      // 应用筛选
      switch (state.currentFilter) {
        case 'active':
          tasks = tasks.filter(t => !t.completed)
          break
        case 'completed':
          tasks = tasks.filter(t => t.completed)
          break
      }

      // 应用搜索
      if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase()
        tasks = tasks.filter(t => t.text.toLowerCase().includes(query))
      }

      return tasks
    },

    totalCount: (state) => state.tasks.length,

    completedCount: (state) => state.tasks.filter(t => t.completed).length,

    activeCount: (state) => state.tasks.filter(t => !t.completed).length
  },

  actions: {
    async init() {
      this.isLoading = true
      try {
        const savedTasks = await storage.getItem('tasks')
        const savedTheme = await storage.getItem('theme')

        this.tasks = savedTasks || []
        this.isDark = savedTheme === 'light' ? false : true

        this.applyTheme()
      } catch (error) {
        console.error('初始化数据加载失败:', error)
        ElMessage.error('数据加载失败')
      } finally {
        this.isLoading = false
      }
    },

    async addTask(text) {
      if (!text.trim()) return

      const task = {
        id: Date.now(),
        text: text.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
        completedAt: null,
        updatedAt: null,
        dueDate: null
      }

      this.tasks.unshift(task)
      await this.saveTasks()
      ElMessage.success('任务添加成功')
    },

    async toggleTask(id) {
      const task = this.tasks.find(t => t.id === id)
      if (task) {
        task.completed = !task.completed
        task.completedAt = task.completed ? new Date().toISOString() : null
        await this.saveTasks()
      }
    },

    async deleteTask(id) {
      try {
        console.log('删除任务:', id)
        this.tasks = this.tasks.filter(t => t.id !== id)
        await this.saveTasks()
        ElMessage.success('任务已删除')
      } catch (error) {
        console.error('删除任务失败:', error)
        ElMessage.error('删除任务失败')
        throw error
      }
    },

    async updateTask(id, newText) {
      const task = this.tasks.find(t => t.id === id)
      if (task && newText.trim()) {
        task.text = newText.trim()
        task.updatedAt = new Date().toISOString()
        await this.saveTasks()
        ElMessage.success('任务已更新')
      }
    },

    async clearCompleted() {
      try {
        const count = this.completedCount
        if (count === 0) {
          ElMessage.info('没有已完成的任务需要清除')
          return
        }

        console.log('清除已完成任务:', count)
        this.tasks = this.tasks.filter(t => !t.completed)
        await this.saveTasks()
        ElMessage.success(`已清除 ${count} 个已完成的任务`)
      } catch (error) {
        console.error('清除已完成任务失败:', error)
        ElMessage.error('清除已完成任务失败')
        throw error
      }
    },

    async clearAll() {
      try {
        const count = this.tasks.length
        if (count === 0) {
          ElMessage.info('没有任务需要清除')
          return
        }

        console.log('清除全部任务:', count)
        this.tasks = []
        await this.saveTasks()
        ElMessage.success(`已清除全部 ${count} 个任务`)
      } catch (error) {
        console.error('清除全部任务失败:', error)
        ElMessage.error('清除全部任务失败')
        throw error
      }
    },

    setFilter(filter) {
      this.currentFilter = filter
    },

    setSearchQuery(query) {
      this.searchQuery = query
    },

    async toggleTheme() {
      this.isDark = !this.isDark
      this.applyTheme()
      await storage.setItem('theme', this.isDark ? 'dark' : 'light')
    },

    applyTheme() {
      if (this.isDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    },

    async saveTasks() {
      try {
        console.log('保存任务:', this.tasks.length, '个')
        // 深拷贝任务数据，确保可以被 IndexedDB 序列化
        const tasksToSave = JSON.parse(JSON.stringify(this.tasks))
        await storage.setItem('tasks', tasksToSave)
        console.log('任务保存成功')
      } catch (error) {
        console.error('保存任务数据失败:', error)
        ElMessage.error(`保存失败: ${error.message}`)
        throw error
      }
    },

    async exportData() {
      try {
        const tasks = await storage.getItem('tasks') || []
        const theme = await storage.getItem('theme') || 'dark'

        const exportData = {
          tasks,
          theme,
          exportDate: new Date().toISOString(),
          version: '1.0'
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
    },

    async importData(data) {
      try {
        console.log('导入数据:', data)

        if (!data || typeof data !== 'object') {
          throw new Error('无效的数据格式')
        }

        if (data.tasks && Array.isArray(data.tasks)) {
          if (data.tasks.length === 0) {
            ElMessage.warning('导入的数据中没有任务')
            return
          }

          // 深拷贝并处理导入的任务，确保数据可以被序列化
          const maxId = this.tasks.length > 0 ? Math.max(...this.tasks.map(t => t.id)) : 0
          const newTasks = data.tasks.map((task, index) => {
            // 只保留需要的字段，避免引入不可序列化的属性
            return {
              id: maxId + index + 1,
              text: task.text || '',
              completed: task.completed || false,
              createdAt: task.createdAt || new Date().toISOString(),
              completedAt: task.completedAt || null,
              updatedAt: task.updatedAt || null,
              dueDate: task.dueDate || null
            }
          })

          this.tasks = [...this.tasks, ...newTasks]
          await this.saveTasks()
        } else {
          throw new Error('数据中缺少 tasks 字段或格式不正确')
        }

        if (data.theme) {
          await storage.setItem('theme', data.theme)
          this.isDark = data.theme === 'dark'
          this.applyTheme()
        }

        ElMessage.success(`成功导入 ${data.tasks?.length || 0} 个任务`)
      } catch (error) {
        console.error('数据导入失败:', error)
        ElMessage.error(`数据导入失败: ${error.message}`)
        throw error
      }
    }
  }
})
