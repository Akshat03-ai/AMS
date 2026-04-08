const { admin, db } = require("../firebase");

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);

    const userSnap = await db
      .collection("Users")
      .doc(decodedToken.uid)
      .get();

    if (!userSnap.exists) {
      return res.status(403).json({ message: "User not registered in system" });
    }

    const userData = userSnap.data();

    req.user = {
      uid: decodedToken.uid,

      // Identity
      email: userData.email || decodedToken.email,
      user_id: userData.user_id,
      name: userData.name,
      contact: userData.contact,

      // Role & hierarchy
      role: userData.role,
      designation: userData.designation,
      department_id: userData.department_id,
      office_id: userData.office_id,
      room_id: userData.room_id,

      //profile photo
      photoURL: userData.photoURL || null,
    };

    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ message: "Token expired or invalid" });
  }
}

module.exports = authenticate;