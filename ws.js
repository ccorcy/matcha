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
      ws.on('message', (message) => {
        try {
          let msg = JSON.parse(message)
          let clients = expressWs.getWss().clients
          clients.forEach((client) => {
            for (var i = 0; i < ws_notif_user.length; i++) {
              if (ws_notif_user[i].ws === client && ws_notif_user[i].username === msg.receiver
                && (msg.msg === "like" || msg.msg === "dislike" || msg.msg === "match" || msg.msg === "message" || msg.msg === 'visite')) {
                  client.send(JSON.stringify({ sender: msg.sender, msg: msg.msg }))
              }
            }
          })
          db.collection("users").findOne({ username: msg.receiver }, (err, notif) => {
            let notification = { username: msg.sender, message: msg.msg}
            if (notif) {
              if (notif.notification != undefined) {
                let arr = notif.notification
                arr.push(notification)
                db.collection("users").update({ username: msg.receiver}, { $set: { notification: arr }}, (err, status) => {
                  db.close()
                })
              } else {
                let arr = []
                arr.push(notification)
                db.collection("users").update({ username: msg.receiver}, { $set: { notification: arr }}, (err, status) => {
                  db.close()
                })
              }
            }
          })
        } catch (e) {
          console.log(e)
        }
      })
      ws.on('close', () => {
        for (let i = ws_notif_user.length - 1; i >= 0; i--) {
          if (ws_notif_user[i].ws === ws) {
            ws_notif_user.splice(i, 1)
          }
        }
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
                  client.send(JSON.stringify( { sender: message.sender , msg: message.msg }))
                }
              }
            })
            func.update_chat_room(sess, message)
          }
      } catch (e) {
        console.log(e)
      }
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
