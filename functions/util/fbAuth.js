const { db, admin }  = require('../util/admin');

module.exports = (req,res,next) =>{
    let idToken;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')){
        idToken = req.headers.authorization.split('Bearer ')[1];
    } else {
        console.error('No token found!');
        return res.status(403).json({ error: 'Unauthorized!' })
    }

    admin.auth().verifyIdToken(idToken)
    .then(decodedToken =>{
        req.user = decodedToken;
        return db.collection('users')
          .where('userId','==',req.user.uid)
          .limit(1)
          .get();
    })
    .then(data =>{
        req.user.handle = data.docs[0].data().handle;
        req.user.addUser = data.docs[0].data().addUser;
        req.user.clearance = data.docs[0].data().clearance;
        req.user.onDuty = data.docs[0].data().onDuty;
        req.user.changeDuty = data.docs[0].data().changeDuty;
        req.user.imageUrl = data.docs[0].data().imageUrl;
        return next();
    })
    .catch(err =>{
        console.error('Error while veryfying token!');
        return res.status(403).json(err);
    })
}