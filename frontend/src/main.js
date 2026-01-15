// 기본 플러그인 Import
import { createApp, h } from 'vue'
import ElementPlus from 'element-plus'
import store from './store'
import App from './App.vue'
import { VueAxios, axios } from './common/lib/axios'
import router from './common/lib/vue-router'

import 'element-plus/dist/index.css'

// 앱 시작 시 localStorage에서 accessToken을 가져와서 axios 헤더에 설정
const accessToken = localStorage.getItem('accessToken')
if (accessToken) {
  axios.defaults.headers.Authorization = 'Bearer ' + accessToken
}

const app = createApp({
  render: ()=>h(App)
})
app.use(VueAxios, axios)
app.use(store)
app.use(router)
// ElementPlus를 app.use()로 등록하면 모든 컴포넌트와 플러그인이 자동으로 등록됩니다.
// 별도로 플러그인을 등록할 필요가 없습니다.
app.use(ElementPlus, {
  // options
})

app.mount('#app')
