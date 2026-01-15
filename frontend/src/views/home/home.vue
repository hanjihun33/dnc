<template>
  <el-scrollbar class="infinite-list" @scroll="handleScroll">
    <ul class="infinite-list-content">
      <li v-for="i in state.count" @click="clickConference(i)" class="infinite-list-item" :key="i" >
        <conference />
      </li>
    </ul>
  </el-scrollbar>
</template>
<style>
.infinite-list {
  height: calc(100% - 35px);
}

.infinite-list-content {
  padding-left: 0;
  margin: 0;
  list-style: none;
}

@media (min-width: 701px) and (max-width: 1269px) {
  .infinite-list {
    min-width: 700px;
  }
}

@media (min-width: 1270px) {
  .infinite-list {
    min-width: 1021px;
  }
}

.infinite-list .infinite-list-item {
  min-width: 335px;
  max-width: 25%;
  display: inline-block;
  cursor: pointer;
}
</style>
<script>
import Conference from './components/conference'
import { reactive } from 'vue'
import { useRouter } from 'vue-router'

export default {
  name: 'Home',

  components: {
    Conference
  },

  setup () {
    const router = useRouter()

    const state = reactive({
      count: 12
    })

    const load = function () {
      state.count += 4
    }

    // el-scrollbar의 infinite scroll을 위한 핸들러
    const handleScroll = function ({ scrollTop, scrollHeight, clientHeight }) {
      // 스크롤이 하단 근처에 도달했을 때 load 함수 호출
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        load()
      }
    }

    const clickConference = function (id) {
      router.push({
        name: 'conference-detail',
        params: {
          conferenceId: id
        }
      })
    }

    return { state, load, handleScroll, clickConference }
  }
}
</script>
