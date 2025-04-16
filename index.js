express = require('express')
app = express()
app.use(express.static("public/"))
bodyparser = require('body-parser')
app.use(bodyparser.urlencoded({ extended: true }))
const fileUpload = require("express-fileupload");
app.use(fileUpload()); // Initialize express-fileupload

// Add session middleware
const session = require('express-session');
app.use(session({
  secret: 'tannubhau', // Change this to a secure secret in production
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

const mongoose = require('mongoose');

mongoose.connect("mongodb://localhost:27017/tanmay", {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log(' Connected to MongoDB successfully'))
  .catch(err => console.error(' MongoDB connection error:', err));
const Product = require('./Schema/product.js')
const Category = require('./Schema/Category.js')
const Admin = require('./Schema/Admin.js')
const User = require('./Schema/User.js')
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

// Apply middleware to all routes except login
app.use((req, res, next) => {
  if (req.path === '/login' || req.path.startsWith('/public/')) {
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
    
    // Find admin by username
    const admin = await Admin.findOne({ username });
    
    if (!admin) {
      return res.render('login.ejs', { 
        error: 'Invalid username or password' 
      });
    }
    
    // In production, you should hash the password and compare
    if (admin.password !== password) {
      return res.render('login.ejs', { 
        error: 'Invalid username or password' 
      });
    }
    
    // Set admin session
    req.session.admin = {
      id: admin._id,
      username: admin.username,
      name: admin.name,
      email: admin.email
    };
    
    // Redirect to dashboard
    res.redirect('/dashboard');
  } catch (error) {
    console.error("Login error:", error);
    res.render('login.ejs', { 
      error: 'An error occurred during login' 
    });
  }
});
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "Username already exists" 
      });
    }

    // Create new user
    const newUser = new User({
      username,
      password // Note: In production, you should hash the password before saving
    });

    // Save the user
    await newUser.save();
    
    // Set user session
    req.session.user = {
      id: newUser._id,
      username: newUser.username
    };
    
    // Redirect to dashboard
    res.redirect('/dashboard');
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error registering user" 
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
  // res.send(req.body);return;
  const { pname, pprice, pcat } = req.body;
  const prod = new Product({
    pname: pname,
    pprice: pprice,
    pcat: pcat,
    pimage: req.files.pimage.name, // Assuming you're using multer for file upload
    createdAt: new Date()
  });
  prod.save()
    .then(() => {
      console.log("Product saved successfully");
      // res.send("Product saved successfully");
      return res.redirect("/add_product");
    })
    .catch((err) => {
      console.error("Error saving product:", err);
      res.status(500).send("Error saving product");
    });
  const file = req.files.pimage; // Access the uploaded file
  console.log(file); // Log form data
  console.log(req.files); // Log uploaded file (if using multer)
})
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

app.listen(5000, () => console.log("Running on PORT : 5000"))