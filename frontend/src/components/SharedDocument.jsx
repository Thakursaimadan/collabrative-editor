"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { io } from "socket.io-client"
import Quill from "quill"
import "quill/dist/quill.snow.css"
import axios from "axios"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;




const toolbarOptions = [
  ["bold", "italic", "underline", "strike"],
  ["blockquote", "code-block"],
  ["link", "image", "video", "formula"],
  [{ header: 1 }, { header: 2 }],
  [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
  [{ script: "sub" }, { script: "super" }],
  [{ indent: "-1" }, { indent: "+1" }],
  [{ direction: "rtl" }],
  [{ size: ["small", false, "large", "huge"] }],
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ color: [] }, { background: [] }],
  [{ font: [] }],
  [{ align: [] }],
  ["clean"],
]

const SharedDocument = () => {
  const { linkId } = useParams()
  const navigate = useNavigate()
  const [docId, setDocId] = useState(null)
  const [permission, setPermission] = useState(null)
  const [documentTitle, setDocumentTitle] = useState("Shared Document")
  const [isLoading, setIsLoading] = useState(true)
  const containerRef = useRef(null)
  const quillRef = useRef(null)
  const socket = useRef(null)
  

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setIsLoading(true)
        const response = await axios.get(`${BACKEND_URL}/documents/shared/${linkId}`, {
          withCredentials: true,
        })

        console.log("📄 Shared document:", response.data)

        setDocId(response.data.document._id)
        setPermission(response.data.permission)

        if (response.data.document.title) {
          setDocumentTitle(response.data.document.title)
        }

        setIsLoading(false)
      } catch (error) {
        console.error("❌ Error loading document:", error?.response?.data || error.message)
        setIsLoading(false)
      }
    }

    fetchDocument()
  }, [linkId])

  useEffect(() => {
    if (!docId || !containerRef.current || isLoading) return

    if (!quillRef.current) {
      const quillInstance = new Quill(containerRef.current, {
        theme: "snow",
        readOnly: permission === "view",
        modules: { toolbar: permission === "edit" ? toolbarOptions : false },
        placeholder: "This document is loading...",
      })

      quillRef.current = quillInstance
    }
  }, [docId, permission, isLoading])

  useEffect(() => {
    if (!docId) return

    if (!socket.current) {
      socket.current = io(`${BACKEND_URL}`)

      socket.current.on("connect", () => {
        console.log("✅ Connected to server")
        socket.current.emit("join-room", docId)
      })

      socket.current.on("receive-changes", (delta) => {
        if (quillRef.current) {
          quillRef.current.updateContents(delta, "silent")
        }
      })

      socket.current.on("load-document", (content) => {
        if (quillRef.current) {
          quillRef.current.setContents(content)
        }
      })
    }
  }, [docId])

  useEffect(() => {
    if (!quillRef.current || permission !== "edit") return

    const handleChange = (delta, oldDelta, source) => {
      if (source !== "user") return
      socket.current.emit("send-changes", docId, delta)
    }

    quillRef.current.on("text-change", handleChange)

    return () => {
      quillRef.current.off("text-change", handleChange)
    }
  }, [docId, permission])

  useEffect(() => {
    if (!socket.current || !quillRef.current || permission !== "edit") return

    const interval = setInterval(() => {
      socket.current.emit("save-document", docId, quillRef.current.getContents())
    }, 2000)

    return () => clearInterval(interval)
  }, [docId, permission])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/")}
                className="text-gray-600 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                ←
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-800">{documentTitle}</h1>
                <div className="flex items-center">
                  <span
                    className={`inline-block px-2 py-1 text-xs rounded-full ${
                      permission === "edit" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {permission === "edit" ? "Can Edit" : "View Only"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Editor Container */}
      <div className="flex-grow flex flex-col overflow-hidden">
        {docId ? (
          <div className="flex-grow flex flex-col">
            <div ref={containerRef} className="flex-grow overflow-auto"></div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8 max-w-md">
              <div className="text-5xl mb-4">📝</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Document Not Found</h2>
              <p className="text-gray-600 mb-6">
                The document you're trying to access may have been removed or the link is invalid.
              </p>
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Go Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SharedDocument

