import {
  LayoutDashboard,
  Monitor,
  HelpCircle,
  Bell,
  Package,
  Palette,
  Settings,
  Wrench,
  UserCog,
  Users,
  Sparkles,
  TrendingUp,
  Eye,
  BookOpen,
  BarChart3,
  Clock,
  Wallet,
  ArrowLeftRight,
  Tag,
  GalleryVerticalEnd,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'satnaing',
    email: 'satnaingdev@gmail.com',
    avatar: '/avatars/shadcn.jpg',
  },
  navGroups: [
    {
      title: 'General',
      items: [
        {
          title: 'Dashboard',
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: 'Apps',
          url: '/apps',
          icon: Package,
        },
        {
          title: 'BeeAI',
          url: '/beeai',
          icon: Sparkles,
        },
        {
          title: 'Users',
          url: '/users',
          icon: Users,
        },
      ],
    },
    {
      title: 'Trading',
      items: [
        {
          title: 'BeeTrader',
          icon: TrendingUp,
          items: [
            {
              title: '巨鲸钱包管理',
              url: '/beetrader/whale-wallet-manage',
              icon: Eye,
            },
            {
              title: '巨鲸观察',
              url: '/beetrader/monitor-observation',
              icon: Monitor,
            },
            {
              title: '宏观市场',
              url: '/beetrader/macroscopic',
              icon: BarChart3,
            },
            {
              title: 'K线观察',
              url: '/beetrader/candles',
              icon: GalleryVerticalEnd,
            },
            {
              title: '信号模块',
              url: '/beetrader/signals',
              icon: TrendingUp,
            },
            {
              title: '交易策略库',
              url: '/beetrader/strategies',
              icon: BookOpen,
            },
            {
              title: '回测模块',
              url: '/beetrader/backtest',
              icon: BarChart3,
            },
          ],
        },
      ],
    },
    {
      title: 'Finance',
      items: [
        {
          title: '财务管理',
          icon: Wallet,
          items: [
            {
              title: '支出统计',
              url: '/finance/statistics',
              icon: BarChart3,
            },
            {
              title: '记账管理',
              url: '/finance/expenses',
              icon: Wallet,
            },
            {
              title: '汇率转换',
              url: '/finance/exchange-rate',
              icon: ArrowLeftRight,
            },
            {
              title: '记账类型管理',
              url: '/finance/categories',
              icon: Tag,
            },
          ],
        },
      ],
    },
    {
      title: 'Monitoring',
      items: [
        {
          title: '后台任务',
          url: '/monitoring/tasks',
          icon: Clock,
        },
      ],
    },
    
    // {
    //   title: 'Pages',
    //   items: [
    //     {
    //       title: 'Auth',
    //       icon: ShieldCheck,
    //       items: [
    //         {
    //           title: 'Sign In',
    //           url: '/sign-in',
    //         },
    //         {
    //           title: 'Sign In (2 Col)',
    //           url: '/sign-in-2',
    //         },
    //         {
    //           title: 'Sign Up',
    //           url: '/sign-up',
    //         },
    //         {
    //           title: 'Forgot Password',
    //           url: '/forgot-password',
    //         },
    //         {
    //           title: 'OTP',
    //           url: '/otp',
    //         },
    //       ],
    //     },
    //     {
    //       title: 'Errors',
    //       icon: Bug,
    //       items: [
    //         {
    //           title: 'Unauthorized',
    //           url: '/errors/unauthorized',
    //           icon: Lock,
    //         },
    //         {
    //           title: 'Forbidden',
    //           url: '/errors/forbidden',
    //           icon: UserX,
    //         },
    //         {
    //           title: 'Not Found',
    //           url: '/errors/not-found',
    //           icon: FileX,
    //         },
    //         {
    //           title: 'Internal Server Error',
    //           url: '/errors/internal-server-error',
    //           icon: ServerOff,
    //         },
    //         {
    //           title: 'Maintenance Error',
    //           url: '/errors/maintenance-error',
    //           icon: Construction,
    //         },
    //       ],
    //     },
    //   ],
    // },
    {
      title: 'Other',
      items: [
        {
          title: 'Settings',
          icon: Settings,
          items: [
            {
              title: 'Profile',
              url: '/settings',
              icon: UserCog,
            },
            {
              title: 'Account',
              url: '/settings/account',
              icon: Wrench,
            },
            {
              title: 'Appearance',
              url: '/settings/appearance',
              icon: Palette,
            },
            {
              title: 'Notifications',
              url: '/settings/notifications',
              icon: Bell,
            },
            {
              title: 'Display',
              url: '/settings/display',
              icon: Monitor,
            },
          ],
        },
        {
          title: 'Help Center',
          url: '/help-center',
          icon: HelpCircle,
        },
      ],
    },
  ],
}
