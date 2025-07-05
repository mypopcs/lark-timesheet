import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import { tooltipDirective } from "./directives/tooltips";
import "./style.css"; //引入tailwind css

const app = createApp(App);

app.use(createPinia()); //启用pinia状态管理
app.directive("tooltip", tooltipDirective);

app.mount("#app");
