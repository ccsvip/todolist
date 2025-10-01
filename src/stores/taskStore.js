import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
import { supabase } from '../lib/supabase'

export const useTaskStore = defineStore('task', {
  state: () => ({
    tasks: [],
    currentFilter: 'all',
    searchQuery: '',
    isLoading: false,
    userId: null
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
    async init(userId) {
      this.isLoading = true
      this.userId = userId
      try {
        await this.loadTasks()
      } catch (error) {
        console.error('初始化数据加载失败:', error)
        ElMessage.error('数据加载失败')
      } finally {
        this.isLoading = false
      }
    },

    async loadTasks() {
      if (!this.userId) return

      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', this.userId)
          .order('created_at', { ascending: false })

        if (error) throw error

        this.tasks = data || []
      } catch (error) {
        console.error('加载任务失败:', error)
        throw error
      }
    },

    async addTask(text) {
      if (!text.trim() || !this.userId) return

      const task = {
        user_id: this.userId,
        text: text.trim(),
        completed: false
      }

      try {
        const { data, error } = await supabase
          .from('tasks')
          .insert([task])
          .select()
          .single()

        if (error) throw error

        this.tasks.unshift(data)
        ElMessage.success('任务添加成功')
      } catch (error) {
        console.error('添加任务失败:', error)
        ElMessage.error('添加任务失败')
      }
    },

    async toggleTask(id) {
      const task = this.tasks.find(t => t.id === id)
      if (!task) return

      const newCompleted = !task.completed
      const completedAt = newCompleted ? new Date().toISOString() : null

      try {
        const { error } = await supabase
          .from('tasks')
          .update({ 
            completed: newCompleted,
            completed_at: completedAt
          })
          .eq('id', id)

        if (error) throw error

        task.completed = newCompleted
        task.completed_at = completedAt
      } catch (error) {
        console.error('更新任务状态失败:', error)
        ElMessage.error('更新任务状态失败')
      }
    },

    async deleteTask(id) {
      try {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', id)

        if (error) throw error

        this.tasks = this.tasks.filter(t => t.id !== id)
        ElMessage.success('任务已删除')
      } catch (error) {
        console.error('删除任务失败:', error)
        ElMessage.error('删除任务失败')
        throw error
      }
    },

    async updateTask(id, newText) {
      if (!newText.trim()) return

      try {
        const { error } = await supabase
          .from('tasks')
          .update({ text: newText.trim() })
          .eq('id', id)

        if (error) throw error

        const task = this.tasks.find(t => t.id === id)
        if (task) {
          task.text = newText.trim()
        }
        ElMessage.success('任务已更新')
      } catch (error) {
        console.error('更新任务失败:', error)
        ElMessage.error('更新任务失败')
      }
    },

    async clearCompleted() {
      try {
        const completedTasks = this.tasks.filter(t => t.completed)
        const count = completedTasks.length
        
        if (count === 0) {
          ElMessage.info('没有已完成的任务需要清除')
          return
        }

        const completedIds = completedTasks.map(t => t.id)
        
        const { error } = await supabase
          .from('tasks')
          .delete()
          .in('id', completedIds)

        if (error) throw error

        this.tasks = this.tasks.filter(t => !t.completed)
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

        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('user_id', this.userId)

        if (error) throw error

        this.tasks = []
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

    async importTasks(tasks) {
      console.log('开始导入任务:', tasks)
      console.log('当前用户 ID:', this.userId)
      
      if (!this.userId) {
        throw new Error('用户未登录，无法导入任务')
      }
      
      if (!tasks || tasks.length === 0) {
        throw new Error('没有可导入的任务')
      }

      try {
        // 准备导入的任务数据
        const tasksToImport = tasks.map(task => ({
          user_id: this.userId,
          text: task.text || '',
          completed: task.completed || false,
          completed_at: task.completed_at || null
        }))

        console.log('准备插入的任务数据:', tasksToImport)

        // 批量插入到数据库
        const { data, error } = await supabase
          .from('tasks')
          .insert(tasksToImport)
          .select()

        if (error) {
          console.error('数据库插入错误:', error)
          throw error
        }

        console.log('插入成功，返回数据:', data)

        // 重新加载任务列表
        await this.loadTasks()
        console.log('任务列表已重新加载')
      } catch (error) {
        console.error('导入任务失败:', error)
        throw error
      }
    }
  }
})
