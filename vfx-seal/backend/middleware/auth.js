const jwt = require("jsonwebtoken");
const { User } = require("../models");

// Verify JWT token and attach user to request
const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({ message: "Not authorized — no token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id, {
            attributes: { exclude: ["passwordHash"] },
        });

        if (!user) {
            return res.status(401).json({ message: "Not authorized — user not found" });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Not authorized — invalid token" });
    }
};

// Require APPROVED status
const requireApproved = (req, res, next) => {
    if (req.user.role === 'ADMIN') return next(); // Admins always pass
    if (req.user.status !== 'APPROVED') {
        return res.status(403).json({ message: 'Account pending approval' });
    }
    next();
};

// Require ADMIN role
const requireAdmin = (req, res, next) => {
    if (req.user.role !== "ADMIN") {
        return res.status(403).json({ message: "Admin access required" });
    }
    next();
};

module.exports = { protect, requireApproved, requireAdmin };
