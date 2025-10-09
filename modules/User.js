const mongoose = require('mongoose');

// connect to local MongoDB or Atlas
mongoose.connect("mongodb://mongo:27017/eCommerce")
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.log("❌ MongoDB connection error:", err));

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

module.exports = User;