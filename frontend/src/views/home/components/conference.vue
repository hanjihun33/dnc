<template>
  <div class="card">
    <div class="image-wrapper">
      <div class="skeleton-image"></div>
    </div>
    <div class="card-content">
      <span class="title">{{ title }}</span>
      <div class="bottom">
        <span>{{ desc }}</span>
      </div>
    </div>
  </div>
</template>

<style>
.card {
  margin: 0 8px;
  margin-bottom: 40px;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  background-color: white;
}
.image-wrapper {
  width: 100%;
  height: 190px;
  background-image: url('../../../assets/images/placeholder.png');
  background-size: cover; /* Ensures the image covers the entire div */
  background-position: center; /* Centers the image */
}
@keyframes pulse {
  0% {
    background-color: #e0e0e0;
  }
  50% {
    background-color: #f0f0f0;
  }
  100% {
    background-color: #e0e0e0;
  }
}
.card-content {
  text-align: left;
  padding: 14px;
}
.title {
  font-weight: bold;
}
.bottom {
  margin-top: 5px;
  display: -webkit-box;
  word-wrap: break-word;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* 테블릿, 모바일의 경우 두 줄 말줄임표시 */
@media (max-width: 1269px) {
  .bottom {
    -webkit-line-clamp: 2;
    height: 42px;
  }
}
/* 데스크탑의 경우 세 줄 말줄임표시 */
@media (min-width: 1270px) {
  .bottom {
    -webkit-line-clamp: 3;
    height: 60px;
  }
}
</style>

<script>
export default {
  name: 'Home',

  props: {
    title: {
      type: String,
      default: '제목'
    },
    desc: {
      type: String,
      default: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum."
    }
  }
}
</script>
