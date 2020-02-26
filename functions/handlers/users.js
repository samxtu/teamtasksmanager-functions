const { db, admin } = require("../util/admin");
const firebase = require("firebase");
const firebaseConfig = require("../util/config");
const { isEmail, isEmpty, isEmptyNum } = require("../validators/helpers");

firebase.initializeApp(firebaseConfig);

const noImg = "noimage.png";

exports.signup = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    initial: req.body.initial,
    firstname: req.body.firstname,
    lastname: req.body.lastname,
    changeDuty: req.body.changeDuty,
    branch: req.body.branch,
    department: req.body.department,
    clearance: req.body.clearance,
    addUser: req.body.addUser,
    handle: req.body.handle,
    position: req.body.position,
  };
  let errors = {};
  let userId, token;
  if (req.user.addUser !== true)
    return res.status(401).json({ error: "Unauthorized" });

  if (req.user.onDuty == false)
    return res.status(401).json({ Error: "Unauthorized!" });

  if (req.body.addUser === true && req.user.clearance !== 10)
    return res.status(401).json({ error: "Unauthorized" });

  if (isEmpty(newUser.email)) errors.email = "Must not be empty!";
  else if (!isEmail(newUser.email)) errors.email = "Email is not valid!";

  if (isEmpty(newUser.password))
    errors.password = "Must be 6 characters or longer with no space!";
  if (newUser.password !== newUser.confirmPassword)
    errors.confirmPassword = "The passwords must match!";

  if (isEmpty(newUser.initial)) errors.initial = "Must not be empty!";
  if (isEmpty(newUser.firstname)) errors.firstname = "Must not be empty!";
  if (isEmpty(newUser.lastname)) errors.lastname = "Must not be empty!";
  if (isEmptyNum(newUser.clearance)) errors.clearance = "Must not be empty!";
  if (isEmpty(newUser.handle)) errors.handle = "Must not be empty!";

  if (Object.keys(errors).length > 0) return res.status(400).json(errors);

  db.doc(`/users/${newUser.handle}`)
    .get()
    .then(snap => {
      if (snap.exists) {
        return res.status(400).json({
          handle: `There is another registered ${newUser.handle}, if you are adding someone else change the username!`
        });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then(data => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then(tokeni => {
      token = tokeni;
      const userCreds = {
        handle: newUser.handle,
        email: newUser.email,
        initial: newUser.initial,
        firstname: newUser.firstname,
        lastname: newUser.lastname,
        changeDuty: newUser.changeDuty,
        onDuty: true,
        createdAt: new Date().toISOString(),
        department: newUser.department,
        clearance: newUser.clearance,
        addUser: newUser.addUser,
        position: newUser.position,
        branch: newUser.branch,
        COTAS: 0,
        COTAPIC: 0,
        CLAS: 0,
        CLAPIC: 0,
        DISCO: 0,
        OTAS: 0,
        OTAPIC: 0,
        FAS: 0,
        FAPIC: 0,
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${noImg}?alt=media`,
        userId
      };
      return db.doc(`/users/${userCreds.handle}`).set(userCreds);
    })
    .then(() => {
      return res.status(201).json({ token });
    })
    .catch(err => {
      console.error(err);
      if (err.code == "auth/email-already-in-use") {
        return res.status(400).json({ error: "Email already in use!" });
      } else {
        return res.status(500).json({ error: err.code });
      }
    });
};

exports.login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password
  };
  let errors = {};
  let reData = {
    company: {
      branches:[],
      departments:[]
    }
  };

  if (isEmpty(user.email)) errors.email = "Must not be empty!";
  else if (!isEmail(user.email)) errors.email = "Email format not correct!";
  if (isEmpty(user.password)) errors.password = "Must not be empty!";

  if (Object.keys(errors).length > 0) return res.status(403).json(errors);

firebase
  .auth()
  .signInWithEmailAndPassword(user.email, user.password)
  .then(data => {
    reData.token = data.user.getIdToken();
    return db.collection('company').get();
  })
  .then((comp)=>{
    comp.forEach(com=>{
      if(com.id === 'companyInfo') reData.company.info = com.data()
      if(com.id === 'branches') reData.company.branches = com.data().branches
      if(com.id === 'departments') reData.company.departments = com.data().departments
    })
    return true
  })
  .then(() => {
    return res.status(200).json({ data: reData });
  })
  .catch(err => {
    console.error(err);
    if (err.code === "auth/wrong-password")
      return res
        .status(403)
        .json({ general: "Incorrect credentials, please try again!" });
    else return res.status(500).json({ general: err.code });
  });
};

exports.uploadProfileImage = (req, res) => {
  const Busboy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");
  let imageFileName;
  let imageToUpload = {};

  const busboy = new Busboy({ headers: req.headers });

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    // check typr
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "Bad file type submitted!" });
    }
    let fileExtension = filename.split(".")[filename.split(".").length - 1];
    imageFileName = `${
      req.user.handle
    }${new Date().getTime()}.${fileExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToUpload = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToUpload.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToUpload.mimetype
          }
        }
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket.trim()}/o/${imageFileName}?alt=media`;
        return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
      })
      .then(() => {
        return res
          .status(200)
          .json({ message: "Image uploaded successfully!" });
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  });

  busboy.end(req.rawBody);
};

exports.allowAddingUsers = (req, res) => {
  if (req.user.clearance !== 10)
    return res.status(400).json({ Error: "Unauthorized!" });
  if (req.user.onDuty == false)
    return res.status(401).json({ Error: "Unauthorized!" });
  db.doc(`/users/${req.params.userHandle}`)
    .update({ addUser: true })
    .then(() => {
      return res
        .status(200)
        .json({ message: "Permission granted susccessfully!" });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.denyAddingUsers = (req, res) => {
  if (req.user.clearance !== 10)
    return res.status(400).json({ Error: "Unauthorized!" });
  if (req.user.onDuty == false)
    return res.status(401).json({ Error: "Unauthorized!" });
  db.doc(`/users/${req.params.userHandle}`)
    .update({ addUser: false })
    .then(() => {
      return res
        .status(200)
        .json({ message: "Permission revoked susccessfully!" });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.getAuthenticatedUser = (req, res) => {
  let resData = {};

  db.doc(`/users/${req.user.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        resData.credentials = doc.data();
        return db
          .collection(`users`)
          .doc(doc.id)
          .collection('notifications')
          .get();
      }
    })
    .then(returnedNots => {
      resData.notifications = [];
      returnedNots.forEach(not => {
        resData.notifications.push(not.data());
      });
      return res.status(200).json(resData);
    })
    .catch(err => {
      console.error(err);
      return res.status(400).json({ error: err.code });
    });
};

exports.changeOndutyStatus = (req, res) => {
  if (req.user.clearance !== 10 && req.user.changeDuty !== true)
    return res.status(401).json({ Error: "Unauthorized!" });
  if (req.user.onDuty == false)
    return res.status(401).json({ Error: "Unauthorized!" });
  let userRef = db.doc(`/users/${req.params.userHandle}`);
  let supTasks = [];
  let picTasks = [];
  db.collectionGroup("PIC")
    .where("handle", "==", req.params.userHandle)
    .get()
    .then(picsRef => {
      picsRef.forEach(picref => {
        picref.ref.parent.parent.get().then(taskref => {
          if (taskref.data().status === "ongoing") {
            picref.ref.parent.get().then(allpics => {
              if (allpics.size == 1) {
                picTasks.push({
                  title: taskref.data().title,
                  taskCreator: taskref.data().userHandle
                });
              }
            });
          }
        });
      });
      return;
    })
    .then(() => {
      db.collectionGroup("supervisors")
        .where("handle", "==", req.params.userHandle)
        .get()
        .then(supsRef => {
          supsRef.forEach(supRef => {
            supRef.ref.parent.parent.get().then(taskrefer => {
              if (taskrefer.data().status === "ongoing") {
                supRef.ref.parent.get().then(allsups => {
                  if (allsups.size == 1) {
                    supTasks.push(taskrefer.data().title);
                  }
                });
              }
            });
          });
        });
      return;
    })
    .then(() => {
      if (supTasks.length > 0 || picTasks.length > 0) {
        if (supTasks.length > 0) {
          db.collection("users")
            .doc(req.params.userHandle)
            .collection("messages")
            .doc()
            .set({
              userHandle: "system",
              imageUrl:
                "https://firebasestorage.googleapis.com/v0/b/team-tasks-manager.appspot.com/o/system.jpeg?alt=media",
              read: false,
              createdAt: new Date().toISOString(),
              body: `You can not go off duty with unsupervised ongoing tasks! Please add supervisors to the following tasks:\n
                    ${supTasks.forEach(spt => {
                      "==> " + spt + "\n";
                    })}`
            });
        }
        if (picTasks.length > 0) {
          picTasks.forEach(pictaskdata => {
            db.collection("users")
              .doc(pictaskdata.taskCreator)
              .collection("messages")
              .doc()
              .set({
                userHandle: "system",
                imageUrl:
                  "https://firebasestorage.googleapis.com/v0/b/team-tasks-manager.appspot.com/o/system.jpeg?alt=media",
                read: false,
                createdAt: new Date().toISOString(),
                body: `${
                  req.params.userHandle
                } can not go off duty with him/her in charge of ongoing tasks! Please add a person in charge to the following task:\n
                        ${"==>" + pictaskdata.title}`
              });
          });
        }
        return res
          .status(400)
          .json({ error: "User is on active (ongoing) tasks!" });
      } else {
        if (req.body.onDuty == false)
          return userRef.update({
            onDuty: req.body.onDuty,
            offDutyDeadline: req.body.deadline
          });
        else
          return userRef.update({
            onDuty: req.body.onDuty,
            offDutyDeadline: firebase.firestore.FieldValue.delete()
          });
      }
    })
    .then(() => {
      return res
        .status(200)
        .json({ message: "Permission granted susccessfully!" });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.sendMessage = (req, res) => {
  if (req.body.body && req.body.body.trim() == "")
    return res.status(400).json({ error: "Must not be empty!" });
  const newMessage = {
    userHandle: req.user.handle,
    imageUrl: req.user.imageUrl,
    body: req.body.body,
    createdAt: new Date().toISOString()
  };
  db.collection("users")
    .doc(req.params.userHandle)
    .collection("messages")
    .doc()
    .set(newMessage)
    .then(ref => {
      return res.status(200).json({
        messageId: ref.id,
        ...newMessage
      });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

