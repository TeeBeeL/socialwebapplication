var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var User =require('../models/user');
//var ud = require('../usersdata.json');
var mongo = require('mongodb');
var db1 = require('monk')('127.0.0.1/userlogin1');
var multer = require('multer');
//var upload = multer({dest : './public/images/uploads'});
var path = require('path');
var storage = multer.diskStorage({
	destination: function (req, file, cb) {
    cb(null, './public/images/uploads')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)) //Appending extension
  }
});
var upload = multer({ storage: storage });


/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

/* GET register page. */
router.get('/login', function(req, res, next) {
  res.render('form', { title: 'Log in', errors: [] });
});

/* GET login page. */
router.get('/register', function(req, res, next) {
  res.render('formregister', { title: 'Register', errors: [] });
});

function ensureAuthenticated(req, res, next){
	if(req.isAuthenticated()){
		return next();
	}
	res.redirect('/users/login');
}


/*Post on registation page*/
router.post('/register', function(req, res, next){
	// Get the form values
	var email = req.body.email;
	var username = req.body.username;
	var password = req.body.password;
	var password2 = req.body.password2;

	// check for image field
	if(req.file){
		console.log('Uploading File...');

		//file info 
		var profileImageOriginalName = req.file.originalname;
		var profileImageName = req.file.filename;
		var profileImageMime = req.file.mimetype;
		var profileImagePath = req.file.path;
		var profileImageExt  = req.file.extension;
		var profileImageSize = req.file.size;
	} else {
		// set a Default image
		var profileImageName = 'noimage.png';
	}

	// Form validation using the express-validation
    req.checkBody('email','Email Field is required').notEmpty();
    req.checkBody('email','Email not valid').isEmail();
	req.checkBody('username','Username Field is required').notEmpty();
	req.checkBody('password','Password Field is required').notEmpty();
	req.checkBody('password2','Passwords do not match').equals(req.body.password);

	// Check for errors
	var errors = req.validationErrors();
	//console.log(JSON.stringify(errors));

	if(errors){
		res.render('formregister', {
			title: 'Register',
			'errors': errors,
			'email': email,
			'username': username,
			'password': password,
			'password2': password2
		});
		console.log(JSON.stringify(errors));
	} else {
		var newUser = new User({
			email: email,
			username: username,
			password: password,
			profileimage : profileImageName	
		});
		//console.log(JSON.stringify(newUser));

		// Create User
		User.createUser(newUser, function(err, user){
			if(err) throw err;
			console.log(user)
		});

		// Success Message
		req.flash('success', 'You are now registered and may log in');
		res.location('/users/login');
		res.redirect('/users/login');
	}


});

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.getUserById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new LocalStrategy(
	function(username, password, done){
		User.getUserByUsername(username, function(err, user){
			if(err) throw err;
			if(!user){
				console.log('Unknown User');
				return done(null, false,{message: 'Unknown User'});
			}
			User.comparePassword(password, user.password, function(err, isMatch){
				if(err) throw err;
				if(isMatch){
					return done(null, user);
				} else {
					console.log('Invalid Password');
					return done(null, false, {message : 'Invalid Password'});
				}
			});
		});
	}
));

var username;
router.post('/login', passport.authenticate('local', {failureRedirect: '/users/login', failureFlash: 'Invalid username or password'}), function(req, res, next){
	username = req.body.username;
	console.log('Authentication Successful');
	req.flash('success', 'You are logged in');
	res.redirect('/users/userpage/'+ username);
});

router.get('/logout', function(req, res){
	req.logout();
	req.flash('success', 'You have logged out');
	res.redirect('/users/login'); 
});

/* GET userpage without name*/
router.get('/userpage', ensureAuthenticated, function(req, res, next) {
  var db1 = req.db;
  var posts = db1.get('posts');
  posts.find({},{}, function(err, posts){
  //	console.log(posts);
  // 	if(err) throw err;
  	res.render('userpage',{
  		"posts": posts,
  		"username": username
  	});
  });
});


/* GET userpage with name*/
router.get('/userpage/:username', ensureAuthenticated, function(req, res, next) {
  var username = req.params.username;
  var url = '/users/userpage/'+username; 
  var db1 = req.db;
  var posts = db1.get('posts');
  var users = db1.get('users');
  posts.find({},{}, function(err, posts){
   //console.log(JSON.stringify(posts));
   //	console.log(posts);
   // 	if(err) throw err;
   users.find({},{}, function(err, users){
   	//console.log(JSON.stringify(users));
   		res.render('userpage',{
  		"posts": posts,
  		"username": username,
  		"users":users,
  		"url": url
  	 });

    });
  	
  });
});

/*Post on userpage*/
var url = '/userpage/'+username;
router.post('/userpage', function(req,res,next){
//get form values
var body         = req.body.body;
var author        = username;
var date          = new Date(); 
 
 //form Validation
 req.checkBody('body', " ").notEmpty();

//check errors
 var errors = req.validationErrors();

 if(errors){ 
 	console.log(JSON.stringify(errors));
 	res.location('/users/userpage/'+ username);
    res.redirect('/users/userpage/'+ username); 
 }else{
 	var posts = db1.get('posts');
 	//submit to DB
 	posts.insert({
 		"body":body,
 		"author":author,
 		"date": date	

 	}, function(err, post){
 		if(err){
 			res.send('there is a problem with your post');
 		}else{
 			req.flash('success', 'post submitted');
 			res.location('/users/userpage/'+ username);
            res.redirect('/users/userpage/'+ username); 
 		}
 	});
 }

});

/* GET comment*/
router.get('/comments/:id', ensureAuthenticated, function(req, res, next) {
  var posts  = db1.get('posts');
  var postid = req.params.id;

  posts.findOne(
	  {
	  	"_id": postid 
	  },
	  function(err, post){
	  	//console.log(post);
	  	if(err) {throw err;
	  	}else{
	  	res.render('comments',
	  	{ 
	  	"title": 'comment',
	  	"postid": postid,
	  	"post": post,
	  	"username":username
	 	 }
	 	);
	  	}
      }
  );
  
});

/*post comment*/
router.post('/comments/:id', function(req,res,next){
//get form values
var name    = req.body.name;
var body    = req.body.body;
var postid  = req.body.postid;
var commentdate    = new Date(); 

 //form Validation
req.checkBody('body', " ").notEmpty();

//check errors
 var errors = req.validationErrors();

 if(errors){ 
 	var posts = db1.get('posts');
 	posts.findOne(postid, function(err, post){
 		res.render('userpage',{
 		"errors": errors,
 		"posts": posts,
  		"username": username,
  		"url": url	
 		});
 	}); 
 }else{
 	var comment = {"name": name, "body": body, "commentdate": commentdate};
 	var posts = db1.get('posts');
 	//submit to DB
 	posts.update({
 		"_id": postid
 		},
 		{
 			$push:{
 				"comments": comment
 			}
 		},
 		function(err, doc){
 		if(err){
 			res.send('there is a problem saving your post');
 			throw err;
 		}else{
 			req.flash('success', 'comment added');
 			res.location('/users/userpage/'+ username);
            res.redirect('/users/userpage/'+ username); 
 		}
 	});
 }

});

router.get('/deletepost/:id', ensureAuthenticated, function(req, res, next) {
  var posts  = db1.get('posts');
  var postid = req.params.id;
  posts.remove(
	  {
	  	"_id": postid 
	  },
	  function(err, post){
	  	//console.log(post);
	  	if(err) {throw err;
	  	}else{
		  	req.flash('success', 'post deleted');
		  	res.redirect('/users/userpage/'+ username);
	  	}
      }
  );
  
});

/* GET edit post page*/
router.get('/editpost/:id', ensureAuthenticated, function(req, res, next) {
  var posts  = db1.get('posts');
  var postid = req.params.id;

  posts.findOne(
	  {
	  	"_id": postid 
	  },
	  function(err, post){
	  	//console.log(post);
	  	if(err) {throw err;
	  	}else{
	  	res.render('edit',
	  	{ 
	  	"title": 'edit',
	  	"postid": postid,
	  	"post": post,
	  	"username":username
	 	 }
	 	);
	  	}
      }
  );
  
});

router.post('/editpost/:id', ensureAuthenticated, function(req, res, next) {
  	// Get edited post
  	var newpost = req.body.body;
	
	// check for errors
	req.checkBody('body', ' ').notEmpty();
	// validation
	var errors = req.validationErrors(); 

	if(errors){ 
	 	var posts = db1.get('posts');
	 	posts.findOne(postid, function(err, post){
	 		res.render('userpage',{
	 		"errors": errors,
	 		"posts": posts,
	  		"username": username,
	  		"url": url	
	 		});
	 	}); 
 	}else{
	 	var posts  = db1.get('posts');
		var postid = req.params.id;
		posts.update(
		  {
		  	"_id": postid 
		  },{
		  	$set:{"body": newpost }
		  },
		  function(err, post){
		  	//console.log(post);
		  	if(err) {throw err;
		  	}else{
			  	req.flash('success', 'post Edited');
			  	res.redirect('/users/userpage/'+ username);
		  	}
		  }
		);
 	}
});

/* GET profilepage */
router.get('/profilepage/:name', ensureAuthenticated, function(req, res, next) {
	var name = req.params.name;
	var users = db1.get('users');
	users.findOne(
			{
				"username":name
			},function(err, user){
				if(err) throw err;
				res.render('profilepage', { 
							'title': 'Profile',
							'username' : username,
							'user':user,
							 errors: [] 
						});
			}

		);
});

/*Post on profile page*/
router.post('/profilepage/:username', function(req, res, next){
	// Get the form values
	var fullname = req.body.fullname;
	var about = req.body.about;
	var skills = req.body.skills;
	var hobbies = req.body.hobbies;

	// Form validation using the express-validation
    req.checkBody('fullname','Names field is required').notEmpty();
	req.checkBody('about','About me Field is required').notEmpty();
	req.checkBody('skills','Skills Field is required').notEmpty();
	req.checkBody('hobbies','Hobbies Field is required').notEmpty();
	// Check for errors
	var errors = req.validationErrors();

	if(errors){
		res.render('profilepage', {
			title: 'Profile',
			errors: errors,
			fullname: fullname,
			about: about,
			skills: skills,
			hobbies:hobbies
		});
		console.log(JSON.stringify(errors));
	} else {
		var users = db1.get('users');
	    users.update(
			{"username": username},
			{
				$set:{
					"fullname": fullname,
					"about": about,
					"skills": skills,
					"hobbies":hobbies
				}
			},function(err, user){
				if(err) throw err;
				//console.log(JSON.stringify(user));
				req.flash('success', 'You have successfully edited your profile page');
				res.location('/users/profilepage/'+username);
				res.redirect('/users/profilepage/'+username);
			}

		);
	}
});


/* update profileimage */
router.post('/profileimage/:username', function(req, res, next){
	var username = req.params.username;
	// check for image field
	if(req.file){
		console.log('Uploading File...');

		//file info 
		var profileImageOriginalName = req.file.originalname;
		var profileImageName = req.file.filename;
		var profileImageMime = req.file.mimetype;
		var profileImagePath = req.file.path;
		var profileImageExt  = req.file.extension;
		var profileImageSize = req.file.size;

		//console.log(req.file.filename);
		
	} else {
		// set a Default image
		var profileImageName = 'noimage.png';
	}
	var users = db1.get('users');
	users.update(
		{"username": username},
		{
			$set:{"profileimage": profileImageName}
		},function(err, user){
			if(err) throw err;
			//console.log(JSON.stringify(user));
			req.flash('success', 'You have successfully uploaded your profile image');
			res.redirect('/users/profilepage/'+username);
		}

		);
});

  

module.exports = router;
