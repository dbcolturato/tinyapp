const express = require("express");
const app = express();
const PORT = 8080;
const cookieParser = require('cookie-parser');
var cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');

const saltRounds = 10;
app.set("view engine", "ejs");
app.use(cookieParser());

const bodyParser = require("body-parser");
const { getUserByEmail, getUser, urlsForUser } = require("./helpers");
app.use(bodyParser.urlencoded({ extended: true }));

// cookie session config
app.use(
  cookieSession({
    name: 'session',
    keys: [
      '032f2fc4-57de-41b1-a8cd-4f9323253715',
      '2746d050-24c2-4cc6-a173-3d03d66948a2',
    ],
  }),
);

//keeping track of all the URLs and their shortened forms
const urlDatabase = {
  "b2xVn2": { longURL: "http://www.lighthouselabs.ca", userID: "abcd5g" },
  "9sm5xk": { longURL: "http://www.google.com", userID: "gdhdk6" }
};

const users = {
  "gdhdk6": {
    id: "gdhdk6",
    email: "bob@example.com",
    password: "$2b$10$0.HPs2fNBjyV62iLOxCfbOsLFh3Ob90kOGL9ecldAWTLa2NIaXiQG" //foo
  },
  "abcd5g": {
    id: "abcd5g",
    email: "cloe@example.com",
    password: "$2b$10$WgQYHnv6bfRc3ZlkZfvtT.qEvUyKbEYCg3NMP1opTitjNjmVsp.7O" //boo
  }
}

function generateRandomString() {
  return Math.random().toString(36).substring(2, 8);
}

app.get("/", (req, res) => {
  const userID = req.session["user_id"];
  if (userID) {
    res.redirect('/urls');
  } else {
    res.redirect('/login');
  }
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/login", (req, res) => {
  const userID = req.session["user_id"];
  if (userID) {
    res.redirect('/urls');
  } else {
    const templateVars = { user: users[req.session["user_id"]] };
    res.render("login", templateVars);
  }
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const user = getUser(users, email, password);
  if (user) {
    req.session.user_id = user.id;
    res.redirect('/urls');
  } else {
    res.status(403);
    res.render("error", { user: null, message: "Bad credentials." });
  }
});

app.post('/logout', (req, res) => {
  req.session.user_id = null;
  res.redirect('/urls');
});

app.get("/register", (req, res) => {
  const userID = req.session["user_id"];
  if (userID) {
    res.redirect('/urls');
  } else {
    const templateVars = { user: users[req.session["user_id"]] };
    res.render("register", templateVars);
  }
});

app.post("/register", (req, res) => {
  const salt = bcrypt.genSaltSync(saltRounds);
  // Generate a random id
  const id = generateRandomString();
  const { email, password } = req.body;

  if (getUserByEmail(users, email)) {
    res.status(400);
    res.render("error", { user: null, message: "E-mail already in use." });
  } else if ((email === "") || (password === "")) {
    res.status(400);
    res.render("error", { user: null, message: "Invalid registration data." });
  } else {
    req.session.user_id = id;
    users[id] = { id, email, password: bcrypt.hashSync(password, salt) };
    res.redirect('/urls');
  }
});

app.get("/urls", (req, res) => {
  const filteredUrls = urlsForUser(urlDatabase, req.session["user_id"]);
  const user = users[req.session["user_id"]];

  if (user) {
    const templatesVars = { urls: filteredUrls, user: user };
    res.render("urls_index", templatesVars);
  } else {
    res.render("error", { user: null, message: "You need to be logged in to see the URLs." });
  }
});

app.post("/urls", (req, res) => {
  let newShortURL = generateRandomString();
  urlDatabase[newShortURL] = {};
  urlDatabase[newShortURL].longURL = req.body.longURL;
  urlDatabase[newShortURL].userID = req.session["user_id"];
  res.redirect(`/urls/${newShortURL}`);
});

app.get("/urls/new", (req, res) => {
  const templatesVars = { user: users[req.session["user_id"]] };
  if (req.session["user_id"]) {
    res.render("urls_new", templatesVars);
  } else {
    res.redirect("/login");
  }
});

app.get("/urls/:shortURL", (req, res) => {
  const userID = req.session["user_id"];
  if (!userID) {
    res.render("error", { user: null, message: "You need to be logged in to see the URLs." });
    return;
  }

  if (!urlDatabase[req.params.shortURL]) {
    res.render("error", { user: users[userID], message: "URL does not exist." });
    return;
  }

  const userUrls = urlsForUser(urlDatabase, userID);
  if (userUrls[req.params.shortURL]) {
    const templateVars = { shortURL: req.params.shortURL, longURL: userUrls[req.params.shortURL].longURL, user: users[userID] };
    res.render("urls_show", templateVars);
    return;
  }

  res.render("error", { user: users[userID], message: "You don't own the URL for the given ID." });
});

app.post('/urls/:shortURL/delete', (req, res) => {
  const userID = req.session["user_id"];
  if (userID) {
    const userUrls = urlsForUser(urlDatabase, userID);
    if (userUrls[req.params.shortURL]) {
      delete urlDatabase[req.params.shortURL];
      res.redirect('/urls');
      return;
    } else {
      res.render("error", { user: users[userID], message: "You don't own the URL for the given ID." });
    }
  }
  res.status(401).render("error", { user: null, message: "Unauthorized to delete URL." });
});

app.post('/urls/:shortURL', (req, res) => {
  const userID = req.session["user_id"];
  if (userID) {
    const userUrls = urlsForUser(urlDatabase, userID);
    if (userUrls[req.params.shortURL]) {
      urlDatabase[req.params.shortURL] = {};
      urlDatabase[req.params.shortURL].longURL = req.body.longURL;
      urlDatabase[req.params.shortURL].userID = userID;
      res.redirect('/urls');
      return;
    } else {
      res.render("error", { user: users[userID], message: "You don't own the URL for the given ID." });
    }
  }
  res.status(401).render("error", { user: null, message: "Unauthorized to delete URL." });
});

app.get("/u/:shortURL", (req, res) => {
  const url = urlDatabase[req.params.shortURL];
  if (url && url.longURL) {
    res.redirect(url.longURL);
    return;
  }
  res.render("error", { user: users[req.session["user_id"]], message: `Long URL not found for short URL "${req.params.shortURL}".` });
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});