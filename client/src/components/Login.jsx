import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Login = () => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get("http://localhost:8000/me", {
          withCredentials: true, // send cookies
        });
        console.log("User already logged in:", res.data);
        navigate("/"); // 🔥 already logged in, redirect to home
      } catch (err) {
        console.log("Not logged in yet.");
        // Do nothing, stay on login page
      }
    };

    checkAuth();
  }, [navigate]);

  const handleLogin = async () => {
    if (!name || !password) {
      alert("Please enter name and password.");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:8000/login",
        { name, password },
        { withCredentials: true } // sends cookies
      );
      console.log("Login response:", response.data);
      alert("Login successful!");
      navigate("/");
    } catch (error) {
      console.error("Login error:", error);
      alert(error.response?.data?.message || "Login failed");
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <input
        type="text"
        placeholder="Enter your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="password"
        placeholder="Enter your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
};

export default Login;
