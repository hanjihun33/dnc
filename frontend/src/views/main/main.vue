<template>
  <div class="main-wrapper">
    <main-header
      :height="'70px'"
      @openLoginDialog="onOpenLoginDialog"/>
    <div class="main-container">
      <aside class="sidebar hide-on-small" style="width: 240px;">
        <main-sidebar :width="'240px'"/>
      </aside>
      <main class="main-content">
        <router-view></router-view>
      </main>
    </div>
    <main-footer :height="'110px'"/>
    <login-dialog
      :open="loginDialogOpen"
      @closeLoginDialog="onCloseLoginDialog"/>
  </div>
</template>

<style>
@import './main.css';
@import '../../common/css/common.css';

.main-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.main-container {
  display: flex;
  flex: 1;
}

.sidebar {
  display: flex;
  flex-shrink: 0;
}

.main-content {
  flex: 1;
  padding: 20px;
}

.hide-on-small {
  display: none;
}

@media (min-width: 768px) {
  .hide-on-small {
    display: block;
  }
}
</style>

<script>
import LoginDialog from './components/login-dialog'
import MainHeader from './components/main-header'
import MainSidebar from './components/main-sidebar'
import MainFooter from './components/main-footer'

export default {
  name: 'Main',
  components: {
    MainHeader,
    MainSidebar,
    MainFooter,
    LoginDialog
  },
  data() {
    return {
      loginDialogOpen: false
    }
  },
  methods: {
    onOpenLoginDialog() {
      this.loginDialogOpen = true
    },
    onCloseLoginDialog() {
      this.loginDialogOpen = false
    }
  }
}
</script>
