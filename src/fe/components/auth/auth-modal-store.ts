'use client'

import { useState, useEffect } from 'react'

export type AuthModalView = 'login' | 'register'

let listeners: Function[] = []
let isOpen = false
let view: AuthModalView = 'login'

export const authModalStore = {
  open: (v: AuthModalView = 'login') => {
    isOpen = true
    view = v
    triggerListeners()
  },
  close: () => {
    isOpen = false
    triggerListeners()
  },
  setView: (v: AuthModalView) => {
    view = v
    triggerListeners()
  },
  getState: () => ({ isOpen, view })
}

function triggerListeners() {
  for (const listener of listeners) {
    listener()
  }
}

export function useAuthModal() {
  const [state, setState] = useState(authModalStore.getState())

  useEffect(() => {
    const listener = () => setState(authModalStore.getState())
    listeners.push(listener)
    return () => {
      listeners = listeners.filter(l => l !== listener)
    }
  }, [])

  return { 
    ...state, 
    openModal: authModalStore.open, 
    closeModal: authModalStore.close, 
    setView: authModalStore.setView 
  }
}
