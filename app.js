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
const url = require('url');
const func = require("./utils.js")

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
				db.close()
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
						db.close()
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
						db.close()
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
			db.close()
		})
	}
});

app.get('/match', (req, res) => {
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
				res.render('pages/match', {
					name: sess.username,
					usr: usrs
				});
			})
			db.close()
		})
	}
});

app.get('/update_pp', (req, res) => {
	sess = req.session
	let id = req.query.id
	let ok = false
	console.log(id);
	if (sess.username != undefined && id != null) {
		MongoClient.connect(urlDB, (err, db) => {
			if (err) throw err
			db.collection("pp").find({ username: sess.username }).toArray((err, result) => {
				if (err) throw err
				result.forEach((elem) => {
					if (elem.img.filename === id) {
						db.collection("users").update({ username: sess.username}, { $set: { pics: "/pp/" + id } })
						ok = true
						res.send("ok")
					}
				})
				if (ok === false) {
					 res.send("error")
				}
			})
			db.close()
		})
	} else {
		res.send("error");
	}
})

app.get('/like', (req, res) => {
	sess = req.session
	let usr = req.query.usr
	let liked = req.query.like
	if (sess.username !== usr) {
		res.end("You are not " + usr)
	} else {
		MongoClient.connect(urlDB, (err, db) => {
			if (err) throw err
			func.user(db, usr, liked, res)
		})
	}
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
	sess = req.session;
	try {
		if (req.file == undefined) {
			res.end("error")
		} else {
			MongoClient.connect(urlDB, (err, db) => {
				if (err) throw err
				func.up_pics(db, sess, req, res)
			})
		}
	} catch(err) {
		res.end("error")
	}
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
				&& (req.body.pref === "heterosexual" || req.body.pref === "homosexual"
					|| req.body.pref === "bisexual") && sess.username != undefined) {
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
		"username": false,
		"email": false,
		"password": false,
		"password_different": false
	};
	if (req.body.name !== "" && req.body.surname !== "" && req.body.email !== ""
		&& req.body.password !== "" && req.body.username !== "")
	{
		MongoClient.connect(urlDB, (err, db) => {
			func.register(db, req.body, res, error)
		})
	}
	});



app.listen(3000);
