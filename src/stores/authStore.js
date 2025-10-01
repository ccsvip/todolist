import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import bcrypt from 'bcryptjs'

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const user = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // 计算属性
  const isAuthenticated = computed(() => user.value !== null)

  // 初始化 - 检查本地存储的用户信息
  const init = async () => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        user.value = JSON.parse(storedUser)
      } catch (e) {
        localStorage.removeItem('user')
      }
    }
  }

  // 注册
  const register = async (username, email, password) => {
    loading.value = true
    error.value = null

    try {
      // 检查用户名或邮箱是否已存在
      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('id, email, username')
        .or(`email.eq.${email},username.eq.${username}`)

      if (checkError) throw checkError

      if (existingUsers && existingUsers.length > 0) {
        const existingUser = existingUsers[0]
        if (existingUser.email === email) {
          throw new Error('该邮箱已被注册')
        }
        if (existingUser.username === username) {
          throw new Error('该用户名已被使用')
        }
      }

      // 加密密码
      const passwordHash = await bcrypt.hash(password, 10)

      // 创建用户
      const { data, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            username,
            email,
            password_hash: passwordHash
          }
        ])
        .select()
        .single()

      if (insertError) throw insertError

      // 设置用户信息（不包含密码哈希）
      const userData = {
        id: data.id,
        username: data.username,
        email: data.email,
        avatar_url: data.avatar_url,
        created_at: data.created_at
      }

      user.value = userData
      localStorage.setItem('user', JSON.stringify(userData))

      return { success: true, user: userData }
    } catch (err) {
      error.value = err.message
      console.error('注册失败:', err)
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // 登录
  const login = async (emailOrUsername, password) => {
    loading.value = true
    error.value = null

    try {
      // 查询用户（支持邮箱或用户名登录）
      const { data: users, error: queryError } = await supabase
        .from('users')
        .select('*')
        .or(`email.eq.${emailOrUsername},username.eq.${emailOrUsername}`)
        .single()

      if (queryError || !users) {
        throw new Error('用户名或密码错误')
      }

      // 验证密码
      const isValidPassword = await bcrypt.compare(password, users.password_hash)

      if (!isValidPassword) {
        throw new Error('用户名或密码错误')
      }

      // 更新最后登录时间
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', users.id)

      // 设置用户信息（不包含密码哈希）
      const userData = {
        id: users.id,
        username: users.username,
        email: users.email,
        avatar_url: users.avatar_url,
        created_at: users.created_at,
        last_login: new Date().toISOString()
      }

      user.value = userData
      localStorage.setItem('user', JSON.stringify(userData))

      return { success: true, user: userData }
    } catch (err) {
      error.value = err.message
      console.error('登录失败:', err)
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // 登出
  const logout = () => {
    user.value = null
    localStorage.removeItem('user')
  }

  // 更新用户信息
  const updateProfile = async (updates) => {
    if (!user.value) return { success: false, error: '未登录' }

    loading.value = true
    error.value = null

    try {
      const { data, error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.value.id)
        .select()
        .single()

      if (updateError) throw updateError

      // 更新本地用户信息
      const userData = {
        id: data.id,
        username: data.username,
        email: data.email,
        avatar_url: data.avatar_url,
        created_at: data.created_at,
        last_login: data.last_login
      }

      user.value = userData
      localStorage.setItem('user', JSON.stringify(userData))

      return { success: true, user: userData }
    } catch (err) {
      error.value = err.message
      console.error('更新失败:', err)
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // 修改密码
  const changePassword = async (oldPassword, newPassword) => {
    if (!user.value) return { success: false, error: '未登录' }

    loading.value = true
    error.value = null

    try {
      // 获取当前用户信息
      const { data: currentUser, error: queryError } = await supabase
        .from('users')
        .select('password_hash')
        .eq('id', user.value.id)
        .single()

      if (queryError) throw queryError

      // 验证旧密码
      const isValidPassword = await bcrypt.compare(oldPassword, currentUser.password_hash)

      if (!isValidPassword) {
        throw new Error('原密码错误')
      }

      // 加密新密码
      const newPasswordHash = await bcrypt.hash(newPassword, 10)

      // 更新密码
      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: newPasswordHash })
        .eq('id', user.value.id)

      if (updateError) throw updateError

      return { success: true }
    } catch (err) {
      error.value = err.message
      console.error('修改密码失败:', err)
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  // 更新头像
  const updateAvatar = async (avatarUrl) => {
    if (!user.value) return { success: false, error: '未登录' }

    loading.value = true
    error.value = null

    try {
      const { data, error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.value.id)
        .select()
        .single()

      if (updateError) throw updateError

      // 更新本地用户信息
      const userData = {
        id: data.id,
        username: data.username,
        email: data.email,
        avatar_url: data.avatar_url,
        created_at: data.created_at,
        last_login: data.last_login
      }

      user.value = userData
      localStorage.setItem('user', JSON.stringify(userData))

      return { success: true, user: userData }
    } catch (err) {
      error.value = err.message
      console.error('更新头像失败:', err)
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    init,
    register,
    login,
    logout,
    updateProfile,
    changePassword,
    updateAvatar
  }
})
