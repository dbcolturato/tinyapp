const express = require("express");
const app = express();
const PORT = 8080;
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');

const saltRounds = 10;
app.set("view engine", "ejs");
app.use(cookieParser());

//convert the request body from a Buffer into string that we can read
//It will then add the data to the req(request) object under the key body
const bodyParser = require("body-parser");
const { checkEmail, getUser, urlsForUser } = require("./views/helpers");
app.use(bodyParser.urlencoded({ extended: true }));

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
  const userID = req.cookies["user_id"];
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
  const templateVars = { user: users[req.cookies["user_id"]] };
  res.render("login", templateVars);
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const user = getUser(users, email, password);
  if (user) {
    res.cookie('user_id', user.id);
    res.redirect('/urls');
  } else {
    res.status(403);
    res.render("error", { user: null, message: "Bad credentials." });
  }
});

app.post('/logout', (req, res) => {
  res.clearCookie('user_id');
  res.redirect('/urls');
});

app.get("/register", (req, res) => {
  const templateVars = { user: users[req.cookies["user_id"]] };
  res.render("register", templateVars);
});

app.post("/register", (req, res) => {
  
  const salt = bcrypt.genSaltSync(saltRounds);
  // Generate a random id
  const id = generateRandomString();
  const { email, password } = req.body;

  if (checkEmail(users, email) || (email === "") || (password === "")) {
    res.status(400);
    res.render("error", { user: null, message: "Invalid registration data." });
  } else {
    res.cookie('user_id', id);
    users[id] = { id, email, password: bcrypt.hashSync(password, salt) };
    console.log(bcrypt.hashSync(password, salt));
    res.redirect('/urls');
  }
});

app.get("/urls", (req, res) => {
  const filteredUrls = urlsForUser(urlDatabase, req.cookies["user_id"]);
  const user = users[req.cookies["user_id"]];

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
  urlDatabase[newShortURL].userID = req.cookies["user_id"];
  res.redirect(`/urls/${newShortURL}`);
});

app.get("/urls/new", (req, res) => {
  const templatesVars = { user: users[req.cookies["user_id"]] };
  if (req.cookies["user_id"]) {
    res.render("urls_new", templatesVars);
  } else {
    res.redirect("/login");
  }
});

app.get("/urls/:shortURL", (req, res) => {
  const userID = req.cookies["user_id"];
  if (userID) {
    const userUrls = urlsForUser(urlDatabase, userID);
    if (userUrls[req.params.shortURL]) {
      const templateVars = { shortURL: req.params.shortURL, longURL: userUrls[req.params.shortURL].longURL, user: users[userID] };
      res.render("urls_show", templateVars);
      return;
    }
  }

  res.render("error", { user: null, message: "You need to be logged in to see the URLs." });
});

app.post('/urls/:shortURL/delete', (req, res) => {
  const userID = req.cookies["user_id"];
  if (userID) {
    const userUrls = urlsForUser(urlDatabase, userID);
    if (userUrls[req.params.shortURL]) {
      delete urlDatabase[req.params.shortURL];
      res.redirect('/urls');
      return;
    }
  }

  res.status(401).send("Unauthorized to delete URL");
});

app.post('/urls/:shortURL', (req, res) => {
  const userID = req.cookies["user_id"];
  if (userID) {
    const userUrls = urlsForUser(urlDatabase, userID);
    if (userUrls[req.params.shortURL]) {
      urlDatabase[req.params.shortURL] = {};
      urlDatabase[req.params.shortURL].longURL = req.body.longURL;
      res.redirect('/urls');
      return;
    }
  }

  res.status(401).send("Unauthorized to edit URL");
});

app.get("/u/:shortURL", (req, res) => {

  const longURL = urlDatabase[req.params.shortURL].longURL;
  if (longURL) {
    res.redirect(longURL);
  }

  res.status(404).send(`Long URL not found for short URL '${req.params.shortURL}'`);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});