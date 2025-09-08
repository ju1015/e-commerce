const express=require('express');
const app=express();
const cookieParser = require('cookie-parser');
const userModel = require("./modules/User");
const productModel=require('./modules/Product');
const jsonwebtoken=require("jsonwebtoken");
const bcrypt=require('bcrypt');
const path=require('path');
const fs = require('fs');
const multer = require("multer");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/"); // folder to save uploaded images
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

app.set('view engine','ejs');
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

function verifyToken(req,res,next){
    const token=req.cookies.token;
    if(!token) return res.redirect('/login');

    try{
        const decoded=jsonwebtoken.verify(token,'shhhh');
        req.user=decoded;
        next();
    }catch(err){
        return res.status(401).send('Invalid or Expired token');
    }
}


app.get('/',(req,res)=>{
    res.render('Home');
})

app.get('/login',(req,res)=>{
    res.render('Login');
})

app.get('/register',(req,res)=>{
    res.render('Register');
})

app.post('/registerForm',async (req,res)=>{
    const {username,email,password}=req.body;
    var user=await userModel.findOne({username});
    var mail=await userModel.findOne({email});
    if(user) return res.send('username already exists');
    if(mail) return res.send('E-mail already exists');

    const salt=await bcrypt.genSalt(10);
    const hashedPass=await bcrypt.hash(password,salt);

    var user=await userModel.create({
        username,
        email,
        password:hashedPass
    });

    const token=jsonwebtoken.sign({id:user._id,username:user.username},'shhhh');
    
    res.cookie('token', token, {
        httpOnly: true,   // not accessible via JS
        secure: false,    // set true in production (HTTPS only)
        maxAge: 1000 * 60 * 60 * 24  // 1 day
    });


    res.redirect('/profile');
})



app.post('/loginForm',async (req,res)=>{
    const {username,password}=req.body;
    let user=await userModel.findOne({username});
    if(!user) return res.send('User not found!');
    
    const isMatch=await bcrypt.compare(password,user.password);
    if(!isMatch) return res.send('something went wrong');

    const token=jsonwebtoken.sign({id:user._id,username:user.username},'shhhh');
    
    res.cookie('token', token, {
        httpOnly: true,   // not accessible via JS
        secure: false,    // set true in production (HTTPS only)
        maxAge: 1000 * 60 * 60 * 24  // 1 day
    });


    res.redirect('/profile');
})


app.get('/profile',verifyToken,async (req,res)=>{
    try {
        // Fetch ALL products from the productModel collection
        const products = await productModel.find({});
        // Render the sellProducts page and pass the products
        res.render('FrontPage',{user: req.user,products})
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
})

app.get('/sellProducts',verifyToken,async (req,res)=>{
    try {
        // Find all products where owner matches current user's id
        const products = await productModel.find({ owner: req.user.id });
        // Render the sellProducts page and pass the products
        res.render('sellProducts', { products, user: req.user });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
})

app.post('/addProduct',verifyToken,upload.single('image'), async (req, res) => {
    try {
        let imagePath;
        if (req.file) {
            imagePath = req.file.filename; // or req.file.path depending on multer config
        } else if (req.body.existingImage) {
            imagePath = req.body.existingImage.split('/').pop();// keep the old image
        } else {
            throw new Error('Image is required');
        }

        const productData = {
            name: req.body.name,
            description: req.body.description,
            price: req.body.price,
            image: imagePath,
            owner: req.user.id  // ✅ include the owner here
        };

        if (req.body.productId) {
            // update existing product
            await productModel.findByIdAndUpdate(req.body.productId, productData);
        } else {
            // create new product
            await productModel.create(productData);
        }

        res.redirect('/sellProducts');
    } catch (err) {
        console.error(err);
        res.status(400).send(err);
    }
});

app.delete('/deleteProduct/:id', verifyToken, async (req, res) => {
    try {
        const productId = req.params.id;

        // Ensure that only the owner can delete their product
        const product = await productModel.findOne({ _id: productId, owner: req.user.id });
        if (!product) return res.json({ success: false, message: "Product not found or not authorized" });

        // Delete the image file from uploads folder
        const imagePath = path.join(__dirname, 'uploads', product.image);
        fs.unlink(imagePath, (err) => {
            if (err) {
                console.error("Failed to delete image:", err);
            } else {
                console.log("Image deleted successfully");
            }
        });

        // Delete the product document from MongoDB
        await productModel.findByIdAndDelete(productId);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: "Something went wrong" });
    }
});

app.post('/logout',verifyToken,(req,res)=>{
  res.clearCookie('token');
  res.redirect('/login'); 
})

app.post('/shopNow', verifyToken, async (req, res) => {
  try {
    const products = await productModel.find();
    res.render('shopNow', { user: req.user, products });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.get('/product/:id', async (req, res) => {
  try {
    const product = await productModel.findById(req.params.id);
    if (!product) {
      return res.status(404).send("Product not found");
    }
    res.render("productDetails", { product });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});



app.listen(3000);