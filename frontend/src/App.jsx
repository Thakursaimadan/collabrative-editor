import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./components/Home.jsx";
import Editor from "./components/Editor.jsx";
import Login from "./components/Login.jsx";
import SharedDocument from "./components/SharedDocument.jsx";
import Register from "./components/Register.jsx";

console.log("DEBUG ===>", { Home, Editor, Login, SharedDocument });
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/editor/:docId" element={<Editor />} />
        <Route path="/login" element={<Login/>}/>
        <Route path="/documents/shared/:linkId" element={<SharedDocument />} />
        <Route path="/register" element={<Register/>} />
      </Routes>
    </Router>
  );
}

export default App;