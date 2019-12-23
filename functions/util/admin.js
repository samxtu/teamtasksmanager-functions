const admin = require('firebase-admin');

// const resit = require('../../gitignore.json');
// admin.initializeApp({
//     credential: admin.credential.cert(resit),
//     storageBucket: "team-tasks-manager.appspot.com"
// });
admin.initializeApp();

const db = admin.firestore();

module.exports = { admin, db };

