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
  index: function (req, res, sess) {
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
  },
  profile: function (req, res, sess) {
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
  },
  like_page: async function (req, res, sess) {
    sess = req.session;
  	if (sess.username == undefined) {
  		res.render('pages/index', {
  			name: "",
        like: "",
  			usr: {}
  		});
  	} else {
  		MongoClient.connect(urlDB, (err, db) => {
  			if (err) throw err
  			db.collection("users").find({}).toArray((err, usrs) => {
  				if (err) throw err
          db.collection("users").findOne({ username: sess.username }, (err, user) => {
            var like = "/"
            if (user.like != undefined) {
              like = user.like
            }
            res.render('pages/like', {
              name: sess.username,
              user: user,
              like: like,
              usr: usrs
            });
          })
          db.close()
        })
      })
  	}
  },
  update_pp: async function (req, res, sess) {
    sess = req.session
  	let id = req.query.id
  	let ok = false
  	if (sess.username != undefined && id != null) {
  		MongoClient.connect(urlDB, (err, db) => {
  			if (err) throw err
  			db.collection("pp").find({ username: sess.username }).toArray((err, result) => {
  				if (err) throw err
  				result.forEach((elem) => {
  					if (elem.img.filename === id) {
  						db.collection("users").update({ username: sess.username}, { $set: { pics: "/pp/" + id } }, (err, r) => {
                if (err) throw err
                db.close()
              })
  						ok = true
  						res.end("ok")
  					}
  				})
  				if (ok === false) {
  					 res.end("error")
             db.close()
  				}
  			})
  		})
  	} else {
  		res.end("error");
  	}
  },
  like: function (req, res, sess) {
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
  },
  up_pics: function (req, res, sess) {
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
  },
  match: async function (req, res, sess, db) {
    sess = req.session

    let result = await db.collection("users").findOne({ username: sess.username})
    if (result) {
      let usrs = await db.collection("users").find({ gender: result.pref }).toArray()
      if (result.match != "") {
        result = result.match.split("/")
      } else {
        result = []
      }
      if (usrs) {
        console.log(usrs)
        res.render('pages/match', {
          name: sess.username,
          usr_matched: result,
          usrs: usrs
        })
        db.close()
      } else {
        db.close()
      }
    } else {
      db.close()
    }
  }
}
