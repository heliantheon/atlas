import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { configureAudiences, defaultScopeString } from '@atlas/shared'
import { Toaster } from '@atlas/ui/toast'
import App from './App'
import '@atlas/ui/globals.css'
import '@heliannuuthus/ui/styles.css'
import './index.scss'

dayjs.locale('zh-cn')

configureAudiences({ chaos: { scope: defaultScopeString } })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN}>
      <App />
    </ConfigProvider>
    <Toaster />
  </React.StrictMode>
)
