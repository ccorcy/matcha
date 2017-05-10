const express = require('express');
const app = express();
const path = require('path');
const bodyparser = require('body-parser');
const MongoClient = require("mongodb").MongoClient;
const urlDB = "mongodb://localhost:27017/matchaDB";
const util = require('util');
const multer = require('multer');
const upload = multer();
const crypto = require("crypto");
const hash = crypto.createHash('sha512');

app.use(express.static(__dirname + '/public'));
app.use( bodyparser.json() );
app.use(bodyparser.urlencoded({ extended: true }));


app.get('/config/setup', (req, res) => {
	MongoClient.connect(urlDB, (err, db) => {
		if (err) throw err;

		db.createCollection("users", (err, res) => {
			if (err) throw err;
			console.log("User table created !");
		});
		let admin = { name: "Admin", surname: "Admin", genre: "none", sex_preference: "bisexual", email: "ccorcy@student.42.fr", password: "admin" };
		db.collection("users").insertOne(admin, (err, res) => {
			if (err) throw err;
			console.log("ADMIN INSERTED");
		});


		db.close();
	});
	res.send("SETUP COMPLETE");
});

app.get('/register.html', (req,res) => {
	res.sendFile(__dirname + '/register.html');
});

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html');
});

app.get('/get_users', (req,res) => {
	MongoClient.connect(urlDB, (err, db) => {
		if (err) throw err;

		db.collection("users").find({}).toArray((err, result) => {
			if (err) throw err;
			
			console.log(result);
			res.send(result);
			db.close();
		});
	});
});



	app.post('/register', upload.fields([]), (req, res) => {
		let error = {
			"email": false,
			"password": false,
			"password_different": false
		};
		hash.update(req.body.password);
		let user = {
			"name": req.body.name,
			"surname": req.body.surname,
			"email": req.body.email,
			"password": hash.digest('hex'),
			"gender": req.body.gender
		};
		if (req.body.password === null) {
			error.password = true;
		}
		if (req.body.password !== req.body.vpassword) {
			error.password_different = true;
		}
		if (req.body.name !== "" && req.body.surname !== "" && req.body.email !== ""
			&& req.body.password !== "" && req.body.gender !== "")
		{
			MongoClient.connect(urlDB, (err, db) => {
				if (err) throw err;
				db.collection("users").insertOne(user, (err,res) => {
					if (err) throw err;
					console.log("user: " + req.body.name + " added");
				});
				res.json(error);
			});
		}

	});



app.listen(3000);