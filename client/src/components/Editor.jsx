import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Radio,
  FormControlLabel,
  RadioGroup,
  TextField,
  IconButton,
} from "@mui/material";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import { io } from "socket.io-client";
import { useParams, useNavigate } from "react-router-dom";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import axios from "axios";

const Component = styled.div`
  background-color: #f5f5f5;
  padding: 10px;
`;

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

const Editor = () => {
  const { docId } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [quill, setQuill] = useState(null);
  const containerRef = useRef(null);
  const quillRef = useRef(null);

  const [username, setUsername] = useState("");

  // Share Modal State
  const [openShareDialog, setOpenShareDialog] = useState(false);
  const [permission, setPermission] = useState("view");
  const [shareLink, setShareLink] = useState("");

  // ✅ Verify JWT authentication using cookie
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const res = await axios.get("http://localhost:8000/verify", {
          withCredentials: true,
        });
        setUsername(res.data.name);
      } catch (err) {
        console.error("❌ Not authenticated:", err);
        navigate("/login");
      }
    };
    verifyAuth();
  }, [navigate]);

  // ✅ Setup Quill
  useEffect(() => {
    if (!containerRef.current || quillRef.current) return;

    const quillInstance = new Quill(containerRef.current, {
      theme: "snow",
      modules: { toolbar: toolbarOptions },
    });

    quillRef.current = quillInstance;
    setQuill(quillInstance);
  }, []);

  // ✅ Connect socket only after authentication and Quill init
  useEffect(() => {
    if (!quill || !username) return;

    const socketServer = io("http://localhost:8000", {
      withCredentials: true,
    });

    socketServer.on("connect", () => {
      console.log("✅ Connected to server:", socketServer.id);
      socketServer.emit("join-room", docId);
      setSocket(socketServer);
    });

    return () => {
      socketServer.disconnect();
    };
  }, [quill, username, docId]);

  // Load document content from backend
  useEffect(() => {
    if (!socket || !quill) return;

    socket.on("load-document", (content) => {
      quill.setContents(content);
      console.log("📂 Loaded document content");
    });

    const handleChange = (delta, oldDelta, source) => {
      if (source !== "user") return;
      socket.emit("send-changes", docId, delta);
    };

    quill.on("text-change", handleChange);

    return () => {
      quill.off("text-change", handleChange);
    };
  }, [socket, quill, docId]);

  useEffect(() => {
    if (!socket || !quill) return;

    socket.on("receive-changes", (delta) => {
      quill.updateContents(delta, "silent");
    });

    return () => {
      socket.off("receive-changes");
    };
  }, [socket, quill, docId]);

  // Auto-save every 2 seconds
  useEffect(() => {
    if (!socket || !quill) return;

    const interval = setInterval(() => {
      socket.emit("save-document", docId, quill.getContents());
    }, 2000);

    return () => clearInterval(interval);
  }, [socket, quill, docId]);

  // Handle Share Button Click
  const handleShareClick = async () => {
    try {
      const response = await axios.post(
        `http://localhost:8000/documents/${docId}/share`,
        { permission },
        { withCredentials: true }
      );
      setShareLink(response.data.sharedURL);
    } catch (error) {
      console.error("❌ Error generating shareable link:", error);
    }
  };

  // Copy Link to Clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
  };

  return (
    <Component>
      <h3>Welcome, {username}</h3>

      {/* Share Button */}
      <Button
        variant="contained"
        color="primary"
        onClick={() => setOpenShareDialog(true)}
        style={{ marginBottom: "10px" }}
      >
        Share
      </Button>

      {/* Quill Editor */}
      <Box ref={containerRef} id="container" className="container"></Box>

      {/* Share Document Modal */}
      <Dialog open={openShareDialog} onClose={() => setOpenShareDialog(false)}>
        <DialogTitle>Share Document</DialogTitle>
        <DialogContent>
          <RadioGroup
            value={permission}
            onChange={(e) => setPermission(e.target.value)}
          >
            <FormControlLabel value="view" control={<Radio />} label="View Only" />
            <FormControlLabel value="edit" control={<Radio />} label="Edit Access" />
          </RadioGroup>

          {shareLink && (
            <Box display="flex" alignItems="center" mt={2}>
              <TextField fullWidth value={shareLink} disabled />
              <IconButton onClick={copyToClipboard}>
                <ContentCopyIcon />
              </IconButton>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenShareDialog(false)} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleShareClick} color="primary" variant="contained">
            Generate Link
          </Button>
        </DialogActions>
      </Dialog>
    </Component>
  );
};

export default Editor;
