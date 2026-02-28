import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/services',
    },
    {
      path: '/services',
      name: 'Services',
      component: () => import('../views/Services.vue'),
      meta: { title: 'Services' },
    },
    {
      path: '/traces',
      name: 'Traces',
      component: () => import('../views/Traces.vue'),
      meta: { title: 'Traces' },
    },
    {
      path: '/traces/:traceId',
      name: 'TraceDetail',
      component: () => import('../views/TraceDetail.vue'),
      meta: { title: 'Trace Detail' },
    },
    {
      path: '/errors',
      name: 'Errors',
      component: () => import('../views/Errors.vue'),
      meta: { title: 'Errors' },
    },
    {
      path: '/slow',
      name: 'SlowCalls',
      component: () => import('../views/SlowCalls.vue'),
      meta: { title: 'Slow Calls' },
    },
  ],
})

export default router
