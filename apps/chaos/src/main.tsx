import React from 'react'
import ReactDOM from 'react-dom/client'
import { configureAudiences, defaultScopeString } from '@atlas/shared'
import { Toast } from '@heliannuuthus/ui'
import App from './App'
import '@atlas/ui/globals.css'
import '@heliannuuthus/ui/styles.css'
import './index.scss'

configureAudiences({ chaos: { scope: defaultScopeString } })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <>
      <App />
      <Toast />
    </>
  </React.StrictMode>
)
