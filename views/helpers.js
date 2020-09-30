const getUser = (dataBase, email, password) => {
  for (const user_id in dataBase) {
    const currentUser = dataBase[user_id];
    if (currentUser.email === email) {
      if (currentUser.password === password) {
        return currentUser;
      }
    }
  }
  return null;
}

const checkEmail = (dataBase, email) => {
  for (const user_id in dataBase) {
    const currentUser = dataBase[user_id];
    if (currentUser.email === email) {
      return true; //email matching
    }
  }
  return false;
}

module.exports = { getUser, checkEmail }