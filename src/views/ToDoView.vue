<template>
  <div>
    <div>Текст задачи</div>
    <input name="text" v-model="taskForm.text" />
  </div>
  <div>
    <div>Приоритет</div>
    <select name="priority" v-model="taskForm.priority">
      <option value="0">Низкий</option>
      <option value="1">Средний</option>
      <option value="2">Высокий</option>
    </select>
  </div>
  <div>
    <div>Дедлайн</div>
    <input type="date" name="date" v-model="taskForm.date" />
  </div>
  <button @click="addTask">Добавить</button>
  <table>
    <tr v-for="task in tasks" :key="task.id">
      <td>{{ task.text }}</td>
      <td>{{ task.priority }}</td>
      <td>{{ task.date }}</td>
      <td @click="deleteTask(task.id)">X</td>
    </tr>
  </table>
</template>

<script setup>
import { ref } from 'vue'

const tasks = ref([])
const taskForm = ref({
  text: null,
  priority: null,
  date: null,
})
let id = 0
const addTask = () => {
  tasks.value.push({ ...taskForm.value, id: id++ })
}

const deleteTask = (idDelete) => {
  tasks.value = tasks.value.filter((task) => task.id != idDelete)
}
</script>

<style lang="css" scoped></style>
