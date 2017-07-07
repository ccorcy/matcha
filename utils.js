const MongoClient = require('mongodb').MongoClient
const urlDB = 'mongodb://localhost:27020/matchaDB'
const bcrypt = require('bcrypt')
const sendmail = require('sendmail')({silent: true})

module.exports = {
	login: async function (db, body, sess, res) {
		let result = await db.collection('users').findOne({ username: body.usrn })
		if (result) {
			let comp = await bcrypt.compare(body.password, result.password)
			if (comp) {
				sess.username = body.usrn
				db.close()
				res.end('OK')
			} else {
				db.close()
				res.end('error password')
			}
		} else {
			db.close()
			res.end("error mail")
		}
	},
	reset_password: async function (req, res) {
		let db = await MongoClient.connect(urlDB)
		if (db) {
			let user = await db.collection("users").findOne({ email: req.query.mail })
			if (user) {
				var pwd = "";
				var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
				for( var i=0; i < 11; i++ )
				pwd += possible.charAt(Math.floor(Math.random() * possible.length));
				let hash = await bcrypt.hash(pwd, 10)
				if (hash) {
					let status = await db.collection("users").update({ email: req.query.mail }, { $set: { password: hash }})
					if (!status) {
						db.close()
					} else {
						sendmail({
							from: 'no-reply@matcha.com',
							to: user.email,
							subject: 'MATCHA | Password reset',
							html: `Your password has been reset. Your new password is ${pwd}<br> You should change your password imediatly after connecting`
						}, (err, reply) => {
						})
						db.close()
						res.end("ok")
					}
				}
			} else {
				db.close()
				res.end("error")
			}
		} else {

		}
	},
	user: async function (db, usrn, usr, res) {
		let found = await db.collection("users").findOne({ username: usr })
		if (found) {
			if (found.pics == null) {
				res.end(usr + " doesn't have any picture :(")
				return ;
			}
			let user = await db.collection("users").findOne({ username: usrn })
			if (user) {
				if (user.pics == null) {
					res.end("You don't have a profile picture. Go in your profile section to upload one !")
					db.close()
					return ;
				}
				let like = []
				if (user.like != undefined) {
					like = user.like
				}
				if (like.indexOf(usr) == -1) {
					let score = found.score + 1
					like.push(usr)
					if (found.historyLike.indexOf(usrn) == -1)
						found.historyLike.push(usrn)
					let added = await db.collection("users").update({ username: usr }, { $set: { historyLike: found.historyLike, score: score } })
					if (!added) {}
					let status = await db.collection("users").update({username: usrn}, { $set: { like: like} })
					if (status) {
						if (found.like.length != 0) {
							if (found.like.indexOf(usrn) != -1) {
								let match = []
								if (user.match != undefined) {
									match = user.match
								}
								let match_2 = []
								if (found.match != undefined) {
									match_2 = found.match
								}
								if (match.indexOf(usr) == -1 && match_2.indexOf(usrn) == -1) {
									match.push(usr)
									match_2.push(usrn)
									let status = await db.collection("users").update({ username: usrn }, { $set: { match: match } })
									let status2 = await db.collection("users").update({ username: usr}, { $set: { match: match_2 } })
									if (!status || !status2) {
										db.close()

									} else {
										res.end("MATCH!")
										let token = usrn + usr
										if (token) {
											let room = {
												token: token,
												users: usrn + "/" + usr,
												messages: []
											}
											let status = await db.collection('chat_room').insertOne(room)
											if (!status) {
												db.close()
											} else {
												db.close()
											}
										}
									}
								} else {
									res.end(usr + " and you already match")
									db.close()
								}
							}
						} else {
							res.end("Liked")
							db.close()
						}
					} else {
						res.end("error")
						db.close()
					}
				} else {
					res.end(usr + " already liked")
					db.close()
				}
				db.close()
			}
		} else {
			res.end("Error: " + usr + " doesn't exist (anymore ?)")
			db.close()
		}
	},

	register: async function (db, body, res, error) {
		let regName = /^[a-zA-Z]{2,20}$/
		let regUsername = /^[a-zA-Z0-9]{6,20}$/
		let regMail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
		let regPwd = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/
		let pwdHash = await bcrypt.hash(body.password, 10)
		if (pwdHash) {
			let user = {
				"name": body.name,
				"surname": body.surname,
				"username": body.username,
				"email": body.email,
				"password": pwdHash,
				"interest": [],
				"notification": [],
				"unread_notif": 0,
				"age" : null,
				"pics": null,
				"bio": null,
				"gender": undefined,
				"pref": 'other',
				"like": [],
				"match": [],
				"score": 0,
				"last_visite": 'never',
				"account_completed": false,
				"visited": [],
				"history": [],
				"historyLike": [],
				"city": null,
				"lat": null,
				"lon": null,
				"blocked": [],
				"false_account": false
			}
			let users = await db.collection('users').findOne({$or: [ { username: body.username }, { email: body.email }]})
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
					if (err) {};
				});
				res.json(error);
				db.close();
			}
		}
		else {
			db.close()
			res.send("error")
		}
	},

	up_pics: async function (db, sess, req, res) {
		let pictures = await db.collection("pp").find({ username: sess.username }).toArray()
		if (pictures) {
			if (pictures.length >= 5) {
				res.end("toomany")
				db.close()
			} else {
				let status = await db.collection("pp").insertOne({ username: sess.username, img: req.file })
				let status1 = await db.collection("users").update({ username: sess.username }, { $set: { pics: "/pp/" + req.file.filename, account_completed: true }} )
				if (status && status1) {
					db.close()
					res.end("OK")
				} else {
					db.close()
					res.end("error")
				}
			}
		}
	},
	update_chat_room: async function (sess, msg) {
		let message = { sender: sess.username, value: msg.msg }
		let db = await MongoClient.connect(urlDB)
		if (db) {
			let room = await db.collection("chat_room").findOne({ token: sess.username + msg.receiver })
			if (room) {
				let messages = room.messages
				messages.push(message)
				let status = await db.collection("chat_room").update({ token: sess.username + msg.receiver}, { $set: { messages: messages }})
				if (!status) {

				}
			} else {
				room = await db.collection("chat_room").findOne({ token: msg.receiver + sess.username })
				if (room) {
					let messages = room.messages
					messages.push(message)
					let status = await db.collection("chat_room").update({ token: msg.receiver + sess.username }, { $set: { messages: messages }})
					if (!status) {

					}
				}
			}
		}
	},
	get_interest: async function (interests) {
		let db = await MongoClient.connect(urlDB)
		if (db) {
			let interests_db = await db.collection("interest").find({}).toArray()
			if (interests_db.length != 0) {
				let inter = interests_db[0].interests
				let arr = []
				for (let i = 0; i < inter.length; i++) {
					arr.push(inter[i])
				}
				for (let i = 0; i < interests.length; i++) {
					if (arr.indexOf(interests[i]) == -1 && interests[i] !== "")
					arr.push(interests[i])
				}
				let status = await db.collection("interest").update({}, { $set: { interests: arr } })
				if (!status) {

				}
			} else {
				let status = await db.collection("interest").insertOne({ interests: interests })
				if (!status) {

				}
			}
		} else {

		}
	},
	last_login: async function (req, res) {
		let db = await MongoClient.connect(urlDB)
		if (db) {
			let last_log = await db.collection("users").findOne({ username: req.query.user })
			if (last_log) {
				res.end(last_log.last_visite.toString())
				db.close()
			} else {
				db.close()
				res.end("")
			}
		} else {
			res.end("")
		}
	},
	distance: function (user1, user2) {
		let R = 6371e3; // metres
		let φ1 = user1.lat * (Math.PI / 180);
		let φ2 = user2.lat * (Math.PI / 180);
		let Δφ = (user2.lat-user1.lat) * (Math.PI / 180);
		let Δλ = (user2.lon-user1.lon) * (Math.PI / 180);

		let a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
		        Math.cos(φ1) * Math.cos(φ2) *
		        Math.sin(Δλ/2) * Math.sin(Δλ/2);
		let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

		return d = R * c
	},
	sharedInterest: function (user1, user2) {
		let num = 0
		for (let i = 0; i < user1.interest.length; i++) {
			for (let y = 0; y < user2.interest.length; y++) {
				if (user1.interest[i] === user2.interest[y]) {
					num++;
				}
			}
		}
		return num
	},

	sort_distance: function (user1, user2) {
		if (user1.distance > user2.distance)
			return user1.distance > user2.distance
		else
			return 0
	},
	sort_interest: function (user1, user2) {
		if (user1.distance === user2.distance) {
			if (user1.intercom < user2.intercom)
				return user1.intercom < user2.intercom
			else
				return 0
		} else {
			return 0
		}
	},
	sort_pop: function (user1, user2) {
		if (user1.distance === user2.distance && user1.intercom === user2.intercom) {
			if (user1.score < user2.score)
				return user1.score < user2.score
		} else {
			return 0
		}
	}
}
