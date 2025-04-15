express = require('express')
app = express()
app.use(express.static("public/"))
bodyparser = require('body-parser')
app.use(bodyparser.urlencoded({ extended: true }))
const fileUpload = require("express-fileupload");
app.use(fileUpload()); // Initialize express-fileupload

const mongoose = require('mongoose');

mongoose.connect("mongodb://localhost:27017/tanmay", {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log(' Connected to MongoDB successfully'))
  .catch(err => console.error(' MongoDB connection error:', err));
const Product = require('./Schema/product.js')
const Category = require('./Schema/Category.js')
// require("./db.js")

// const connectDB = require('./db');
// connectDB();

app.get("/", (req, res) => {
  res.render('index.ejs')
})
app.get('/categories', async (req, res) => {
  try {
    const cats = await Category.find(); // Fetch all categories from the database
    res.render("category.ejs", { "categories": cats }); // Pass categories to the template
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).send("Error fetching categories");
  }
});
app.post('/categories', (req, res) => {
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
app.get('/add_product', async (req, res) => {
  // connectDB.db('furniture').findOne({});

  res.render("add_product.ejs", { "categories": await Category.find(), "products": await Product.find() });
})
app.post("/save_product", (req, res) => {
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
app.get("/get_products", async (req, res) => {
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
app.get("/get_categories", async (req, res) => {
  const cats = await Category.find();
  res.json(cats);
})


app.listen(1000, () => console.log("Running on PORT : 1000"))