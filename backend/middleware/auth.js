import jwt from "jsonwebtoken";



export const authenticateJWTToken = (req, res, next) => {


  const authorizationHeader = req.headers["authorization"];
  

  let token2;
  if(authorizationHeader){
    token2 = authorizationHeader.split(" ")[1];
  }
  


  if (!token2) {


    return res.status(401).json({ error: "Access token required" });
  }



  jwt.verify(token2, process.env.JWT_SECRET, (err, user) => {
    
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    
    } else{
    
    
      req.user = user;

     
      next();
    }
    
  });
};
