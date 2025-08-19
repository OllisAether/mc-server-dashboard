import './style.scss'
import { createApp } from 'vue'
import App from './App.vue'
import { createVuetify } from 'vuetify'
import 'vuetify/styles'

import * as directives from 'vuetify/directives'
import * as components from 'vuetify/components'
import router from './router'
import '@mdi/font/css/materialdesignicons.css'

createApp(App)
  .use(createVuetify({
    directives,
    components,
    theme: {
      defaultTheme: 'dark',
      themes: {
        dark: {
          colors: {
            primary: '#a965fcff'
          }
        }
      }
    },
    icons: {
      defaultSet: 'mdi',
    }
  }))
  .use(router)
  .mount('#app')
