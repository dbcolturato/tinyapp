const express = require("express");
const app = express();
const PORT = 8080;
const cookieParser = require('cookie-parser');

app.set("view engine", "ejs");
app.use(cookieParser());

//convert the request body from a Buffer into string that we can read
//It will then add the data to the req(request) object under the key body
const bodyParser = require("body-parser");
const { checkEmail, getUser } = require("./views/helpers");
app.use(bodyParser.urlencoded({ extended: true }));

//keeping track of all the URLs and their shortened forms
const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xk": "http://www.google.com"
};

const users = {
  "gdhdk6": {
    id: "gdhdk6",
    email: "bob@example.com",
    password: "foo"
  }
}

function generateRandomString() {
  return Math.random().toString(36).substring(2, 8);
}

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/urls", (req, res) => {
  const templatesVars = { urls: urlDatabase, user: users[req.cookies["user_id"]] };
  res.render("urls_index", templatesVars);
});

app.get("/urls/new", (req, res) => {
  const templatesVars = { user: users[req.cookies["user_id"]] };
  res.render("urls_new", templatesVars);
});

app.post("/urls", (req, res) => {
  let newShortURL = generateRandomString();
  urlDatabase[newShortURL] = req.body.longURL;
  res.redirect(`/urls/${newShortURL}`);
});

app.get("/urls/:shortURL", (req, res) => {
  const templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL], user: users[req.cookies["user_id"]] };
  res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];
  if (longURL) {
    res.redirect(longURL);
  }
  res.status(404).send(`Long URL not found for short URL '${req.params.shortURL}'`);
});

app.get("/register", (req, res) => {
  const templateVars = { user: users[req.cookies["user_id"]] };
  res.render("register", templateVars);
});

app.get("/login", (req, res) => {
  const templateVars = { user: users[req.cookies["user_id"]] };
  res.render("login", templateVars);
});

app.post("/register", (req, res) => {
  const id = generateRandomString();
  const { email, password } = req.body;

  if (checkEmail(users, email) || (email === "") || (password === "")) {
    res.status(400);
    res.send('Error');
  } else {
    res.cookie('user_id', id);
    users[id] = { id, email, password };
    res.redirect('/urls');
  }  
});

app.post('/urls/:shortURL/delete', (req, res) => {
  delete urlDatabase[req.params.shortURL];
  res.redirect('/urls');
});

app.post('/urls/:shortURL', (req, res) => {
  urlDatabase[req.params.shortURL] = req.body.longURL;
  res.redirect('/urls');
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const user = getUser(users, email, password);
  if (user) {
    res.cookie('user_id', user.id);    
    res.redirect('/urls');
  } else {
    res.status(403);
    res.send('Error');
  }
  
});

app.post('/logout', (req, res) => {
  res.clearCookie('user_id');
  res.redirect('/urls');
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});