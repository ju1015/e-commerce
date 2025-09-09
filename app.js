const express=require('express');
const app=express();
const cookieParser = require('cookie-parser');
const userModel = require("./modules/User");
const productModel=require('./modules/Product');
const cartModel=require('./modules/Cart');
const jsonwebtoken=require("jsonwebtoken");
const bcrypt=require('bcrypt');
const path=require('path');
const fs = require('fs');
const multer = require("multer");
const mongoose = require('mongoose');


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
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
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
        const cart = await cartModel.findOne({ userId: req.user.id }).populate("items.productId") || { items: [] };
        // Render the sellProducts page and pass the products
        res.render('FrontPage',{user: req.user,products ,cart})
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

app.get('/product/:id', verifyToken,async (req, res) => {
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


app.post('/cart/update', verifyToken, async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    let cart = await cartModel.findOne({ userId: req.user.id }).populate("items.productId");
    if (!cart) return res.status(404).send("Cart not found");

    const itemIndex = cart.items.findIndex(item => item.productId._id.equals(productId));
    if (itemIndex === -1) return res.status(404).send("Product not in cart");

    cart.items[itemIndex].quantity = Number(quantity);

    cart.totalPrice = cart.items.reduce((sum, item) => sum + (item.productId.price * item.quantity), 0);

    await cart.save();
    await cart.populate("items.productId");

    res.redirect("/cart");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


app.post('/cart/remove', verifyToken, async (req, res) => {
  try {
    const { productId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).send("Invalid product ID");
    }

    let cart = await cartModel.findOne({ userId: req.user.id }).populate("items.productId");
    if (!cart) return res.status(404).send("Cart not found");

    // Filter out the product to remove
    cart.items = cart.items.filter(item => !item.productId._id.equals(productId));

    // Recalculate total price
    cart.totalPrice = cart.items.reduce((sum, item) => {
      const price = item.productId?.price || 0;
      const quantity = item.quantity || 1;
      return sum + price * quantity;
    }, 0);

    await cart.save();
    res.redirect("/cart");
  } catch (err) {
    console.error("REMOVE FROM CART ERROR:", err);
    res.status(500).send("Server error");
  }
});

app.post('/cart/:id', verifyToken, async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await productModel.findById(productId);
    if (!product) return res.status(404).send("Product not found");

    let cart = await cartModel.findOne({ userId: req.user.id });
    if (!cart) {
      cart = new cartModel({ userId: req.user.id, items: [], totalPrice: 0 });
    }

    // check if product already in cart
    const itemIndex = cart.items.findIndex(item => item.productId.equals(productId));
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += 1;
    } else {
      cart.items.push({ productId, quantity: 1 });
    }

    // populate items before calculating total
    await cart.populate("items.productId");

    // calculate total price safely
    cart.totalPrice = cart.items.reduce((sum, item) => {
      const price = item.productId?.price || 0;
      const quantity = item.quantity || 1;
      return sum + price * quantity;
    }, 0);

    await cart.save();

    res.render("cart", { cart });
  } catch (err) {
    console.error("ADD TO CART ERROR:", err);
    res.status(500).send("Server error");
  }
});

app.get('/cart', verifyToken, async (req, res) => {
  try {
    let cart = await cartModel.findOne({ userId: req.user.id }).populate("items.productId");

    if (!cart) {
      cart = { items: [], totalPrice: 0 }; // empty cart
    }

    res.render("cart", { cart });
  } catch (err) {
    console.error("GET CART ERROR:", err);
    res.status(500).send("Server error");
  }
});

app.post('/checkout', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id; // from JWT
    const cart = await cartModel.findOne({ userId }).populate('items.productId');

    if (!cart || cart.items.length === 0) {
      return res.send("Your cart is empty!");
    }

    res.render('checkout', { cartItems: cart.items });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});


app.post('/placeorder', verifyToken, async (req, res) => {
  try {
    const { address, phone } = req.body;
    const userId = req.user.id;

    const cart = await cartModel.findOne({ userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) return res.send("Cart is empty!");

    // Here you can save order details to database if needed
    const orderData = {
      userId,
      items: cart.items,
      totalPrice: cart.totalPrice,
      address,
      phone,
      status: 'pending'
    };
    // Example: Save orderModel.create(orderData) if you have Order schema

    // Redirect to payment page with total price
    res.render('Payment', { totalAmount: cart.totalPrice });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.post('/process-payment', verifyToken, (req, res) => {
  const { cardNumber, cardName, expiry, cvv } = req.body;

  // Here you would normally integrate a real payment gateway
  console.log("Payment details:", cardNumber, cardName, expiry, cvv);

  // For demo, we'll assume payment is successful
  res.send(`
    <h2>Payment Successful!</h2>
    <p>Thank you for your order. Your transaction has been completed.</p>
    <form action="/profile" method="GET">
      <button type="submit">Back to Home</button>
    </form>
  `);
});





app.listen(3000);