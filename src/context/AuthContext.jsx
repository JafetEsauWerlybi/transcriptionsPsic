import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken]   = useState(() => localStorage.getItem('token'))
  const [nombre, setNombre] = useState(() => localStorage.getItem('nombre'))

  function login(t, n) {
    localStorage.setItem('token', t)
    localStorage.setItem('nombre', n)
    setToken(t)
    setNombre(n)
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('nombre')
    setToken(null)
    setNombre(null)
  }

  return (
    <AuthContext.Provider value={{ token, nombre, login, logout, isAuth: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
