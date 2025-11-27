import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../config/database.js";

const router = express.Router();


router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

 
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }


    const [users] = await db.execute(
      "SELECT id, username, password FROM users WHERE username = ?",
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = users[0];


    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }


    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});



router.get("/verify", async (req, res) => {
  const authorizationHeader = req.headers["authorization"];
  

  let token2;
  if(authorizationHeader){

    token2 = authorizationHeader.split(" ")[1];
  }

  if (!token2) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {

    const decoded = jwt.verify(token2, process.env.JWT_SECRET);
    res.json({ valid: true, user: decoded });

  } catch (error) {
    res.status(403).json({ valid: false, error: "Invalid token" });
  }
});

export default router;



