<template>
  <el-dialog
    v-model="dialogVisible"
    title="更换头像"
    width="500px"
    :close-on-click-modal="false"
  >
    <div class="avatar-upload-container">
      <div class="avatar-preview">
        <el-avatar :size="120" :src="previewUrl || authStore.user?.avatar_url">
          <span v-if="!previewUrl && !authStore.user?.avatar_url">
            {{ authStore.user?.username?.charAt(0).toUpperCase() }}
          </span>
        </el-avatar>
      </div>

      <el-form label-position="top" style="margin-top: 24px;">
        <el-form-item label="头像 URL 地址">
          <el-input
            v-model="avatarUrl"
            placeholder="请输入图片链接地址"
            clearable
            @input="handleUrlChange"
          >
            <template #prepend>
              <el-icon><Picture /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-alert
          title="提示"
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 16px;"
        >
          <template #default>
            <div style="font-size: 13px;">
              <p style="margin: 0 0 8px 0;">请输入图片的 URL 地址，例如：</p>
              <ul style="margin: 0; padding-left: 20px;">
                <li>https://example.com/avatar.jpg</li>
                <li>https://i.imgur.com/xxxxx.png</li>
              </ul>
            </div>
          </template>
        </el-alert>
      </el-form>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          type="primary"
          :loading="loading"
          :disabled="!avatarUrl"
          @click="handleSave"
        >
          保存
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Picture } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/authStore'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const authStore = useAuthStore()
const dialogVisible = ref(props.modelValue)
const avatarUrl = ref('')
const previewUrl = ref('')
const loading = ref(false)

watch(() => props.modelValue, (val) => {
  dialogVisible.value = val
  if (val) {
    avatarUrl.value = authStore.user?.avatar_url || ''
    previewUrl.value = authStore.user?.avatar_url || ''
  }
})

watch(dialogVisible, (val) => {
  emit('update:modelValue', val)
})

const handleUrlChange = () => {
  previewUrl.value = avatarUrl.value
}

const handleClose = () => {
  dialogVisible.value = false
  avatarUrl.value = ''
  previewUrl.value = ''
}

const handleSave = async () => {
  if (!avatarUrl.value.trim()) {
    ElMessage.warning('请输入头像地址')
    return
  }

  loading.value = true
  try {
    const result = await authStore.updateAvatar(avatarUrl.value.trim())
    
    if (result.success) {
      ElMessage.success('头像更新成功')
      emit('success')
      handleClose()
    } else {
      ElMessage.error(result.error || '头像更新失败')
    }
  } catch (error) {
    console.error('头像更新失败:', error)
    ElMessage.error('头像更新失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.avatar-upload-container {
  padding: 16px 0;
}

.avatar-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 16px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
