const express = require('express');
const app = express();
const path = require('path');
const MongoClient = require("mongodb").MongoClient;
const urlDB = "mongodb://localhost:27017/matchaDB";

app.use(express.static(__dirname + '/public'));

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

app.listen(3000);