import { createRouter, createWebHistory } from 'vue-router';

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
      component: () => import('@/views/Services.vue'),
    },
    {
      path: '/traces',
      name: 'Traces',
      component: () => import('@/views/Traces.vue'),
    },
    {
      path: '/traces/:traceId',
      name: 'TraceDetail',
      component: () => import('@/views/TraceDetail.vue'),
    },
    {
      path: '/errors',
      name: 'Errors',
      component: () => import('@/views/Errors.vue'),
    },
    {
      path: '/slow',
      name: 'SlowCalls',
      component: () => import('@/views/SlowCalls.vue'),
    },
  ],
});

export default router;
