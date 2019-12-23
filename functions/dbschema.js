
let db = {
    tasks: [
        {
            userHandle: 'user',
            title: 'This is body',
            details: 'This is body',
            createdAt: 'ISO string()',
            deadline: 'ISO string()',
            parentId: 'gfhhgjfyrt76ughbn',
            parentStatus: 'completed',
            parentStatusApproval: false,
            commentCount: 0,
            childrenCount: 0,
            PICCount: 1,
            filesCount: 1,
            responseCount: 0,
            supervisorsCount: 1,
            status: 'ongoing',
            supervisors: [
                {
                    email: 'sssseeee@sss.ccco',
                    handle: 'handle',
                    imageUrl,
                    userId: 'SWCDKODKDKDD8UCJJCJCCNC',
                    department: 'He is the strongest blah blah',
                    jobTitle: 'blahblah'
                },
                {
                    createdAt: "2019-07-19T14:35:54.308Z",
                    email: 'sssseeee@sss.ccco',
                    handle: 'handle',
                    imageUrl,
                    userId: 'SWCDKODKDKDD8UCJJCJCCNC',
                    bio: 'He is the strongest blah blah',
                    website: 'http://blahblah.com',
                    location: 'Iringa tz'
                }
            ],
            PIC: [
                {
                    createdAt: "2019-07-19T14:35:54.308Z",
                    email: 'sssseeee@sss.ccco',
                    handle: 'handle',
                    imageUrl,
                    userId: 'SWCDKODKDKDD8UCJJCJCCNC',
                    bio: 'He is the strongest blah blah',
                    website: 'http://blahblah.com',
                    location: 'Iringa tz'
                },
                {
                    createdAt: "2019-07-19T14:35:54.308Z",
                    email: 'sssseeee@sss.ccco',
                    handle: 'handle',
                    imageUrl,
                    userId: 'SWCDKODKDKDD8UCJJCJCCNC',
                    bio: 'He is the strongest blah blah',
                    website: 'http://blahblah.com',
                    location: 'Iringa tz'
                }
            ],
            documents:[
                {
                    originalname: "chem.jpg",
                    mimetype: "image/jpeg",
                    size: 148650,
                    filepath: "/tmp/chem.jpg",
                    createdAt: "2019-12-05T01:28:43.876Z",
                    url: "https://firebasestorage.googleapis.com/v0/b/team-tasks-manager.appspot.com/o/chem.jpg?alt=media"
                }
            ],
            comments: [
                {
                    userHandle: "user",
                    body: "Something I said",
                    createdAt: "ISO string",
                    imageUrl: 'fgfggfvgh'
                }
            ]
        }
    ],
    taskResponse:[
        {
            createdAt:'',
            userHandle:'',
            imageUrl:'',
            title:'',
            details:'',
            priority:'urgent',
            commentCount: 0,
            filesCount: 2,
            responseCount: 2,
            documents:[
                {
                    originalname: "chem.jpg",
                    mimetype: "image/jpeg",
                    size: 148650,
                    filepath: "/tmp/chem.jpg",
                    createdAt: "2019-12-05T01:28:43.876Z",
                    url: "https://firebasestorage.googleapis.com/v0/b/team-tasks-manager.appspot.com/o/chem.jpg?alt=media"
                }
            ],
            comments:[
                {
                    userHandle: "user",
                    body: "Something I said",
                    createdAt: "ISO string",
                    imageUrl: 'fgfggfvgh'
                }
            ]
        }
    ],
    users: [
        handle,
        {
            createdAt: "2019-07-19T14:35:54.308Z",
            email: 'sssseeee@sss.ccco',
            handle: 'handle',
            userId: 'SWCDKODKDKDD8UCJJCJCCNC',
            initial: "newUser.initial",
            firstname: "newUser.firstname",
            lastname: "newUser.lastname",
            changeDuty: false,
            onDuty: true,
            createdAt: new Date().toISOString(),
            department: "Somedepartment",
            clearance: 10,
            addUser: false,
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
        }
    ]
}

//03:25:41

// Redux data
addUserDetails = [
    credentials = {
        userId: 'SDD345RE45RFDGTLRE',
        email: 'something@email.com',
        handle: 'user',
        createdAt: 'ISOstring',
        imageUrl,
        bio:'something biod',
        website: 'www.something.com',
        location: 'London UK'
    },
    likes = {
        userHandle: 'user',
        screamId: '34RE4TDFRREFR'
    },{
        userHandle: 'user',
        screamId: '34RE4TDFRREFR'
    }
]




//some might need it
exports.postTask = (req, res) => {
  
    if(req.user.onDuty == false) {
      req.files.forEach(file => {
        admin
          .storage()
          .bucket()
          .file(file.tempName)
          .delete();
      });
      return res.status(401).json({ Error: "Unauthorized!" });
    }
    if (req.body.title.trim() == "") {
      req.files.forEach(file => {
        admin
          .storage()
          .bucket()
          .file(file.tempName)
          .delete();
      });
      return res.status(400).json({ title: "Must not be empty!" });
    }
    if (req.body.deadline.trim() == "") {
      req.files.forEach(file => {
        admin
          .storage()
          .bucket()
          .file(file.tempName)
          .delete();
      });
      return res.status(400).json({ deadline: "Must not be empty!" });
    }
    if (req.body.PIC.length == 0) {
      req.files.forEach(file => {
        admin
          .storage()
          .bucket()
          .file(file.tempName)
          .delete();
      });
      return res
        .status(400)
        .json({ PIC: "A task must have a person in charge!" });
    }
  
    if (req.body.parentId) {
      db.doc(`/tasks/${req.body.parentId}`)
        .get()
        .then(taskReference => {
          if (!taskReference.exists)
            return res
              .status(404)
              .json({ error: "The parent task can not be accessed (deleted)!" });
          else {
            if (taskReference.data().status != "ongoing") {
              return res
                .status(404)
                .json({
                  error:
                    "This task is not active, try changing status to 'ongoing'!"
                });
            } else
              taskReference.ref.update({
                childrenCount: taskReference.data().childrenCount + 1
              });
          }
        });
    }
    let feed = {};
  
    const newTask = {
      userHandle: req.user.handle,
      parentId: req.body.parentId,
      imageUrl: req.user.imageUrl,
      createdAt: new Date().toISOString(),
      deadline: req.body.deadline,
      title: req.body.title,
      details: req.body.details,
      status: req.body.status,
      commentCount: 0,
      childrenCount: 0,
      PICCount: req.body.PIC.length,
      filesCount: req.files.length,
      responseCount: 0,
      supervisorsCount: req.body.supervisors.length
    };
  
    const PICS = [];
    req.body.PIC.forEach(PIC => {
      PICS.push({
        createdAt: new Date().toISOString(),
        ...PIC
      });
    });
  
    const supervisors = [];
    req.body.supervisors.forEach(supervisor => {
      supervisors.push({
        createdAt: new Date().toISOString(),
        ...supervisor
      });
    });
  
    const files = req.files;
    let batches = [];
    let batchCounter = 0;
  
    if (req.files.length > 0) {
      db.collection("tasks")
        .add(newTask)
        .then(feedback => {
          feed = feedback;
          supervisors.forEach((sup) => {
                  db.doc(`/users/${sup.handle}`).update({ OAS: admin.firestore.FieldValue.increment(1) })
                  db
                    .collection("tasks")
                    .doc(feedback.id)
                    .collection("supervisors")
                    .doc().set(sup);
          });
          PICS.forEach((pc, j) => {
                  db.doc(`/users/${pc.handle}`).update({ OAPIC: admin.firestore.FieldValue.increment(1) });
                  db
                        .collection("tasks")
                        .doc(feedback.id)
                        .collection("PIC")
                        .doc().set(pc);
          });
          req.files.forEach((fl, k) => {
            batches[batchCounter] = db.batch()
            batches[batchCounter].set(
              db
                .collection("tasks")
                .doc(feedback.id)
                .collection("files")
                .doc(), fl);
                batchCounter = batchCounter + 1;
          });
          return true;
        })
        .then(() => {
          return res.json({
            taskId: feed.id,
            PIC: PICS,
            supervisors: supervisors,
            files: files,
            ...newTask
          });
        })
        .catch(err => {
          res.status(500).json({ error: err.code });
          console.error(err);
        });
    } else {
      db.collection("tasks")
        .add(newTask)
        .then(feedback => {
          feed = feedback;
          
          supervisors.forEach((sup) => {
            db.doc(`/users/${sup.handle}`).update({ OAS: admin.firestore.FieldValue.increment(1) })
            db
              .collection("tasks")
              .doc(feedback.id)
              .collection("supervisors")
              .doc().set(sup);
    });
    PICS.forEach((pc, j) => {
            db.doc(`/users/${pc.handle}`).update({ OAPIC: admin.firestore.FieldValue.increment(1) });
            db
                  .collection("tasks")
                  .doc(feedback.id)
                  .collection("PIC")
                  .doc().set(pc);
    });
          return null;
        })
        .then(() => {
          return res.json({
            taskId: feed.id,
            PIC: PICS,
            supervisors: supervisors,
            files: [],
            ...newTask
          });
        })
        .catch(err => {
          res.status(500).json({ error: "The request was not a success!" });
          console.error(err);
        });
    }
  };