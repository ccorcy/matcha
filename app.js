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
					console.log(elem)
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
		})
	} else {
		res.send("error");
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
		func_login(db, req.body, sess, res)
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

app.post('/update_bio', upload.fields([]), (req, res) => {
	sess = req.session
	if (sess.username != undefined && req.body.bio !== "" && req.body.bio.length <= 250) {
		MongoClient.connect(urlDB, (err, db) => {
			if (err) throw err
			db.collection("users").update({ username: sess.username }, { $set: { bio: req.body.bio }} )
			res.send("ok")
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
			func_register(db, req.body, res, error)
		})
	}
	});

async function func_login(db, body, sess, res) {
	let result = await db.collection("users").findOne({ username: body.usrn })
	if (result) {
		let comp = await bcrypt.compare(body.password, result.password)
		if (comp) {
			sess.username = body.usrn
			res.end("OK")
		} else {
			res.end("error password")
		}
	} else {
		res.end("error mail")
	}
}

async function func_register(db, body, res, error) {
	let pwd_hash = await bcrypt.hash(body.password, 10)
	if (pwd_hash) {
		let user = {
			"name": body.name,
			"surname": body.surname,
			"username": body.username,
			"email": body.email,
			"password": pwd_hash,
		}
		let users = await db.collection('users').findOne( {$or: [ { username: body.username }, { email: body.email }] } )
		if (users != undefined) {
			if (users.username === body.username) {
				error.username = true
			}
			if (users.email === body.email) {
				error.email = true
			}
		}
		if (body.password === null) {
			error.password = true;
		}
		if (body.password !== body.vpassword) {
			error.password_different = true;
		}
		console.log(error)
		if (error.username === true || error.email === true || error.password === true || error.password_different === true) {
			res.json(error);
		} else {
			db.collection("users").insertOne(user, (err,result) => {
				if (err) throw err;
			});
			res.json(error);
			db.close();
		}
	}
	else {
		res.send("error")
	}
}


app.listen(3000);
