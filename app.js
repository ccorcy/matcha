const express = require('express');
const app = express();
const session = require('express-session');
const path = require('path');
const bodyparser = require('body-parser');
const MongoClient = require("mongodb").MongoClient;
const urlDB = "mongodb://localhost:27020/matchaDB";
const util = require('util');
const multer = require('multer');
const upload = multer();
const bcrypt = require('bcrypt');
const up = multer({ dest: 'public/pp/' });

app.use(express.static(__dirname + '/public'));
app.use(session( { secret: 'ccorcymatcha' } ));
app.use( bodyparser.json() );
app.use(bodyparser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');


let sess;

app.get('/profile.html', (req,res) => {
	sess = req.session;
	MongoClient.connect(urlDB, (err, db) => {
		db.collection("users").find({ username: sess.username }).toArray((err, result) => {
			if (result[0] == undefined) {
				res.render('pages/profile', {
					obj: {},
					name: "",
					profile_pic: "pp/default.png",
					pics: []
				});
			} else {
				db.collection("pp").find( { username: sess.username }).toArray((err, pic_res) => {
					if (err) {
						res.render('pages/profile', {
							obj: result[0],
							name: sess.username,
							profile_pic: "pp/default.png",
							pics: []
						});
					} else {
						if (pic_res[0] != undefined) {
							res.render('pages/profile', {
								obj: result[0],
								name: sess.username,
								profile_pic: result[0].pics,
								pics: pic_res
							});
						} else {
							res.render('pages/profile', {
								obj: result[0],
								name: sess.username,
								profile_pic: "pp/default.png",
								pics: []
							});
						}
					}
				})
			}
		});
	});
});

app.get('/register.html', (req,res) => {
	res.render('pages/register');
});

app.get('/', (req, res) => {
	sess = req.session;
	if (sess.username == undefined) {
		res.render('pages/index', {
			name: "",
			usr: {}
		});
	} else {
		MongoClient.connect(urlDB, (err, db) => {
			if (err) throw err
			db.collection("users").find({}).toArray((err, usrs) => {
				if (err) throw err
				res.render('pages/index', {
					name: sess.username,
					usr: usrs
				});
			})
		})
	}
});

app.get('/logout', (req, res) => {
	sess = req.session;
	sess.username = "";
	res.send("<script type='text/javascript'> document.location.replace('/'); </script>");
});

app.post('/register', upload.fields([]), (req, res) => {
	let error = {
		"username": false,
		"email": false,
		"password": false,
		"password_different": false
	};
	if (req.body.name !== "" && req.body.surname !== "" && req.body.email !== ""
		&& req.body.password !== "" && req.body.username !== "")
	{
			bcrypt.hash(req.body.password, 10, (err, hash) => {
			if (err) throw err;
			MongoClient.connect(urlDB, (err, db) => {
				let user = {
					"name": req.body.name,
					"surname": req.body.surname,
					"username": req.body.username,
					"email": req.body.email,
					"password": hash,
				};
				db.collection("users").find( {$or: [ { username: req.body.username }, { email: req.body.email }] } ).toArray((err, result) => {
					if (result[0] != undefined) {
						if (result[0].username === req.body.username) {
							error.username = true;
						}
						if (result[0].email === req.body.email) {
							error.email = true;
						}
					}
					if (req.body.password === null) {
						error.password = true;
					}
					if (req.body.password !== req.body.vpassword) {
						error.password_different = true;
					}
					if (error.username === true || error.email === true || error.password === true || error.password_different === true) {
						res.json(error);
					} else {
						db.collection("users").insertOne(user, (err,result) => {
							if (err) throw err;
						});
						res.json(error);
						db.close();
					}
				});
			});
		});
	}
});

app.post('/login', upload.fields([]), (req, res) => {
	sess = req.session;
	MongoClient.connect(urlDB, (err, db) => {
		if (err) throw err;
		db.collection("users").find({ "username": req.body.usrn }).toArray((err, result) => {
			if (result[0] == undefined) {
				res.send("error mail");
			}
			else {
				bcrypt.compare(req.body.password, result[0].password, (err, same) => {
					if (err) throw err;
					if (same === true) {
						sess.username = req.body.usrn;
						res.send("OK");
					} else {
						res.send("error password");
					}
				});
			}
		});
		db.close();
	});
});

app.post('/up_pics', up.single('profile_picture'), (req, res, next) => {
	sess = req.session;
	try {
		MongoClient.connect(urlDB, (err, db) => {
			if (err) throw err
			db.collection("pp").insertOne({ username: sess.username, img: req.file })
			db.collection("users").update({ username: sess.username }, { $set: {pics: "/pp/" + req.file.filename} } )
			res.send("OK")
		})
	} catch(err) {
		res.send("error")
	}
});

app.post('/finish_sub', upload.fields([]), (req, res) => {
	sess = req.session;
	if (req.body.age >= 18 && req.body.age <= 125
		&& (req.body.gender === "male"
			|| req.body.gender === "female" || req.body.gender === "other")
				&& (req.body.pref === "heterosexual" || req.body.pref === "homosexual"
					|| req.body.pref === "bisexual") && sess.username != undefined) {
			MongoClient.connect(urlDB, (err, db) => {
				if (err) throw err
				db.collection("users").update({ username: sess.username }, { $set: { age: req.body.age, gender: req.body.gender, pref: req.body.pref }} )
				res.send("ok")
			});
	} else {
			res.send("invalid request")
	}
})

app.listen(3000);
