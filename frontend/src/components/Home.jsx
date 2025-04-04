import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function Home() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [documents, setDocuments] = useState([]);
  const [showSharedUsersFor, setShowSharedUsersFor] = useState(null);
  const [sharedUsersMap, setSharedUsersMap] = useState({});

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/verify`, {
          withCredentials: true,
        });
        setUsername(res.data.name);
        fetchDocuments(res.data.userId);
      } catch (err) {
        navigate("/login");
      }
    };

    const fetchDocuments = async (userId) => {
      try {
        const res = await axios.get(
          `${BACKEND_URL}/users/${userId}/documents`,
          {
            withCredentials: true,
          }
        );
        setDocuments(res.data);
      } catch (err) {
        console.error("Error fetching documents:", err);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleLogout = async () => {
    if (!window.confirm("Are you sure you want to log out?")) return;
    try {
      await axios.get(`${BACKEND_URL}/logout`, { withCredentials: true });
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
      alert("Logout failed. Try again.");
    }
  };

  const createNewDocument = async () => {
    const title = prompt("Enter title for the new document:");
    if (!title) return;

    try {
      const response = await axios.post(
        `${BACKEND_URL}/documents`,
        { title },
        { withCredentials: true }
      );
      navigate(`/editor/${response.data.docId}`);
    } catch (error) {
      console.error("Error creating document:", error);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this document?"))
      return;

    try {
      await axios.delete(`${BACKEND_URL}/documents/${docId}`, {
        withCredentials: true,
      });
      setDocuments((prevDocs) => prevDocs.filter((doc) => doc._id !== docId));
      alert("Document deleted successfully.");
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Failed to delete document.");
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
      const response = await axios.post(
        `${BACKEND_URL}/upload-docx`,
        formData,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      navigate(`/editor/${response.data.docId}`);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome, {username}
          </h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={createNewDocument}
            className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 transition"
          >
            ➕ Create New Document
          </button>

          <label className="bg-gray-200 text-gray-700 px-5 py-2 rounded-md cursor-pointer hover:bg-gray-300 transition">
            📂 Upload DOCX
            <input
              type="file"
              accept=".docx"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        <h2 className="text-2xl font-semibold mb-4">Your Documents</h2>
        {documents.length === 0 ? (
          <p className="text-gray-600">No documents found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div key={doc._id} className="bg-white p-4 rounded-lg shadow-md">
                <h3
                  className="text-lg font-semibold text-blue-600 cursor-pointer hover:underline"
                  onClick={() => navigate(`/editor/${doc._id}`)}
                >
                  📄 {doc.title || "Untitled Document"}
                </h3>
                <p className="text-gray-600 text-sm">
                  <b>Last Updated:</b>{" "}
                  {new Date(doc.lastUpdated).toLocaleString()}
                </p>

                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() =>
                      setShowSharedUsersFor(
                        showSharedUsersFor === doc._id ? null : doc._id
                      )
                    }
                    className="text-gray-700 hover:text-gray-900 transition"
                  >
                    {showSharedUsersFor === doc._id
                      ? "🔽 Hide Shared Users"
                      : "👥 Show Shared Users"}
                  </button>

                  <button
                    onClick={() => handleDeleteDocument(doc._id)}
                    className="text-red-500 hover:text-red-700 transition"
                  >
                    🗑️ Delete
                  </button>
                </div>

                {showSharedUsersFor === doc._id && (
                  <div className="mt-3 text-gray-700">
                    <b>Shared with:</b>
                    <ul className="list-disc pl-5">
                      {sharedUsersMap[doc._id]?.length > 0 ? (
                        sharedUsersMap[doc._id].map((user, idx) => (
                          <li key={idx}>
                            {user.name} ({user.permission})
                          </li>
                        ))
                      ) : (
                        <li>No users shared yet</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
