"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;


export default function Login() {
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsCheckingAuth(true)
        const res = await axios.get(`${BACKEND_URL}/me`, {
          withCredentials: true,
        })
        console.log("User already logged in:", res.data)
        navigate("/")
      } catch (err) {
        console.log("Not logged in yet.")
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuth()
  }, [navigate])

  const handleLogin = async (e) => {
    e.preventDefault()

    if (!name || !password) {
      setError("Please enter both name and password.")
      return
    }

    try {
      setIsLoading(true)
      setError("")

      const response = await axios.post(`${BACKEND_URL}/login`, { name, password }, { withCredentials: true })

      console.log("Login response:", response.data)
      navigate("/")
    } catch (error) {
      console.error("Login error:", error)
      setError(error.response?.data?.message || "Login failed. Please check your credentials.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-8">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-1">Login</h2>
          <p className="text-center text-gray-500 mb-6">Enter your credentials to access your documents</p>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    {/* AlertCircle icon would go here */}
                    ⚠️
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                id="name"
                type="text"
                placeholder="Enter your username"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

