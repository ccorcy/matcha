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
const expressWs = require('express-ws')(app)
const wss = require('./ws.js')

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

app.get('/dislike', (req, res) => {
  sess = req.session
  let user_to_dislike = req.query.id
  if (user_to_dislike == undefined) {
    res.end("error user to dislike incorrect")
    return
  }
  if (routes.delete_match(sess, user_to_dislike) == 1 && routes.dislike(sess, user_to_dislike) == 1) {
    res.end("ok")
  } else {
    res.end("error")
  }
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

	if (req.body.age >= 18 && req.body.age <= 125
		&& (req.body.gender === "male"
			|| req.body.gender === "female" || req.body.gender === "other")
				&& (req.body.pref === "male" || req.body.pref === "female"
					|| req.body.pref === "other") && req.body.interest != ""
            && req.body.name != "" && regName.test(req.body.name) && req.body.surname != "" && regName.test(req.body.surname)
              && req.body.email != "" && regMail.test(req.body.email)
                && sess.username != undefined) {
			MongoClient.connect(urlDB, (err, db) => {
				if (err) throw err
        let interest = req.body.interest
        interest = interest.split(",")
				db.collection("users").update({ username: sess.username }, { $set: { name: req.body.name, surname: req.body.surname, email: req.body.email, age: req.body.age, gender: req.body.gender, pref: req.body.pref, interest: interest }} )
				res.send("ok")
				db.close()
			});
	} else {
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


app.listen(3000);
