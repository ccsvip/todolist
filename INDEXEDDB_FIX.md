# IndexedDB 序列化问题修复

## 问题描述

错误信息：`Failed to execute 'put' on 'IDBObjectStore': [object Array] could not be cloned`

这是一个 IndexedDB 的序列化问题。IndexedDB 只能存储可以被**结构化克隆**的数据，某些 JavaScript 对象（如包含函数、Symbol、或循环引用的对象）无法被存储。

## 根本原因

1. **Pinia 响应式对象**：Vue 3 的响应式系统会给对象添加内部属性（如 `__v_isRef`, `__v_isReactive` 等），这些属性不能被 IndexedDB 序列化
2. **对象引用**：直接传递响应式对象到 IndexedDB 会导致序列化失败

## 解决方案

### 1. saveTasks 方法 (taskStore.js:159-171)

```javascript
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
}
```

**关键点**：使用 `JSON.parse(JSON.stringify())` 进行深拷贝，移除所有 Vue 的响应式包装

### 2. importData 方法 (taskStore.js:199-246)

```javascript
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
```

**关键点**：创建新的纯对象，只包含需要的字段，避免引入任何不可序列化的属性

### 3. addTask 方法 (taskStore.js:70-86)

```javascript
const task = {
  id: Date.now(),
  text: text.trim(),
  completed: false,
  createdAt: new Date().toISOString(),
  completedAt: null,
  updatedAt: null,
  dueDate: null
}
```

**关键点**：确保所有字段都是可序列化的基本类型或 null

## 为什么现在可以工作

1. **数据清理**：通过 `JSON.parse(JSON.stringify())` 移除了所有 Vue 响应式包装
2. **显式字段定义**：在导入和添加任务时，明确定义所有字段，避免意外引入不可序列化的属性
3. **类型安全**：所有字段都是 JavaScript 的基本类型（string, number, boolean, null），这些都可以被 IndexedDB 序列化

## IndexedDB 可以序列化的数据类型

✅ **支持**：
- 基本类型：string, number, boolean, null, undefined
- Date 对象
- RegExp 对象
- Blob 对象
- File 对象
- 普通对象和数组

❌ **不支持**：
- 函数
- Symbol
- 包含循环引用的对象
- DOM 节点
- Error 对象
- 响应式对象（如 Vue Reactive）

## 测试验证

现在您可以：
1. ✅ 添加新任务 - 会正确保存到 IndexedDB
2. ✅ 删除任务 - 会正确更新 IndexedDB
3. ✅ 清除已完成任务 - 会正确保存到 IndexedDB
4. ✅ 导入数据 - 会正确清理并保存数据
5. ✅ 导出数据 - 数据格式正确

所有操作都会在控制台输出详细日志，便于调试！
