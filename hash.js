import bcrypt from 'bcrypt';

const password = 'admin123'; // Replace with your desired password
const saltRounds = 12;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) throw err;
  console.log('Hashed password:', hash);
});