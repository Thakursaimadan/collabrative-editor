import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Home() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [documents, setDocuments] = useState([]);
  const [sharedUsersMap, setSharedUsersMap] = useState({});
  const [showSharedUsersFor, setShowSharedUsersFor] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await axios.get("http://localhost:8000/verify", {
          withCredentials: true,
        });
        setUsername(res.data.name);
        fetchDocuments(res.data.userId);
      } catch (err) {
        console.error("Not authenticated:", err);
        navigate("/login");
      }
    };

    const fetchDocuments = async (userId) => {
      try {
        const res = await axios.get(`http://localhost:8000/users/${userId}/documents`, {
          withCredentials: true,
        });
        setDocuments(res.data);
      } catch (err) {
        console.error("❌ Error fetching documents:", err);
      }
    };

    fetchUserData();
  }, [navigate]);

  const createNewDocument = async () => {
    const title = prompt("Enter title for the new document:");
    if (!title) return;

    try {
      const response = await axios.post(
        "http://localhost:8000/documents",
        { title },
        { withCredentials: true }
      );
      const docId = response.data.docId;
      navigate(`/editor/${docId}`);
    } catch (error) {
      console.error("Error creating document:", error);
    }
  };

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    const title = prompt("Enter title for the uploaded document:");
    if (!title) return;

    const formData = new FormData();
    formData.append("file", uploadedFile);
    formData.append("title", title);

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

  const fetchSharedUsers = async (docId) => {
    if (showSharedUsersFor === docId) {
      setShowSharedUsersFor(null);
    } else {
      try {
        if (!sharedUsersMap[docId]) {
          const res = await axios.get(`http://localhost:8000/documents/${docId}/shared-users`, {
            withCredentials: true,
          });
          const sharedList = res.data; 
  
          const userIds = sharedList.map((u) => u.userId);
          const namesRes = await axios.get(`http://localhost:8000/users/names`, {
            params: { ids: userIds.join(",") },
            withCredentials: true,
          });
  
          const nameMap = {};
          namesRes.data.forEach((u) => {
            nameMap[u._id] = u.name;
          });
  
          const enrichedSharedList = sharedList.map((user) => ({
            ...user,
            name: nameMap[user.userId] || "Unknown User",
          }));
  
          setSharedUsersMap((prev) => ({ ...prev, [docId]: enrichedSharedList }));
        }
        setShowSharedUsersFor(docId);
      } catch (err) {
        console.error("Error fetching shared users:", err);
        alert("Something went wrong while fetching shared users.");
      }
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;

    try {
      await axios.delete(`http://localhost:8000/documents/${docId}`, {
        withCredentials: true,
      });
      setDocuments((prevDocs) => prevDocs.filter((doc) => doc._id !== docId));
      alert("Document deleted successfully.");
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Failed to delete document.");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Welcome, {username}</h1>
      <button onClick={createNewDocument}>➕ Create New Document</button>
      <br /><br />
      <input type="file" accept=".docx" onChange={handleFileUpload} />
      <br /><br />

      <h2>Your Documents</h2>
      {documents.length === 0 ? (
        <p>No documents found.</p>
      ) : (
        documents.map((doc) => (
          <div key={doc._id} style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "10px" }}>
            <h3 style={{ cursor: "pointer", color: "blue" }} onClick={() => navigate(`/editor/${doc._id}`)}>
              📄 {doc.title || "Untitled Document"}
            </h3>
            <p><b>Last Updated:</b> {new Date(doc.lastUpdated).toLocaleString()}</p>
            <button onClick={() => fetchSharedUsers(doc._id)}>
              {showSharedUsersFor === doc._id ? "🔽 Hide Shared Users" : "👥 Show Shared Users"}
            </button>
            &nbsp;
            <button style={{ color: "red" }} onClick={() => handleDeleteDocument(doc._id)}>🗑️ Delete</button>

            {showSharedUsersFor === doc._id && sharedUsersMap[doc._id] && (
              <div style={{ marginTop: "10px" }}>
                <b>Users shared with:</b>
                <ul>
                  {sharedUsersMap[doc._id].length === 0 ? (
                    <li>No users shared yet</li>
                  ) : (
                    sharedUsersMap[doc._id].map((user, idx) => (
                      <li key={idx}>
                        {user.name} ({user.permission})
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default Home;
