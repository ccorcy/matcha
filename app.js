const express = require('express');
const app = express();
const session = require('express-session');
const bodyparser = require('body-parser');
const MongoClient = require("mongodb").MongoClient;
const urlDB = "mongodb://localhost:27020/matchaDB";
const multer = require('multer');
const upload = multer();
const bcrypt = require('bcrypt');
const up = multer({ dest: 'public/pp/' });
const func = require("./utils.js")
const routes = require("./routes.js")

app.use(express.static(__dirname + '/public'));
app.use(session( { secret: 'ccorcymatcha',
 									 resave: true,
								 	 saveUninitialized: true }));
app.use( bodyparser.json() );
app.use(bodyparser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');


let sess;

app.get('/profile.html', (req,res) => {
  routes.profile(req, res, sess)
});

app.get('/register.html', (req,res) => {
	res.render('pages/register');
});

app.get('/', (req, res) => {
	routes.index(req, res, sess)
});

app.get('/like_page', (req, res) => {
	routes.like_page(req, res, sess)
});

app.get('/update_pp', (req, res) => {
	routes.update_pp(req, res, sess)
})

app.get('/like', (req, res) => {
	routes.like(req, res, sess)
})

app.get('/logout', (req, res) => {
	sess = req.session;
	sess.username = "";
	res.send("<script type='text/javascript'> document.location.replace('/'); </script>");
});



app.post('/login', upload.fields([]), (req, res) => {
	sess = req.session;
	MongoClient.connect(urlDB, (err, db) => {
		if (err) throw err;
		func.login(db, req.body, sess, res)
		db.close();
	});
});

app.post('/up_pics', up.single('profile_picture'), (req, res, next) => {
	routes.up_pics(req, res, sess)
});

app.post('/update_bio', upload.fields([]), (req, res) => {
	sess = req.session
	if (sess.username != undefined && req.body.bio !== "" && req.body.bio.length <= 250) {
		MongoClient.connect(urlDB, (err, db) => {
			if (err) throw err
			db.collection("users").update({ username: sess.username }, { $set: { bio: req.body.bio }} )
			res.send("ok")
			db.close()
		})
	} else {
		res.send("error")
	}
})

app.post('/finish_sub', upload.fields([]), (req, res) => {
	sess = req.session;
	if (req.body.age >= 18 && req.body.age <= 125
		&& (req.body.gender === "male"
			|| req.body.gender === "female" || req.body.gender === "other")
				&& (req.body.pref === "male" || req.body.pref === "female"
					|| req.body.pref === "other") && sess.username != undefined) {
			MongoClient.connect(urlDB, (err, db) => {
				if (err) throw err
				db.collection("users").update({ username: sess.username }, { $set: { age: req.body.age, gender: req.body.gender, pref: req.body.pref }} )
				res.send("ok")
				db.close()
			});
	} else {
			res.send("invalid request")
	}
})

app.post('/register', upload.fields([]), (req, res) => {
	let error = {
    "name": false,
    "surname": false,
		"username": false,
		"email": false,
		"password": false,
		"password_different": false
	};
	MongoClient.connect(urlDB, (err, db) => {
		func.register(db, req.body, res, error)
	})
});



app.listen(3000);
