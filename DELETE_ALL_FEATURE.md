# 删除全部功能说明

## 新增功能

添加了**删除全部任务**的功能，允许用户一键清空所有任务。

## 实现位置

### 1. Store 方法 (taskStore.js:139-156)

```javascript
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
}
```

### 2. UI 按钮 (App.vue:66-72)

在筛选卡片的操作按钮区域添加了红色的"删除全部"按钮：

```vue
<el-button
  :icon="Delete"
  type="danger"
  @click="handleClearAll"
>
  删除全部
</el-button>
```

### 3. 处理函数 (App.vue:207-230)

```javascript
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
```

## 功能特点

1. **安全确认**
   - 使用 `type: 'error'` 显示红色警告图标
   - 确认按钮为红色危险样式（`el-button--danger`）
   - 显示将要删除的任务总数
   - 明确提示"此操作不可恢复"

2. **智能提示**
   - 如果没有任务，显示友好提示而不是弹出对话框
   - 操作完成后显示删除的任务数量

3. **完整的错误处理**
   - Try-catch 包裹整个操作
   - 详细的控制台日志
   - 用户取消不会报错

4. **数据持久化**
   - 自动保存到 IndexedDB
   - 使用 JSON 深拷贝确保数据可序列化

## 按钮布局

现在操作按钮区域包含 4 个按钮（从左到右）：

| 按钮 | 样式 | 功能 |
|------|------|------|
| 清除已完成 | 默认 | 删除所有已完成的任务 |
| 删除全部 | 红色危险 | 删除全部任务（包括未完成的）|
| 导出 | 默认 | 导出数据为 JSON 文件 |
| 导入 | 默认 | 从 JSON 文件导入数据 |

## 使用方法

1. 点击"删除全部"按钮
2. 在弹出的确认对话框中查看将要删除的任务数量
3. 点击红色的"确定删除"按钮确认操作
4. 或点击"取消"按钮放弃操作

## 视觉区别

为了防止误操作，"删除全部"按钮使用了 `type="danger"` 属性：
- ✅ **清除已完成**：灰色/白色按钮（普通操作）
- ⚠️ **删除全部**：红色按钮（危险操作）

## 与"清除已完成"的区别

| 功能 | 清除已完成 | 删除全部 |
|------|-----------|---------|
| 删除范围 | 仅已完成的任务 | 所有任务 |
| 按钮颜色 | 默认 | 红色 |
| 对话框类型 | warning | error |
| 确认按钮 | 默认样式 | 红色危险样式 |

这样的设计让用户清楚地知道"删除全部"是一个更危险的操作！
