const bcrypt = require('bcrypt');

const getUser = (dataBase, email, password) => {
  for (const user_id in dataBase) {
    const currentUser = dataBase[user_id];
    if (currentUser.email === email) {
      if (bcrypt.compareSync(password, currentUser.password)) { 
        return currentUser;
      }
    }
  }
  return null;
}

const getUserByEmail = (dataBase, email) => {
  for (const user_id in dataBase) {
    const currentUser = dataBase[user_id];
    if (currentUser.email === email) {
      return currentUser;
    }
  }
  return undefined;
}

const urlsForUser = (dataBase, id) => {
  let user_URLs = {};
  for (const db_id in dataBase) {
    if (dataBase[db_id].userID === id) {
      user_URLs[db_id] = dataBase[db_id];
    }
  }
  return user_URLs;
}

module.exports = { getUser, getUserByEmail, urlsForUser }