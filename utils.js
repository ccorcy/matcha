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
  			var like_info = "/";
  			if (user.like != undefined) {
          like_info = user.like
        }
        if (like_info.split("/").indexOf(usr) == -1) {
          let status = await db.collection("users").update({ username: usrn }, { $set: { like: like_info + "/" + usr } })
          if (status) {
            if (found.like != undefined) {
              if (found.like.split("/").indexOf(usrn) != -1)
              {
                var match_usr = await db.collection("users").findOne({ username: usrn})
                if (match_usr) {
                  if (match_usr.match != undefined) {
                    match_usr = match_usr.match
                  } else {
                    match_usr = "/"
                  }
                  if (match_usr.split("/").indexOf(usr) == -1) {
                    let status = await db.collection("users").update({username: usrn}, { $set: { match: match_usr + "/" + usr } })
                    if (!status) {
                      console.log("error cannot update base for match, user: " + usrn)
                    }
                    match_usr = await db.collection("users").findOne({ username: usr})
                    if (match_usr) {
                      if (match_usr.match != undefined) {
                        match_usr = match_usr.match
                      } else {
                        match_usr = "/"
                      }
                    }
                    status = await db.collection("users").update({ username: usr}, { $set: { match: match_usr + "/" + usrn}})
                    if (!status) {
                      console.log("error cannot update base for match, user: " + usr)
                    }
                    res.end("MATCH!")
                    let token = usrn + usr
                    if (token) {
                      let room = {
                        token: token,
                        users: usrn + "/" + usr,
                        messages: [
                            {
                              sender: usrn,
                              value: 'example message for test'
                            },
                            {
                              sender: usr,
                              value: "example message for test2"
                            }
                        ]
                      }
                      let status = await db.collection('chat_room').insertOne(room)
                      if (!status) {
                        console.log("error creating the chat room")
                      }
                    }
                  } else {
                    res.end("User and you already match")
                  }
                }
              } else {
                  res.end("Liked")
              }
            } else {
              res.end("Liked")
            }
          }
          else {
            res.end("ERROR DATABASE")
          }
        } else {
          res.end("User already liked")
        }
  			db.close()
  		}
  	} else {
  		res.end("Error: " + usr + " doesn't exist (anymore ?)")
  	}
  },

  register: async function (db, body, res, error) {
    let regName = /^[a-zA-Z]{4,20}$/
    let regUsername = /^[a-zA-Z0-9]{6,20}$/
    let regMail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    let regPwd = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/
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
  			if (users.username === body.username || regUsername.test(body.username) === false) {
  				error.username = true
  			}
  			if (users.email === body.email) {
  				error.email = true
  			}
  		}
      if (body.name == "" || regName.test(body.name) === false) {
        error.name = true
      }
      if (body.surname == "" || regName.test(body.surname) === false) {
        error.surname = true
      }
      if (body.username == "") {
        error.username = true
      }
      if (body.email == "" || regMail.test(body.email) === false) {
        error.email = true
      }
  		if (body.password == "" || regPwd.test(body.password) === false) {
  			error.password = true;
  		}
  		if (body.password !== body.vpassword || body.vpassword == "") {
  			error.password_different = true;
  		}
  		if (error.name === true || error.surname === true || error.username === true || error.email === true || error.password === true || error.password_different === true) {
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
