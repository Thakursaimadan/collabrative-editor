import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Home() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get("http://localhost:8000/verify", {
          withCredentials: true,
        });
        setUsername(res.data.name); // Get user name from JWT
      } catch (err) {
        console.error("Not authenticated:", err);
        navigate("/login");
      }
    };
    checkAuth();
  }, [navigate]);

  const createNewDocument = async () => {
    try {
      const response = await axios.post("http://localhost:8000/documents", {}, {
        withCredentials: true,
      });
      const docId = response.data.docId;
      console.log("📂 Created new document:", docId);
      navigate(`/editor/${docId}`);
    } catch (error) {
      console.error("Error creating document:", error);
    }
  };

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    const formData = new FormData();
    formData.append("file", uploadedFile);

    try {
      const response = await axios.post("http://localhost:8000/upload-docx", formData, {
        withCredentials: true,
      });
      const docId = response.data._id;
      navigate(`/editor/${docId}`);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  return (
    <div>
      <h1>Welcome, {username}</h1>
      <button onClick={createNewDocument}>Create New Document</button>
      <input type="file" accept=".docx" onChange={handleFileUpload} />
    </div>
  );
}

export default Home;
