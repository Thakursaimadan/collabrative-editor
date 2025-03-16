import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import axios from "axios";

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
  ];
const SharedDocument = () => {
  const { linkId } = useParams(); 
  const [docId, setDocId] = useState(null);
  const [permission, setPermission] = useState(null);
  const containerRef = useRef(null);
  const quillRef = useRef(null);
  const socket = useRef(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/documents/shared/${linkId}`, {
          withCredentials: true
        });
  
        console.log("📄 Shared document:", response.data);
  
        setDocId(response.data.document._id); // ✅ correct way
        setPermission(response.data.permission);
      } catch (error) {
        console.error("❌ Error loading document:", error?.response?.data || error.message);
      }
    };
  
    fetchDocument();
  }, [linkId]);

  useEffect(() => {
    if (!docId || !containerRef.current) return;

    if (!quillRef.current) {
      const quillInstance = new Quill(containerRef.current, {
        theme: "snow",
        readOnly: permission === "view",
        modules: { toolbar: permission === "edit" && toolbarOptions },
      });

      quillRef.current = quillInstance;
    }
  }, [docId, permission]); // ✅ Wait for docId before initializing Quill

  useEffect(() => {
    if (!docId) return;

    if (!socket.current) {
      socket.current = io("http://localhost:8000");

      socket.current.on("connect", () => {
        console.log("✅ Connected to server");
        socket.current.emit("join-room", docId); // ✅ Use docId instead of linkId
      });

      socket.current.on("receive-changes", (delta) => {
        if (quillRef.current) {
          quillRef.current.updateContents(delta, "silent");
        }
      });

      socket.current.on("load-document", (content) => {
        if (quillRef.current) {
          quillRef.current.setContents(content);
        }
      });
    }
  }, [docId]);

  useEffect(() => {
    if (!quillRef.current || permission !== "edit") return;

    const handleChange = (delta, oldDelta, source) => {
      if (source !== "user") return;
      socket.current.emit("send-changes", docId, delta);
    };

    quillRef.current.on("text-change", handleChange);

    return () => {
      quillRef.current.off("text-change", handleChange);
    };
  }, [docId, permission]);

  useEffect(() => {
    if (!socket.current || !quillRef.current || permission !== "edit") return;

    const interval = setInterval(() => {
      socket.current.emit("save-document", docId, quillRef.current.getContents());
    }, 2000);

    return () => clearInterval(interval);
  }, [docId, permission]);

  return (
    <div>
      <h2>Shared Document</h2>
      {docId ? (
        <div ref={containerRef} id="editor-container" style={{ height: "400px" }}></div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default SharedDocument;