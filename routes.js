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
  		db.collection("users").findOne({ username: sess.username}, (err, result) => {
  			if (result == undefined) {
  				db.close()
  				res.render('pages/index', {
  				});
  			} else {
          db.collection("interest").findOne({}, (err, inter) => {
            if (err) throw err;
            let interests = []
            if (inter != undefined) {
              interests = inter.interests
            }
            db.collection("pp").find( { username: sess.username }).toArray((err, pic_res) => {
              if (err) {
                res.render('pages/profile', {
                  user: result,
                  name: sess.username,
                  profile_pic: "pp/default.png",
                  pics: [],
                  inter: interests
                });
                db.close()
              } else {
                if (pic_res[0] != undefined) {
                  res.render('pages/profile', {
                    user: result,
                    name: sess.username,
                    profile_pic: result.pics,
                    pics: pic_res,
                    inter: interests
                  });
                } else {
                  res.render('pages/profile', {
                    user: result,
                    name: sess.username,
                    profile_pic: "pp/default.png",
                    pics: [],
                    inter: interests
                  });
                }
                db.close()
              }
            })
          })
  			}
  		});
  	});
  },
  like_page: async function (req, res, sess) {
    sess = req.session;
  	if (sess.username == undefined) {
  		res.render('pages/index');
  	} else {
  		MongoClient.connect(urlDB, (err, db) => {
  			if (err) throw err
        db.collection("users").findOne({ username: sess.username}, (err, user) => {
          if (err) throw err
          let like = user.like
          if (user.pref === "other") {
            db.collection("users").find({ username: { $ne: sess.username }}).toArray((err, users) => {
              if (users == undefined) {
                res.render('pages/like', {
                  name: sess.username,
                  user: user,
                  like: like,
                  usr: ""
                });
              } else {
                res.render('pages/like', {
                  name: sess.username,
                  user: user,
                  like: like,
                  usr: users
                });
              }
            })
          } else {
            db.collection("users").find({ $and: [ { username: { $ne: sess.username }}, { gender: user.pref } ] }).toArray((err, users) => {
              if (users == undefined) {
                res.render('pages/like', {
                  name: sess.username,
                  user: user,
                  like: like,
                  usr: ""
                });
              } else {
                res.render('pages/like', {
                  name: sess.username,
                  user: user,
                  like: like,
                  usr: users
                });
              }
            })
          }
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
      let usrs = await db.collection("users").find({}).toArray()
      if (usrs) {
        res.render('pages/match', {
          name: sess.username,
          usr_matched: result.match,
          user: result,
          usrs: usrs
        })
        db.close()
      } else {
        db.close()
      }
    } else {
      db.close()
    }
  },
  user_profile: async function (req, res, sess) {
    sess = req.session
    if (sess.username != undefined && req.query.usr != undefined) {
      let db = await MongoClient.connect(urlDB)
      if (db) {
        let usr = await db.collection("users").findOne({ username: req.query.usr })
        let user = await db.collection("users").findOne({ username: sess.username })
        if (user) {
          res.render('pages/user_profile', {
            usr: usr,
            user : user,
            sess: sess
          })
        } else {
          res.render('pages/user_profile')
        }
      }
    } else {
      res.render('pages/index')
    }
  },
  tchat: async function (req, res, sess) {
    sess = req.session
    if (sess.username != undefined && req.query.id != undefined) {
      let db = await MongoClient.connect(urlDB)
      let token1 = sess.username + req.query.id
      let token2 = req.query.id + sess.username
      if (db) {
        let room = await db.collection("chat_room").findOne({ token: token1})
        if (room) {
          let user = await db.collection("users").findOne({ username : sess.username })
          let usrs = room.users.split("/")
          if ((usrs[0] === sess.username || usrs[1] === sess.username)
            && (usrs[0] === req.query.id || usrs[1] === req.query.id)) {
              let user2 = ""
              if (sess.username === usrs[0]) {
                user2 = usrs[1]
              } else {
                user2 = usrs[0]
              }
              if (user) {
                res.render('pages/tchat', {
                  usr: sess.username,
                  usr2: user2,
                  messages: room.messages,
                  user: user
                })
              }
              db.close()
          } else {
            db.close()
            // TODO: 403
          }
        } else {
          room = await db.collection("chat_room").findOne({token: token2})
          if (room) {
            let usrs = room.users.split("/")
            if ((usrs[0] === sess.username || usrs[1] === sess.username)
              && (usrs[0] === req.query.id || usrs[1] === req.query.id)) {
                let user2 = ""
                if (sess.username === usrs[0]) {
                  user2 = usrs[1]
                } else {
                  user2 = usrs[0]
                }
                res.render('pages/tchat', {
                  user: sess.username,
                  usr2: user2,
                  messages: room.messages
                })
                db.close()
            } else {
              // TODO: 403
              db.close()
            }
          } else {
            db.close()
            // TODO: 404 not found
          }
        }
      }
    } else if (sess.username == undefined) {
      res.render('pages/index')
    } else {
      MongoClient.connect(urlDB, (err, db) => {
        if (err) throw err
        res.send("<script> document.location.replace('/like_page')</script>")
        db.close()
      })
    }
  },
  dislike: async function (sess, usr_to_dislike) {
    let db = await MongoClient.connect(urlDB)
    if (db) {
      let user = await db.collection("users").findOne({ username: sess.username })
      if (user) {
        let like = user.like
        if (like.indexOf(usr_to_dislike) != -1) {
          for (var i = 0; i < like.length; i++) {
            if (like[i] === usr_to_dislike) {
              like.splice(i, 1)
            }
          }
          let status = await db.collection("users").update({ username: sess.username}, { $set: { like: like} })
          if (!status) {
            console.log("error update")
            return (0)
          } else {
            return (1)
          }
        } else {
          return (0)
        }
      } else {
        return (0)
      }
      db.close()
    } else {
      console.log("error: cannot get access to db")
      return (0)
    }
  },
  delete_match: async function (sess, usr_to_dislike) {
    let db = await MongoClient.connect(urlDB)
    if (db) {
      let user = await db.collection("users").findOne({ username: sess.username })
      let user2 = await db.collection("users").findOne({ username: usr_to_dislike })
      if (user && user2) {
        let match = user.match
        let match2 = user2.match
        if (match.indexOf(usr_to_dislike) != -1 && match2.indexOf(sess.username) != -1) {
          for (var i = 0; i < match.length; i++) {
            if (match[i] === usr_to_dislike) {
              match.splice(i, 1)
            }
          }
          for (var i = 0; i < match2.length; i++) {
            if (match2[i] === sess.username) {
              match2.splice(i ,1)
            }
          }
          let status = await db.collection("users").update({ username: sess.username}, { $set: { match: match } })
          let status2 = await db.collection("users").update({ username: usr_to_dislike}, { $set: { match: match2} })
          let status3 = await db.collection("chat_room").remove({ $or: [{ token: sess.username + usr_to_dislike }, { token: usr_to_dislike + sess.username }]})
          if (!status || !status2 || !status3) {
            console.log("error update")
            return (0)
          } else {
            return (1)
          }
        } else {
          return (0)
        }
      } else {
        return (0)
      }
      db.close()
    } else {
      console.log("error: cannot get access to db")
      return (0)
    }
  }
}
