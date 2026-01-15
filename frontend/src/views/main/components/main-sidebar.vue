<template>
  <div class="main-sidebar" :style="{ width: width }">
    <div class="hide-on-small">
      <ul class="menu-vertical">
        <li
          v-for="(item, index) in state.menuItems"
          :key="index"
          :class="{ active: state.activeIndex === index }"
          @click="menuSelect(index)">
          <i v-if="item.icon" :class="['ic', item.icon]"></i>
          <span>{{ item.title }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { reactive, computed } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'

export default {
  name: 'MainSidebar',

  props: {
    width: {
      type: String,
      default: '240px'
    }
  },

  setup() {
    const store = useStore()
    const router = useRouter()

    const state = reactive({
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

    const menuSelect = (index) => {
      store.commit('menuStore/setMenuActive', index)
      const MenuItems = store.getters['menuStore/getMenus']
      const keys = Object.keys(MenuItems)
      router.push({ name: keys[index] })
    }

    return { state, menuSelect }
  }
}
</script>

<style>
.main-sidebar {
  padding: 10px;
  background-color: #f5f5f5;
}

.hide-on-small {
  height: 100%;
}

.menu-vertical {
  list-style: none;
  padding: 0;
  margin: 0;
  height: 100%;
  overflow-y: auto;
}

.menu-vertical li {
  padding: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.menu-vertical li.active {
  background-color: #409eff;
  color: white;
}

.menu-vertical li .ic {
  margin-right: 10px;
}
</style>
