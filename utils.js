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

module.exports = {
  login: async function (db, body, sess, res) {
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
  	db.close()
  },

  user: async function (db, usrn, usr, res) {
  	let found = await db.collection("users").findOne({ username: usr })
  	if (found) {
  		let user = await db.collection("users").findOne({ username: usrn })
  		if (user) {
  			let like_info = user.like;
  			if (like_info !== "") {
  				like_info = like_info + "/" + usr
  			} else {
  				like_info = usr
  			}
  			let status = await db.collection("users").update({ username: usrn }, { $set: { like: like_info } })
  			if (status)
  				if (found.like !== undefined) {
  					if (found.like.split("/").indexOf(usrn) != -1)
  						res.end("MATCH!")
  					else {
  							res.end("Liked")
  						}
  				} else {
  					res.end("Liked")
  				}
  			else {
  				res.end("ERROR DATABASE")
  			}
  			db.close()
  		}
  	} else {
  		res.end("Error: " + usr + " doesn't exist (anymore ?)")
  	}
  },

  register: async function (db, body, res, error) {
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
  },

  up_pics: async function (db, sess, req, res) {
    let status = await db.collection("pp").insertOne({ username: sess.username, img: req.file })
    let status1 = await db.collection("users").update({ username: sess.username }, { $set: {pics: "/pp/" + req.file.filename} } )
    if (status && status1) {
      res.end("OK")
    } else {
      res.end("error")
    }
    db.close()
  }
}
