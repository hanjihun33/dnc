<template>
  <div class="main-header" :style="{ height: height }">
    <div class="logo-wrapper" @click="clickLogo"><div class="ic ic-logo"></div></div>
    <div class="hide-on-small">
      <div class="tool-wrapper">
        <div class="search-field">
          <input
            type="text"
            placeholder="검색"
            v-model="state.searchValue"
          />
          <i class="icon-search"></i>
        </div>
        <div class="button-wrapper">
          <button @click="clickRegister">회원가입</button>
          <button @click="clickLogin">로그인</button>
        </div>
      </div>
    </div>
    <div class="hide-on-big">
      <div class="menu-icon-wrapper" @click="changeCollapse"><i class="icon-menu"></i></div>
      <div class="menu-icon-wrapper"><i class="icon-search"></i></div>
      <div class="mobile-sidebar-wrapper" v-if="!state.isCollapse">
        <div class="mobile-sidebar">
          <div class="mobile-sidebar-tool-wrapper">
            <div class="logo-wrapper"><div class="ic ic-logo"></div></div>
            <button class="mobile-sidebar-btn login-btn" @click="clickLogin">로그인</button>
            <button class="mobile-sidebar-btn register-btn" @click="clickRegister">회원가입</button>
          </div>
          <ul class="menu">
            <li
              v-for="(item, index) in state.menuItems"
              :key="index"
              :class="{ active: index.toString() === state.activeIndex }"
              @click="menuSelect(index)"
            >
              <i v-if="item.icon" :class="['ic', item.icon]"></i>
              <span>{{ item.title }}</span>
            </li>
          </ul>
        </div>
        <div class="mobile-sidebar-backdrop" @click="changeCollapse"></div>
      </div>
    </div>
  </div>
</template>

<script>
import { reactive, computed } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'

export default {
  name: 'main-header',

  props: {
    height: {
      type: String,
      default: '70px'
    }
  },

  setup(props, { emit }) {
    const store = useStore()
    const router = useRouter()
    const state = reactive({
      searchValue: null,
      isCollapse: true,
      menuItems: computed(() => {
        const MenuItems = store.getters['menuStore/getMenus']
        return Object.keys(MenuItems).map(key => ({
          icon: MenuItems[key].icon,
          title: MenuItems[key].name
        }))
      }),
      activeIndex: computed(() => store.getters['menuStore/getActiveMenuIndex'])
    })

    if (state.activeIndex === -1) {
      state.activeIndex = 0
      store.commit('menuStore/setMenuActive', 0)
    }

    const menuSelect = function (index) {
      store.commit('menuStore/setMenuActive', index)
      const MenuItems = store.getters['menuStore/getMenus']
      let keys = Object.keys(MenuItems)
      router.push({
        name: keys[index]
      })
    }

    const clickLogo = () => {
      store.commit('menuStore/setMenuActive', 0)
      const MenuItems = store.getters['menuStore/getMenus']
      let keys = Object.keys(MenuItems)
      router.push({
        name: keys[0]
      })
    }

    const clickLogin = () => {
      emit('openLoginDialog')
    }

    const clickRegister = () => {
      // Register event handler
    }

    const changeCollapse = () => {
      state.isCollapse = !state.isCollapse
    }

    return { state, menuSelect, clickLogo, clickLogin, clickRegister, changeCollapse }
  }
}
</script>

<style>
.main-header {
  padding: 10px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Mobile, Tablet */
.menu-icon-wrapper {
  display: inline-block;
  vertical-align: top;
  position: relative;
  top: 14px;
}

.main-header .hide-on-big .logo-wrapper {
  display: inline-block;
  margin: 0 calc(50% - 51px);
}
.main-header .hide-on-big .logo-wrapper .ic.ic-logo {
  width: 70px;
  height: 50px;
  background-size: contain;
  background-repeat: no-repeat;
  background-image: url('../../../assets/images/ssafy-logo.png');
}
.mobile-sidebar-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.mobile-sidebar-wrapper .mobile-sidebar {
  width: 240px;
  height: calc(100vh - 1px);
  display: inline-block;
  background-color: white;
  padding: 0 10px;
  vertical-align: top;
}
.mobile-sidebar-wrapper .mobile-sidebar .mobile-sidebar-tool-wrapper {
  padding-bottom: 20px;
}
.mobile-sidebar-wrapper .mobile-sidebar .mobile-sidebar-btn {
  display: block;
  margin: 0 auto;
  margin-top: 25px;
  height: 30px;
  width: 100%;
}
.mobile-sidebar-wrapper .mobile-sidebar .mobile-sidebar-btn.login-btn {
  color: white;
}
.mobile-sidebar-wrapper .mobile-sidebar .logo-wrapper {
  display: block;
}
.mobile-sidebar-wrapper .mobile-sidebar .logo-wrapper .ic.ic-logo {
  width: 70px;
  height: 50px;
  margin: 0 auto;
  margin-top: 30px;
  background-size: contain;
  background-repeat: no-repeat;
  background-image: url('../../../assets/images/ssafy-logo.png');
}
.mobile-sidebar-wrapper .mobile-sidebar-backdrop {
  width: calc(100% - 260px);
  height: calc(100vh - 1px);
  background-color: black;
  display: inline-block;
  opacity: 0.3;
}
.mobile-sidebar-wrapper .menu {
  list-style: none;
  padding-left: 0;
  margin-top: 0;
  height: calc(100% - 235px);
}
.mobile-sidebar-wrapper .menu li {
  cursor: pointer;
  padding: 10px;
}
.mobile-sidebar-wrapper .menu li.active {
  color: #ffd04b;
}
.mobile-sidebar-wrapper .menu li .ic {
  margin-right: 5px;
}

/* Desktop */
.main-header .hide-on-small {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.main-header .logo-wrapper {
  cursor: pointer;
  display: flex;
  align-items: center;
}
.main-header .logo-wrapper .ic.ic-logo {
  width: 70px;
  height: 50px;
  background-size: contain;
  background-repeat: no-repeat;
  background-image: url('../../../assets/images/ssafy-logo.png');
}
.main-header .hide-on-small .tool-wrapper {
  display: flex;
  align-items: center;
  justify-content: center; /* 가운데 정렬을 위해 추가 */
  width: 100%;
}
.main-header .hide-on-small .tool-wrapper .search-field {
  position: relative;
  display: flex;
  align-items: center;
  background-color: white;
  padding: 0 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin: 0 20px; /* 양쪽에 여백 추가 */
  max-width: 400px; /* 검색창 최대 너비 지정 */
  width: 100%; /* 너비 100%로 설정 */
}
.main-header .hide-on-small .tool-wrapper .search-field input {
  width: 100%;
  height: 30px;
  border: none;
  outline: none;
}
.main-header .hide-on-small .tool-wrapper .button-wrapper {
  display: flex;
  align-items: center;
}
.main-header .hide-on-small .tool-wrapper .button-wrapper button {
  margin-left: 10px; /* 버튼과 검색창 사이에 여백 추가 */
  padding: 10px 20px;
  cursor: pointer;
  border: none;
  background-color: #f5f5f5;
  border-radius: 4px;
}
.main-header .hide-on-small .tool-wrapper .button-wrapper button:last-child {
  background-color: #409eff;
  color: white;
}
</style>
