import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/', redirect: '/login' },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('../views/HomeView.vue'),
      },
      {
        path: 'projeto/:projectId',
        name: 'Projeto',
        component: () => import('../views/user/ProjetoView.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'admin/users',
        name: 'AdminUsers',
        component: () => import('../views/admin/UsersView.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'admin/projects',
        name: 'AdminProjects',
        component: () => import('../views/admin/ProjectsView.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'admin/metas',
        name: 'AdminMetas',
        component: () => import('../views/admin/MetasView.vue'),
        meta: { requiresAdmin: true },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isLoggedIn) return { name: 'Login' }
  if (to.meta.guest && auth.isLoggedIn) {
    return { name: 'Dashboard' }
  }
  if (to.meta.requiresAdmin && !auth.isAdmin) return { name: 'Dashboard' }
})

export default router
