const express = require('express');
const session = require('express-session');
const bodyparser = require('body-parser');
const MongoClient = require("mongodb").MongoClient;
const urlDB = "mongodb://localhost:27020/matchaDB";
const multer = require('multer');
const upload = multer();
const bcrypt = require('bcrypt');
const up = multer({ dest: 'public/pp/' });
const func = require("./utils.js")
const routes = require("./routes.js")
const favicon = require('serve-favicon')
const app = express()
const sse = require('sse-express')

let ws_user = [];
let ws_notif_user = [];

module.exports = {
	notif: function (ws, req, sess, db, expressWs) {
		sess = req.session
		if (sess.username != undefined) {
			ws_notif_user.push({ username: sess.username, ws: ws})
			let clients = expressWs.getWss().clients
			let arr = []
			for (let i = 0; i < ws_notif_user.length; i++) {
				arr.push(ws_notif_user[i].username)
			}
			clients.forEach((client) => {
				client.send(JSON.stringify({ sender: "server", msg: "status", status: arr }))
			})
			ws.on('message', (message) => {
				try {
					let msg = JSON.parse(message)
					if (msg.msg != undefined && msg.sender != undefined && msg.receiver != undefined) {
						let clients = expressWs.getWss().clients
						clients.forEach((client) => {
							for (var i = 0; i < ws_notif_user.length; i++) {
								if (ws_notif_user[i].ws === client && ws_notif_user[i].username === msg.receiver
									&& (msg.msg === "like" || msg.msg === "dislike" || msg.msg === "match" || msg.msg === "message" || msg.msg === 'visite')) {
										db.collection('users').findOne({ username: msg.receiver }, (err, r) => {
											if (err) {}
											if (r.blocked.indexOf(msg.sender) == -1)
												client.send(JSON.stringify({ sender: msg.sender, msg: msg.msg }))
										})
									}
								}
							})
							db.collection("users").findOne({ username: msg.receiver }, (err, notif) => {
								if (err) {  }
								let notification = { username: msg.sender, message: msg.msg }
								if (notif && notif.blocked.indexOf(msg.sender) == -1) {
									if (notif.notification != undefined) {
										let arr = notif.notification
										let unread_notif = notif.unread_notif + 1
										arr.push(notification)
										db.collection("users").update({ username: msg.receiver}, { $set: { notification: arr, unread_notif: unread_notif } }, (err, status) => {
											if (err) {}
										})
									} else {
										let arr = []
										let unread_notif = notif.unread_notif + 1
										arr.push(notification)
										db.collection("users").update({ username: msg.receiver}, { $set: { notification: arr, unread_notif: unread_notif } }, (err, status) => {
											if (err) {}
										})
									}
								}
							})
						}
					} catch (e) {
						db.close()
					}
				})
				ws.on('close', () => {
					for (let i = ws_notif_user.length - 1; i >= 0; i--) {
						if (ws_notif_user[i].ws === ws) {
							let d = new Date()
							db.collection("users").update({ username: ws_notif_user[i].username }, { $set: { last_visite: ("0" + d.getDate()).slice(-2) + "-" + ("0"+(d.getMonth()+1)).slice(-2) + "-" +
							d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) }}, (err, r) => {
								if (err) {}
								db.close()
							})
							ws_notif_user.splice(i, 1)
						}
					}
					let clients = expressWs.getWss().clients
					let arr = []
					for (let i = 0; i < ws_notif_user.length; i++) {
						arr.push(ws_notif_user[i].username)
					}
					clients.forEach((client) => {
						client.send(JSON.stringify({ sender: "server", msg: "status", status: arr }))
					})
				})
			}
		},
		chat: async function (ws, req, sess, expressWs){
			ws_user.push({ username: sess.username, ws: ws})
			ws.on('message', (msg) => {
				try {
					let message = JSON.parse(msg)
					if (message.msg != "" && message.sender != "" && message.receiver != "") {
						let clients = expressWs.getWss("/tchat").clients
						clients.forEach((client) => {
							for (var i = 0; i < ws_user.length; i++) {
								if (ws_user[i].ws === client && (ws_user[i].username === message.sender || ws_user[i].username === message.receiver)) {
									if (message.sender !== "server")
										client.send(JSON.stringify( { sender: message.sender , msg: message.msg }))
								}
							}
						})
						func.update_chat_room(sess, message)
					}
				} catch (e) {
				}
			})
			ws.on('error', (e) => {

			})
			ws.on('close', () => {
				for(var i = ws_user.length - 1; i >= 0; i--) {
					if(ws_user[i].ws === ws) {
						ws_user.splice(i, 1);
					}
				}
			})
		}
	}
