    var express = require("express"), 
    app = express(),
    bodyParser = require("body-parser"),	   
    mongoose    = require("mongoose"),
    passport    = require("passport"),
    LocalStrategy = require("passport-local"),
	 cookieParser = require("cookie-parser"),	
    flash        = require("connect-flash"),
    Campground  = require("./models/campground"),
    Comment     = require("./models/comment"),
    User        = require("./models/user"),
    session = require("express-session"),
    methodOverride = require("method-override");
// configure dotenv

// assign mongoose promise library and connect to database
mongoose.Promise = global.Promise;

const databaseUri = process.env.MONGODB_URI || "mongodb+srv://malikwaqasarif:rockstarmalik@cluster0.tx2lq.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";

mongoose.connect(databaseUri, { useUnifiedTopology: true }
				 ,{ useNewUrlParser: true })
      .then(() => console.log(`Database connected`))
      .catch(err => console.log(`Database connection error: ${err.message}`));

app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride('_method'));
app.use(cookieParser('secret'));
//require mome //seed the database

// PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: "Once again Rusty wins cutest dog!",
    resave: false,
    saveUninitialized: false
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
   res.locals.currentUser = req.user;
   res.locals.success = req.flash('success');
   res.locals.error = req.flash('error');
   next();
});

app.get("/", function(req, res){
	res.render("landing")
});

app.get("/campgrounds", function(req, res){
	Campground.find({}, function(err, allCampgrounds){
         if(err){
             console.log(err);
         } else {
             res.render("campgrounds/index",{campgrounds: allCampgrounds});
       }
         
      });
});
app.post("/campgrounds", isLoggedIn, function(req, res){
  // get data from form and add to campgrounds array
  var name = req.body.name;
  var image = req.body.image;
  var desc = req.body.description;
  var author = {
      id: req.user._id,
      username: req.user.username
  }
    var newCampground = {name: name, image: image, description: desc,  author:author};
    // Create a new campground and save to DB
    Campground.create(newCampground, function(err, newlyCreated){
        if(err){
            console.log(err);
        } else {
            //redirect back to campgrounds page
            console.log(newlyCreated);
            res.redirect("/campgrounds");
        }
    });
  });


app.get("/campgrounds/new", isLoggedIn, function(req, res){
   res.render("campgrounds/new"); 
});

app.get("/campgrounds/:id", function(req, res){
    //find the campground with provided ID
    Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground){
        if(err || !foundCampground){
            console.log(err);
            req.flash('error', 'Sorry, that campground does not exist!');
            return res.redirect('/campgrounds');
        }
        console.log(foundCampground)
        //render show template with that campground
        res.render("campgrounds/show", {campground: foundCampground});
    });
});


  //render edit template with that campground
app.get("/campgrounds/:id/edit",isLoggedIn, checkUserCampground, function(req, res) {
    Campground.findById(req.params.id, function(err, foundCampground){
        if (err){
            req.flash("error", "Campground not found")
            res.redirect("back");
        } else {
            res.render("campgrounds/edit", {campground: foundCampground});    
        }
        
    });
});


// PUT - updates campground in the database
app.put("/campgrounds/:id", isLoggedIn,checkUserCampground, function(req, res){
    Campground.findByIdAndUpdate(req.params.id, function(err, campground){
        if(err){
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            req.flash("success","Successfully Updated!");
            res.redirect("/campgrounds/" + campground._id);
        }
    });
  });
app.delete("/campgrounds/:id", isLoggedIn, checkUserCampground, function(req, res) {
Campground.findByIdAndRemove(req.params.id, function(err){
	if(err) {
        req.flash('error', err.message);
		return res.redirect('/');
        } else {
        req.flash('error', 'Campground deleted!');
	   res.redirect('/campgrounds');
      } 
})
});

app.get("/campgrounds/:id/comments/new", isLoggedIn, function(req, res){
    // find campground by id
    Campground.findById(req.params.id, function(err, campground){
        if(err){
            console.log(err);
        } else {
             res.render("comments/new", {campground: campground});
        }
    })
});

//Comments Create
app.post("/campgrounds/:id/comments", isLoggedIn, function(req, res){
   //lookup campground using ID
   Campground.findById(req.params.id, function(err, campground){
       if(err){
           console.log(err);
           res.redirect("/campgrounds");
       } else {
        Comment.create(req.body.comment, function(err, comment){
           if(err){
               console.log(err);
           } else {
               //add username and id to comment
               comment.author.id = req.user._id;
               comment.author.username = req.user.username;
               //save comment
               comment.save();
               campground.comments.push(comment);
               campground.save();
               console.log(comment);
               req.flash('success', 'Created a comment!');
               res.redirect('/campgrounds/' + campground._id);
           }
        });
       }
   });
});

app.get("/campgrounds/:id/comments/:comment_id/edit", isLoggedIn, checkUserComment, function(req, res){
   res.send()    
});



app.put("/campgrounds/:id/comments/:commentId", isLoggedIn, function(req, res){
   Comment.findByIdAndUpdate(req.params.commentId, req.body.comment, function(err, comment){
       if(err){
          console.log(err);
           res.render("edit");
       } else {
           res.redirect("/campgrounds/" + req.params.id);
       }
   }); 
});

app.delete("/campgrounds/:id/comments/:commentId", isLoggedIn, checkUserComment, function(req, res){
  // find campground, remove comment from comments array, delete comment in db
  Campground.findByIdAndUpdate(req.params.id, {
    $pull: {
      comments: req.comment.id
    }
  }, function(err) {
    if(err){ 
        console.log(err)
        req.flash('error', err.message);
        res.redirect('/');
    } else {
        req.comment.remove(function(err) {
          if(err) {
            req.flash('error', err.message);
            return res.redirect('/');
          }
          req.flash('error', 'Comment deleted!');
          res.redirect("/campgrounds/" + req.params.id);
        });
    }
  });
});

app.get("/register", function(req, res){
	res.render("register")
})
app.post("/register", function(req, res){
	var newuser = new User({username: req.body.username})
	User.register(newUser, req.body.password, function(err, user){
       if (err){
           req.flash("error", err.message);
           return res.redirect("register");
       }
       passport.authenticate("local")(req, res, function(){
            req.flash("success", "Welcome to YelpCamp " + user.username);
            res.redirect("/campgrounds") ;
       });
   });
});
app.get("/login", function(req, res) {
    res.render("login");
});

app.post("/login", passport.authenticate("local", {
        successRedirect: "/campgrounds",
        failureRedirect: "/login",
        failureFlash: true
    }), function(req, res) {
});
app.get("/logout", function(req, res) {
    req.flash("success", "Come back soon " + req.user.username + "!")
    req.logout();
    res.redirect("/campgrounds");
});



  function isLoggedIn(req, res, next){
      if(req.isAuthenticated()){
          return next();
      }
      req.flash('error', 'You must be signed in to do that!');
      res.redirect('/login');
  }
   function checkUserCampground(req, res, next){
    Campground.findById(req.params.id, function(err, foundCampground){
      if(err){
          console.log(err);
          req.flash('error', 'Sorry, that campground does not exist!');
          res.redirect('/campgrounds');
      } else if(foundCampground.author.id.equals(req.user._id)){
          next();
      } else {
          req.flash('error', 'You don\'t have permission to do that!');
          res.redirect('/campgrounds/' + req.params.id);
      }
    });
  }

   function checkUserComment(req, res, next){
    Comment.findById(req.params.commentId, function(err, foundComment){
       if(err){
           console.log(err);
           req.flash('error', 'Sorry, that comment does not exist!');
           res.redirect('/campgrounds');
       } else if(foundComment.author.id.equals(req.user._id)){
            next();
       } else {
           req.flash('error', 'You don\'t have permission to do that!');
           res.redirect('/campgrounds/' + req.params.id);
       }
    });
   }
app.listen("5000", function(req, res){
	console.log("server started now")
})