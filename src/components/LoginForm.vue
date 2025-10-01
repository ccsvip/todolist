<template>
  <div class="auth-container">
    <el-card class="auth-card" shadow="always">
      <template #header>
        <div class="auth-header">
          <el-icon :size="40" color="var(--el-color-primary)">
            <UserFilled />
          </el-icon>
          <h2>登录</h2>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-position="top"
        size="large"
      >
        <el-form-item label="用户名/邮箱" prop="emailOrUsername">
          <el-input
            v-model="formData.emailOrUsername"
            :prefix-icon="User"
            placeholder="请输入用户名或邮箱"
            clearable
            @keypress.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="formData.password"
            type="password"
            :prefix-icon="Lock"
            placeholder="请输入密码"
            show-password
            clearable
            @keypress.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            style="width: 100%"
            :loading="authStore.loading"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>

        <div class="auth-footer">
          <span>还没有账户？</span>
          <el-link type="primary" @click="$emit('switch-to-register')">
            立即注册
          </el-link>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { UserFilled, User, Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/authStore'

const emit = defineEmits(['login-success', 'switch-to-register'])

const authStore = useAuthStore()
const formRef = ref(null)

const formData = reactive({
  emailOrUsername: '',
  password: ''
})

const rules = {
  emailOrUsername: [
    { required: true, message: '请输入用户名或邮箱', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (valid) {
      const result = await authStore.login(
        formData.emailOrUsername,
        formData.password
      )

      if (result.success) {
        ElMessage.success('登录成功！')
        emit('login-success', result.user)
      } else {
        ElMessage.error(result.error || '登录失败，请重试')
      }
    }
  })
}
</script>

<style scoped>
.auth-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.auth-card {
  width: 100%;
  max-width: 450px;
}

.auth-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.auth-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.auth-footer {
  text-align: center;
  margin-top: 16px;
  color: var(--el-text-color-regular);
}

.auth-footer span {
  margin-right: 8px;
}
</style>
