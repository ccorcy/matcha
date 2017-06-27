const express = require('express');
const session = require('express-session');
const bodyparser = require('body-parser');
const MongoClient = require("mongodb").MongoClient;
const urlDB = "mongodb://localhost:27020/matchaDB";
const path = require('path')
const multer = require('multer');
const upload = multer();
const bcrypt = require('bcrypt');
const up = multer({ dest: 'public/pp/',
                    fileFilter: function (req, file, callback) {
                    var ext = path.extname(file.originalname);
                    if(ext !== '.png' && ext !== '.jpg' && ext !== '.gif' && ext !== '.jpeg') {
                        return callback()
                    }
                    callback(null, true)
                }});
const func = require("./utils.js")
const routes = require("./routes.js")
const favicon = require('serve-favicon')
const app = express()
const expressWs = require('express-ws')(app)
const wss = require('./ws.js')
const sendmail = require("sendmail")()
const iplocation = require('iplocation')
const geocoder = require('geocoder')

app.use(express.static(__dirname + '/public'));
app.use(session( { secret: 'ccorcymatcha',
 									 resave: true,
								 	 saveUninitialized: true }));
app.use( bodyparser.json() );
app.use(bodyparser.urlencoded({ extended: true }));
app.use(favicon(__dirname + '/public/favicon.ico'))
app.set('view engine', 'ejs');

let sess;
let ws_user = [];
let ws_notif_user = [];

app.get('/profile.html', (req,res) => {
  routes.profile(req, res, sess)
});

app.get('/register.html', (req,res) => {
	res.render('pages/register');
});

app.get('/', (req, res) => {
	routes.index(req, res, sess)
});

app.get('/like_page', (req, res) => {
	routes.like_page(req, res, sess)
});

app.get('/geoloc', (req, res) => {
  sess = req.session
  MongoClient.connect(urlDB, (err, db) => {
    if (err) throw err;
    if (req.query.status === "ok") {
      let lat = req.query.lat
      let lon = req.query.lon
      db.collection('users').update({ username: req.query.usr }, { $set: { lat: lat, lon: lon } }, (err, res) => {
        if (err) throw err;
      })
      geocoder.reverseGeocode(lat, lon, function (err, data) {
        if (err) throw err;
        db.collection('users').update({ username: req.query.usr }, { $set: { city: data.results[2].formatted_address } }, (err, r) => {
          if (err) throw err;
          res.send("ok")
          db.close()
        })
      })
    } else if (req.query.status === "ko") {
        iplocation(req.ip, function (error, res) {
          if (error) throw err;
          db.collection('users').update({ username: req.query.usr }, { $set: { city: res.city, lat: res.lat, lon: res.lon } }, (err, st) => {
            if (err) throw err;
            db.close()
            res.send("ok")
          })
        })
    } else if (req.query.status === 'modify') {
      geocoder.geocode(req.query.info, function (err, data) {
        if (err) throw err
        db.collection('users').update({ username: sess.username} , { $set :{ city: data.results[0].formatted_address, lat: data.results[0].geometry.location.lat, lon: data.results[0].geometry.location.lng } }, (err, r) => {
          if (err) throw err
          res.send('ok')
        })
      })
    } else {
      res.send('error')
    }
  })
})

app.get('/getgeoloc', (req, res) => {
  if (req.query.status === "ok") {
    let lat = req.query.lat
    let lon = req.query.lon
    geocoder.reverseGeocode(lat, lon, function (err, data) {
      if (err) throw err;
      res.send(data.results[2].formatted_address)
    })
  } else if (req.query.status === "ko") {
      iplocation(req.ip, function (error, res) {
        if (error) throw err;
        res.send(res.city)
      })
  } else {
    res.send('error')
  }
})

app.get('/update_pp', (req, res) => {
	routes.update_pp(req, res, sess)
})

app.get('/like', (req, res) => {
	routes.like(req, res, sess)
})

app.get('/match', (req, res) => {
  sess = req.session
  if (sess.username == undefined) {
      res.render("pages/index")
  } else {
    MongoClient.connect(urlDB, (err, db) => {
      if (err) throw err
      routes.match(req, res, sess, db)
    })
  }
})

app.get('/logout', (req, res) => {
	sess = req.session;
	sess.username = "";
	res.send("<script type='text/javascript'> document.location.replace('/'); </script>");
});

app.get('/login', (req, res) => {
  res.render('pages/login')
})

app.get('/tchat', (req, res) => {
  routes.tchat(req, res, sess)
})

app.get('/profile', (req, res) => {
  routes.user_profile(req, res, sess)
})

app.get('/history', (req, res) => {
    sess = req.session
    if (sess.username != undefined)
      routes.history(req, res, sess);
    else
      res.send("<center><h1>error 403</h1></center><br />access forbidden")
})

async function waitfordislike(res, sess, user_to_dislike) {
  let status = await routes.delete_match(sess, user_to_dislike)
  let status2 = await routes.dislike(sess,user_to_dislike)
  if (status == 1 ||  status2 == 1) {
    res.send("ok")
  } else {
    res.send("error")
  }
}

app.get('/dislike', (req, res) => {
  sess = req.session
  let user_to_dislike = req.query.id
  if (user_to_dislike == undefined) {
    res.end("error user to dislike incorrect")
    return
  }
  waitfordislike(res, sess, user_to_dislike)
})

app.get("/reset_password", (req, res) => {
    func.reset_password(req, res)
})

app.get("/last_log", (req, res) => {
    if (req.query.user != undefined) {
        func.last_login(req, res)
    } else {
        res.end("")
    }
})

app.get("/delete_notif", (req, res) => {
  sess = req.session
  MongoClient.connect(urlDB, (err, db) => {
    if (err) throw err;
    db.collection("users").update({ username: sess.username }, { $set: { notification: [] } })
  })
})

app.post('/login', upload.fields([]), (req, res) => {
	sess = req.session;
	MongoClient.connect(urlDB, (err, db) => {
		if (err) throw err;
		func.login(db, req.body, sess, res)
		db.close();
	});
});

app.post('/up_pics', up.single('profile_picture'), (req, res, next) => {
	routes.up_pics(req, res, sess)
});

app.post('/update_bio', upload.fields([]), (req, res) => {
	sess = req.session
	if (sess.username != undefined && req.body.bio !== "" && req.body.bio.length <= 250) {
		MongoClient.connect(urlDB, (err, db) => {
			if (err) throw err
			db.collection("users").update({ username: sess.username }, { $set: { bio: req.body.bio }} )
			res.send("ok")
			db.close()
		})
	} else {
		res.send("error")
	}
})

app.post('/finish_sub', upload.fields([]), (req, res) => {
	sess = req.session;
  let regName = /^[a-zA-Z\-]{2,}$/
  let regMail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  let regPwd = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/
  let st = false
  if (req.body.password != undefined && req.body.vpassword != undefined && sess.username != undefined) {
    if (regPwd.test(req.body.password)) {
      bcrypt.hash(req.body.password, 10, (err, res) => {
        if (err) throw err
        MongoClient.connect(urlDB, (err, db) => {
          db.collection('users').update({ username: sess.username }, { $set: { password: res } })
          st = true
        })
      })
    }
  }
	if (req.body.age >= 18 && req.body.age <= 125
		&& (req.body.gender === "male"
			|| req.body.gender === "female")
				&& (req.body.pref === "male" || req.body.pref === "female"
					|| req.body.pref === "other") && req.body.interest != ""
            && req.body.name != "" && regName.test(req.body.name) && req.body.surname != "" && regName.test(req.body.surname)
              && req.body.email != "" && regMail.test(req.body.email)
                && sess.username != undefined) {
			MongoClient.connect(urlDB, (err, db) => {
				if (err) throw err
        let interest = req.body.interest
        let arr = []
        interest = interest.replace(/ /g, '')
        interest = interest.replace(/\,$/, '');
        interest = interest.split(',')
        for (let i = 0; i < interest.length; i++) {
          if (arr.indexOf(interest[i]) == -1 && interest[i] !== '') {
            arr.push(interest[i])
          }
        }
				db.collection("users").update({ username: sess.username }, { $set: { name: req.body.name, surname: req.body.surname, email: req.body.email, age: req.body.age, gender: req.body.gender, pref: req.body.pref, interest: arr }} )
				res.send("ok")
        func.get_interest(arr)
				db.close()
			});
	} else {
    if (st)
      res.send('ok')
    else
			res.send("invalid request")
	}
})

app.post('/register', upload.fields([]), (req, res) => {
	let error = {
    "name": false,
    "surname": false,
		"username": false,
		"email": false,
		"password": false,
		"password_different": false
	};
	MongoClient.connect(urlDB, (err, db) => {
		func.register(db, req.body, res, error)
	})
});

app.ws('/chat', (ws, req) => {
  sess = req.session
  wss.chat(ws, req, sess, expressWs)
})

app.ws('/notif', (ws, req) => {
  sess = req.session
  MongoClient.connect(urlDB, (err, db) => {
    wss.notif(ws, req, sess, db, expressWs)
  })
})

app.get("*", (req, res) => {
  res.status(404).send("404 not found")
})

app.listen(3000);
