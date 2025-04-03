"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { io } from "socket.io-client"
import Quill from "quill"
import "quill/dist/quill.snow.css"
import axios from "axios"

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

const Editor = () => {
  const { docId } = useParams()
  const navigate = useNavigate()
  const [socket, setSocket] = useState(null)
  const [quill, setQuill] = useState(null)
  const containerRef = useRef(null)
  const quillRef = useRef(null)
  const [isLoading, setIsLoading] = useState(true)

  const [username, setUsername] = useState("")
  const [documentTitle, setDocumentTitle] = useState("Untitled Document")

  // Share Modal State
  const [openShareDialog, setOpenShareDialog] = useState(false)
  const [permission, setPermission] = useState("view")
  const [shareLink, setShareLink] = useState("")
  const [copySuccess, setCopySuccess] = useState(false)

  // ✅ Verify JWT authentication using cookie
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const res = await axios.get("http://localhost:8000/verify", {
          withCredentials: true,
        })
        setUsername(res.data.name)

        // Fetch document title
        try {
          const docRes = await axios.get(`http://localhost:8000/documents/${docId}`, {
            withCredentials: true,
          })
          if (docRes.data && docRes.data.title) {
            setDocumentTitle(docRes.data.title)
          }
        } catch (err) {
          console.error("Error fetching document title:", err)
        }

        setIsLoading(false)
      } catch (err) {
        console.error("❌ Not authenticated:", err)
        navigate("/login")
      }
    }
    verifyAuth()
  }, [navigate, docId])

  // ✅ Setup Quill
  useEffect(() => {
    if (!containerRef.current || quillRef.current || isLoading) return

    const quillInstance = new Quill(containerRef.current, {
      theme: "snow",
      modules: { toolbar: toolbarOptions },
      placeholder: "Start writing something amazing...",
    })

    quillRef.current = quillInstance
    setQuill(quillInstance)

    // Focus the editor
    setTimeout(() => {
      quillInstance.focus()
    }, 0)
  }, [isLoading])

  // ✅ Connect socket only after authentication and Quill init
  useEffect(() => {
    if (!quill || !username) return

    const socketServer = io("http://localhost:8000", {
      withCredentials: true,
    })

    socketServer.on("connect", () => {
      console.log("✅ Connected to server:", socketServer.id)
      socketServer.emit("join-room", docId)
      setSocket(socketServer)
    })

    return () => {
      socketServer.disconnect()
    }
  }, [quill, username, docId])

  // Load document content from backend
  useEffect(() => {
    if (!socket || !quill) return

    socket.on("load-document", (content) => {
      quill.setContents(content)
      console.log("📂 Loaded document content")
    })

    const handleChange = (delta, oldDelta, source) => {
      if (source !== "user") return
      socket.emit("send-changes", docId, delta)
    }

    quill.on("text-change", handleChange)

    return () => {
      quill.off("text-change", handleChange)
    }
  }, [socket, quill, docId])

  useEffect(() => {
    if (!socket || !quill) return

    socket.on("receive-changes", (delta) => {
      quill.updateContents(delta, "silent")
    })

    return () => {
      socket.off("receive-changes")
    }
  }, [socket, quill, docId])

  // Auto-save every 2 seconds
  useEffect(() => {
    if (!socket || !quill) return

    const interval = setInterval(() => {
      socket.emit("save-document", docId, quill.getContents())
    }, 2000)

    return () => clearInterval(interval)
  }, [socket, quill, docId])

  // Handle Share Button Click
  const handleShareClick = async () => {
    try {
      const response = await axios.post(
        `http://localhost:8000/documents/${docId}/share`,
        { permission },
        { withCredentials: true },
      )
      setShareLink(response.data.sharedURL)
    } catch (error) {
      console.error("❌ Error generating shareable link:", error)
    }
  }

  // Copy Link to Clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const goBack = () => {
    navigate("/")
  }

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
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={goBack}
              className="text-gray-600 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              ←
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-800">{documentTitle}</h1>
              <p className="text-sm text-gray-500">Last saved: just now</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{username}</span>
            <button
              onClick={() => setOpenShareDialog(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
            >
              Share
            </button>
          </div>
        </div>
      </header>

      {/* Editor Container */}
      <div className="flex-grow flex flex-col overflow-hidden">
        {/* The Quill container needs to be styled to take available space */}
        <div className="flex-grow flex flex-col">
          <div ref={containerRef} className="flex-grow overflow-auto"></div>
        </div>
      </div>

      {/* Share Dialog */}
      {openShareDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-medium mb-4">Share Document</h3>

            <div className="mb-4">
              <div className="flex items-center mb-2">
                <input
                  type="radio"
                  id="view-permission"
                  name="permission"
                  value="view"
                  checked={permission === "view"}
                  onChange={(e) => setPermission(e.target.value)}
                  className="mr-2"
                />
                <label htmlFor="view-permission" className="text-gray-700">
                  View Only
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="edit-permission"
                  name="permission"
                  value="edit"
                  checked={permission === "edit"}
                  onChange={(e) => setPermission(e.target.value)}
                  className="mr-2"
                />
                <label htmlFor="edit-permission" className="text-gray-700">
                  Edit Access
                </label>
              </div>
            </div>

            {shareLink && (
              <div className="mt-4 mb-4">
                <div className="flex items-center">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={copyToClipboard}
                    className={`px-3 py-2 rounded-r-md ${
                      copySuccess ? "bg-green-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {copySuccess ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setOpenShareDialog(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleShareClick}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Generate Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Editor

