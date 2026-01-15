<template>
  <div class="container">
    지난 회의 이력 페이지
  </div>
</template>

<style>
.container {
  padding: 20px;
  font-size: 18px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}
</style>

<script>
import { onMounted } from 'vue'
import { useStore } from 'vuex'

export default {
  name: 'History',
  setup () {
    const store = useStore()

    // 페이지 진입 시 불리는 훅
    onMounted(() => {
      store.commit('menuStore/setMenuActiveMenuName', 'history')
    })
  }
}
</script>
