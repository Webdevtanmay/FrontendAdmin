express=require('express')
app=express()
app.use(express.static("public/"))
bodyparser=require('body-parser')
app.use(bodyparser.urlencoded({extended:true}))
const fileUpload = require("express-fileupload");
app.use(fileUpload()); // Initialize express-fileupload

const mongoose = require('mongoose');

mongoose.connect("mongodb+srv://prathamesh0755:prathamesh0755@cluster0.p8qvf.mongodb.net/tanmay491", {
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

app.get("/",(req,res)=>{
    res.render('index.ejs')
})
app.get('/add_product',(req,res)=>{
  // connectDB.db('furniture').findOne({});
    res.render("add_product.ejs")
})
app.post("/save_product", (req, res) => {
  const { pname,pprice,pcat } = req.body;
  const prod=new Product({
    pname: pname,
    pprice: pprice,
    pcat: pcat,
    pimage: req.files.pimage.name, // Assuming you're using multer for file upload
    createdAt: new Date()
  });
  prod.save()
    .then(() => {
      console.log("Product saved successfully");
      res.send("Product saved successfully");
    })
    .catch((err) => {
      console.error("Error saving product:", err);
      res.status(500).send("Error saving product");
    }); 
const file = req.files.pimage; // Access the uploaded file
  console.log(file); // Log form data
  console.log(req.files); // Log uploaded file (if using multer)
})
app.get("/category",async (req,res)=>{
    const cat=new Category({"catname":"Sitting","catid":1} )
    const saved=await cat.save();
    console.log('data saved successfully',saved);
    
})

app.listen(1000,()=>console.log("Running on PORT : 1000"))