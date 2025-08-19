import { createRouter, createWebHistory } from 'vue-router'

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/customPaintings'
    },
    {
      path: '/customPaintings',
      name: 'customPaintings',
      component: () => import('./views/CustomPaintingsView.vue')
    }
  ]
})
