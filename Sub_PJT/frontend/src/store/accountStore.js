import { requestLogin } from "../common/api/accountAPI";
import { axios } from "../common/lib/axios";

const state = {
  token: null
};

const getters = {
  getToken: state => {
    return state.token;
  }
};

const mutations = {
  setToken: (state, token) => {
    state.token = token;
    // localStorage에도 저장하여 새로고침 후에도 유지
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }
};

const actions = {
  loginAction: async ({ commit }, loginData) => {
    const response = await requestLogin(loginData);
    const accessToken = response.data.accessToken;
    commit("setToken", accessToken);
    // axios 헤더에 토큰 설정
    if (accessToken) {
      axios.defaults.headers.Authorization = 'Bearer ' + accessToken;
    }
  }
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
};
