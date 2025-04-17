express = require('express')
app = express()
app.use(express.static("public/"))
bodyparser = require('body-parser')
app.use(bodyparser.json())
app.use(bodyparser.urlencoded({ extended: true }))
const fileUpload = require("express-fileupload");
app.use(fileUpload()); // Initialize express-fileupload

// Add CORS support
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:5173', // Your React app's URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add session middleware
const session = require('express-session');
app.use(session({
  secret: 'tannubhau', // Change this to a secure secret in production
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

const mongoose = require('mongoose');
const fs = require('fs');

mongoose.connect("mongodb://localhost:27017/tanmay", {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch(err => console.error('MongoDB connection error:', err));
const Product = require('./Schema/product.js')
const Category = require('./Schema/Category.js')
const Admin = require('./Schema/Admin.js')
const User = require('./Schema/User.js')
const Cart = require('./Schema/Cart');
const Order = require('./Schema/Order');
const Feedback = require('./Schema/Feedback');
// require("./db.js")

// const connectDB = require('./db');
// connectDB();

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.admin) {
    return res.redirect('/login');
  }
  next();
};

// Apply middleware to all routes except login and public APIs
app.use((req, res, next) => {
  if (req.path === '/login' || 
      req.path.startsWith('/public/') || 
      req.path === '/get_random_products' ||
      req.path === '/add-to-cart' ||
      req.path === '/get-cart' ||
      req.path.startsWith('/update-cart-quantity/') ||
      req.path.startsWith('/remove-from-cart/') ||
      req.path === '/create-order' ||
      req.path === '/get-orders') {
    next();
  } else {
    requireAuth(req, res, next);
  }
});

app.get("/", (req, res) => {
  res.render('index.ejs', { admin: req.session.admin })
})
app.get("/login", (req, res) => {
  if (req.session.admin) {
    return res.redirect('/dashboard');
  }
  res.render('login.ejs', { error: null })
})
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt for username:', username);
    
    // Find admin by username
    const admin = await Admin.findOne({ username });
    console.log('Found admin:', admin ? 'Yes' : 'No');
    
    if (!admin) {
      console.log('Admin not found');
      return res.render('login.ejs', { error: 'Invalid username or password' });
    }
    
    // In production, you should hash the password and compare
    if (admin.password !== password) {
      console.log('Password mismatch');
      return res.render('login.ejs', { error: 'Invalid username or password' });
    }
    
    // Set session
    req.session.admin = {
      id: admin._id,
      username: admin.username,
      name: admin.name
    };
    
    console.log('Login successful, redirecting to dashboard');
    res.redirect('/dashboard');
  } catch (error) {
    console.error("Login error:", error);
    res.render('login.ejs', { error: 'An error occurred during login' });
  }
});

// Add registration endpoint
app.post("/register", async (req, res) => {
  try {
    console.log("Registration request received:", req.body);
    const { fullName, username, email, phone, city, password } = req.body;

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log("Username already exists:", username);
      return res.status(400).json({ 
        success: false, 
        message: "Username already exists" 
      });
    }

    // Create new user
    const newUser = new User({
      fullName,
      username,
      email,
      phone,
      city,
      password
    });

    console.log("Attempting to save new user:", newUser);
    await newUser.save();
    console.log("User saved successfully");
    
    res.json({ 
      success: true, 
      message: "Registration successful",
      user: {
        id: newUser._id,
        username: newUser.username,
        fullName: newUser.fullName
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error registering user",
      error: error.message 
    });
  }
});

// Update dashboard route to check for admin session
app.get('/dashboard', (req, res) => {
  res.render('dashboard.ejs', { admin: req.session.admin });
});

// Update logout route
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Protected routes
app.get('/categories', requireAuth, async (req, res) => {
  try {
    const cats = await Category.find();
    res.render("category.ejs", { 
      categories: cats,
      admin: req.session.admin
    });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).send("Error fetching categories");
  }
});
app.post('/categories', requireAuth, (req, res) => {
  if (!req.body.cname) {
    console.log("Category name is required");
    res.send("<script>alert('Category name is required');</script>");
    // return res.status(400).send("Category name is required");
    return res.redirect("/categories");
  }
  const cat = new Category({
    "catname": req.body.cname
  })
  cat.save().then(e => {
    console.log("Category Saved Successfully...");
  })
  res.redirect("/categories")
})
app.get('/add_product', requireAuth, async (req, res) => {
  res.render("add_product.ejs", { 
    categories: await Category.find(), 
    products: await Product.find(),
    admin: req.session.admin
  });
})
app.post("/save_product", requireAuth, (req, res) => {
  const { pname, pprice, pcat } = req.body;
  
  if (!req.files || !req.files.pimage) {
    return res.status(400).send("No image file uploaded");
  }

  const file = req.files.pimage;
  const uploadPath = __dirname + '/public/uploads/' + file.name;

  // Create uploads directory if it doesn't exist
  if (!fs.existsSync(__dirname + '/public/uploads')) {
    fs.mkdirSync(__dirname + '/public/uploads', { recursive: true });
  }

  // Move the file to the uploads directory
  file.mv(uploadPath, (err) => {
    if (err) {
      console.error("Error saving file:", err);
      return res.status(500).send("Error saving file");
    }

    const prod = new Product({
      pname: pname,
      pprice: pprice,
      pcat: pcat,
      pimage: file.name,
      createdAt: new Date()
    });

    prod.save()
      .then(() => {
        console.log("Product saved successfully");
        return res.redirect("/add_product");
      })
      .catch((err) => {
        console.error("Error saving product:", err);
        res.status(500).send("Error saving product");
      });
  });
});

// Add delete product endpoint
app.post("/delete_product", requireAuth, async (req, res) => {
  try {
    const { productId } = req.body;
    
    // Find the product to get the image filename
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Delete the image file if it exists
    const imagePath = __dirname + '/public/uploads/' + product.pimage;
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Delete the product from database
    await Product.findByIdAndDelete(productId);
    
    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ success: false, message: "Error deleting product" });
  }
});

app.get("/category", async (req, res) => {
  const cat = new Category({ "catname": "Sitting", "catid": 1 })
  const saved = await cat.save();
  console.log('data saved successfully', saved);

})

// API HERE
app.get("/get_products", requireAuth, async (req, res) => {
  try {
    const products = await Product.aggregate([
      {
        $lookup: {
          from: "categories", // Ensure this matches the actual collection name in MongoDB (e.g., 'categories' or 'Categories')
          localField: "pcat", // Ensure this matches the field in the Product schema
          foreignField: "catid", // Ensure this matches the field in the Category schema
          as: "category"
        }
      },
      {
        $unwind: "$category" // Optional: flattens the array
      }
    ]);
    res.json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).send("Error fetching products");
  }
})
app.get("/get_categories", requireAuth, async (req, res) => {
  const cats = await Category.find();
  res.json(cats);
})

// Get random products or all products
app.get("/get_random_products", async (req, res) => {
  try {
    const count = parseInt(req.query.count);
    
    // If count parameter is provided and valid, return random products
    if (count && count > 0) {
      // First, get total count of products
      const totalProducts = await Product.countDocuments();
      
      if (totalProducts === 0) {
        return res.json({ message: "No products found in database", products: [] });
      }

      // If we have less than requested products, get all products
      const sampleSize = Math.min(count, totalProducts);

      const products = await Product.aggregate([
        { $sample: { size: sampleSize } },
        {
          $lookup: {
            from: "categories",
            localField: "pcat",
            foreignField: "catid",
            as: "category"
          }
        },
        {
          $unwind: {
            path: "$category",
            preserveNullAndEmptyArrays: true
          }
        }
      ]);

      return res.json(products);
    }
    
    // If no count parameter or invalid, return all products
    const products = await Product.aggregate([
      {
        $lookup: {
          from: "categories",
          localField: "pcat",
          foreignField: "catid",
          as: "category"
        }
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true
        }
      }
    ]);

    res.json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ 
      error: "Error fetching products",
      details: err.message 
    });
  }
});

// Update profile route
app.post('/update-profile', requireAuth, async (req, res) => {
  try {
    const { name, email } = req.body;
    const adminId = req.session.admin.id;

    // Update admin profile in database
    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      { name, email },
      { new: true }
    );

    if (!updatedAdmin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    // Update session data
    req.session.admin = {
      ...req.session.admin,
      name: updatedAdmin.name,
      email: updatedAdmin.email
    };

    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      admin: {
        name: updatedAdmin.name,
        email: updatedAdmin.email,
        username: updatedAdmin.username
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: 'Error updating profile' });
  }
});

// Check username availability
app.get("/check-username", async (req, res) => {
  try {
    const { username } = req.query;
    console.log("Checking username availability for:", username);
    
    if (!username) {
      console.log("No username provided");
      return res.status(400).json({ 
        success: false, 
        message: "Username is required" 
      });
    }

    console.log("Querying database for username:", username);
    const existingUser = await User.findOne({ username });
    console.log("Database query result:", existingUser ? "Username exists" : "Username available");
    
    res.json({ 
      success: true, 
      available: !existingUser 
    });
  } catch (error) {
    console.error("Username check error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error checking username",
      error: error.message 
    });
  }
});

// Add response headers middleware
app.use((req, res, next) => {
  res.header('Content-Type', 'application/json');
  next();
});

// Add CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Add to cart endpoint
app.post('/add-to-cart', async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Create new cart item
    const cartItem = new Cart({
      product: productId,
      quantity: quantity || 1
    });

    await cartItem.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Product added to cart successfully',
      cartItem
    });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error adding to cart',
      error: error.message 
    });
  }
});

// Get user's cart
app.get("/get-cart/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const cartItems = await Cart.find({ user: userId })
      .populate('product')
      .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      cartItems 
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching cart",
      error: error.message 
    });
  }
});

// Get cart items
app.get('/get-cart', async (req, res) => {
  try {
    console.log('Fetching cart items from database...');
    const cartItems = await Cart.find().populate({
      path: 'product',
      model: 'Product'
    });
    
    console.log('Found cart items:', cartItems);
    
    const formattedCartItems = cartItems.map(item => ({
      _id: item.product._id,
      pname: item.product.pname,
      pprice: item.product.pprice,
      pimage: item.product.pimage,
      quantity: item.quantity
    }));
    
    console.log('Formatted cart items:', formattedCartItems);
    
    res.json({ 
      success: true, 
      cartItems: formattedCartItems
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching cart',
      error: error.message 
    });
  }
});

// Remove from cart
app.delete('/remove-from-cart/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    console.log('Removing cart item for product ID:', productId);
    
    const result = await Cart.findOneAndDelete({ product: productId });
    console.log('Delete result:', result);
    
    if (!result) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cart item not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Item removed from cart successfully' 
    });
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error removing from cart',
      error: error.message 
    });
  }
});

// Update cart quantity
app.put('/update-cart-quantity/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    
    console.log('Updating quantity for product:', productId, 'to:', quantity);
    
    // Find the cart item by product ID
    const cartItem = await Cart.findOne({ product: productId });
    if (!cartItem) {
      console.log('Cart item not found for product:', productId);
      return res.status(404).json({ 
        success: false, 
        message: 'Cart item not found' 
      });
    }

    // Update the quantity
    cartItem.quantity = quantity;
    await cartItem.save();
    
    console.log('Quantity updated successfully:', cartItem);

    // Get the updated cart item with populated product details
    const updatedCartItem = await Cart.findById(cartItem._id).populate('product');
    
    res.json({ 
      success: true, 
      message: 'Quantity updated successfully',
      cartItem: {
        _id: updatedCartItem.product._id,
        pname: updatedCartItem.product.pname,
        pprice: updatedCartItem.product.pprice,
        pimage: updatedCartItem.product.pimage,
        quantity: updatedCartItem.quantity
      }
    });
  } catch (error) {
    console.error('Error updating quantity:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating quantity',
      error: error.message 
    });
  }
});

// Create order endpoint
app.post('/create-order', async (req, res) => {
  try {
    console.log('Creating order with data:', req.body);
    
    const order = new Order(req.body);
    await order.save();
    
    // Clear the cart after successful order
    await Cart.deleteMany({});
    
    res.json({ 
      success: true, 
      message: 'Order created successfully',
      orderId: order._id
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating order',
      error: error.message 
    });
  }
});

// Get user's orders
app.get('/get-orders', async (req, res) => {
  try {
    console.log('Fetching orders...');
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('items.productId', 'pname pprice pimage');
    
    console.log('Found orders:', orders);
    
    const formattedOrders = orders.map(order => ({
      _id: order._id,
      createdAt: order.createdAt,
      items: order.items.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        product: item.productId ? {
          _id: item.productId._id,
          name: item.productId.pname,
          price: item.productId.pprice,
          image: item.productId.pimage
        } : null
      })),
      totalAmount: order.totalAmount,
      status: order.status
    }));
    
    console.log('Formatted orders:', formattedOrders);
    
    res.json({ 
      success: true, 
      orders: formattedOrders 
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching orders',
      error: error.message 
    });
  }
});

// Submit feedback endpoint
app.post('/submit-feedback', async (req, res) => {
    try {
        console.log('Received feedback request body:', req.body);
        
        const feedback = new Feedback(req.body);
        console.log('Created feedback document:', feedback);
        
        const savedFeedback = await feedback.save();
        console.log('Saved feedback to database:', savedFeedback);
        
        res.setHeader('Content-Type', 'application/json');
        res.json({ message: 'Feedback submitted successfully' });
    } catch (error) {
        console.error('Error saving feedback:', error);
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
});

app.listen(5000, () => console.log("Running on PORT : 5000"));