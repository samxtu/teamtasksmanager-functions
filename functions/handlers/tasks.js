const { db, admin } = require("../util/admin");
const firebase_tools = require("firebase-tools");
const { getTask }  = require("../util/taskGetter");

exports.postTask = (req, res) => {
  if (req.user.onDuty == false) {
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
            return res.status(404).json({
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
        supervisors.forEach(sup => {
          batches[batchCounter] = db.batch();
          batches[batchCounter].update(db.doc(`/users/${sup.handle}`), {
            OAS: admin.firestore.FieldValue.increment(1)
          });
          batchCounter = batchCounter + 1;
          batches[batchCounter] = db.batch();
          batches[batchCounter].set(
            db
              .collection("tasks")
              .doc(feedback.id)
              .collection("supervisors")
              .doc(),
            sup
          );
          batchCounter = batchCounter + 1;
        });
        PICS.forEach((pc, j) => {
          batches[batchCounter] = db.batch();
          batches[batchCounter].update(db.doc(`/users/${pc.handle}`), {
            OAPIC: admin.firestore.FieldValue.increment(1)
          });
          batchCounter = batchCounter + 1;
          batches[batchCounter] = db.batch();
          batches[batchCounter].set(
            db
              .collection("tasks")
              .doc(feedback.id)
              .collection("PIC")
              .doc(),
            pc
          );
          batchCounter = batchCounter + 1;
        });
        req.files.forEach((fl, k) => {
          batches[batchCounter] = db.batch();
          batches[batchCounter].set(
            db
              .collection("tasks")
              .doc(feedback.id)
              .collection("files")
              .doc(),
            fl
          );
          batchCounter = batchCounter + 1;
        });
      })
      .then(() => {
        for (var i = 0; i < batches.length; i++) {
          batches[i].commit().then(function() {
            console.count("wrote batch");
          });
        }
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
        supervisors.forEach(sup => {
          db.doc(`/users/${sup.handle}`)
            .get()
            .then(uref => {
              batches[batchCounter] = db.batch();
              batches[batchCounter].update(uref.ref, {
                OAS: uref.data().OAS + 1
              });
              batchCounter++;
            });
          batches[batchCounter] = db.batch();
          batches[batchCounter].set(
            db
              .collection("tasks")
              .doc(feedback.id)
              .collection("supervisors")
              .doc(),
            sup
          );
          batchCounter++;
        });
        PICS.forEach((pc, j) => {
          db.doc(`/users/${pc.handle}`)
            .get()
            .then(picref => {
              batches[batchCounter] = db.batch();
              batches[batchCounter].update(picref.ref, {
                OAPIC: picref.data().OAPIC + 1
              });
              batchCounter++;
            });
          batches[batchCounter] = db.batch();
          batches[batchCounter].set(
            db
              .collection("tasks")
              .doc(feedback.id)
              .collection("PIC")
              .doc(),
            pc
          );
          batchCounter++;
        });
        return null;
      })
      .then(() => {
        batches.forEach(batch => {
          batch.commit();
        });
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

exports.getTask = (req, res) => {
  let authorized = false;
  let taskfeed = {}
  db.collection("tasks").doc(req.params.taskId).collection("PIC").get()
  .then(PICS =>{
    PICS.forEach(pic=>{
      if(pic.data().handle == req.user.handle) authorized = true;
    })
    return db.collection("tasks").doc(req.params.taskId).collection("supervisors").get()
  })
  .then(sups=> {
    sups.forEach(sup => {
      if(sup.data().handle == req.user.handle) authorized = true;
    })
    return authorized;
  })
  .then(auth => {
    console.log(auth)
    if(authorized == false) return res.status(403).json({ error: "Unauthorized!" })
    return db.collection("tasks").doc(req.params.taskId).get()
  })
  .then(async taskRefData=>{
    let taskfeed = await getTask(taskRefData.id,taskRefData.data().status)
    return taskfeed
  })
  .then((task)=>{
    console.log(task)
    return res.status(200).json(task)
  })
  .catch(err => {
    console.error(err)
    return res.status(500).json({ error: err.code })
  })
}

exports.getTasks = (req, res) => {
  let myTasks = []
  db
    .collectionGroup("PIC")
    .where("handle","==",req.user.handle)
    .get()
    .then((picsRef)=>{
      picsRef.forEach(picref => {
        new Promise(async (resolve, reject) => {
            await getTask(picref.ref.parent.parent.id, req.params.taskStatus)
            .then((value) => {
              if(value){
                  myTasks.push(value)
              }
              resolve (value)
            })
            .catch(error =>{
                console.error(error)
                return res.status(500).json({ error: "Something went wrong" })
            })
          })
      })
      return  db
      .collectionGroup("supervisors")
      .where("handle","==",req.user.handle)
      .get()
  })
  .then((supsRef)=>{
    supsRef.forEach(supref => {
      new Promise(async (resolve, reject) => {
          await getTask(supref.ref.parent.parent.id, req.params.taskStatus)
          .then((value) => {
            if(value){
                myTasks.push(value)
            }
            resolve (value)
          })
          .catch(error =>{
              console.error(error)
              return res.status(500).json({ error: "Something went wrong" })
          })
        })
    })
    return true
  })
  .then(()=>{
    return res.status(200).json({ [req.params.taskStatus+' tasks']: myTasks })
  })
} 

exports.addPICS = (req, res) => {
  if (req.user.onDuty == false)
    return res.status(401).json({ Error: "Unauthorized!" });
  if (req.body.PICS.length < 1)
    return response.status(400).json({ error: "No user was selected! " });
  let reqArray = [];
  req.body.PICS.forEach(picdata => {
    reqArray.push(new Promise((resolve, reject) => {
    db.collection("tasks")
      .doc(req.params.taskId)
      .collection("PIC")
      .doc()
      .set(picdata)
      .then(() => {
        return resolve(true)
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
    }))
  });
  Promise.all(reqArray).then(()=>{
    return res.status(200).json({ message: 'PICS added successfully!'});
  })
};

exports.addSupervisors = (req, res) => {
  if (req.user.onDuty == false)
    return res.status(401).json({ Error: "Unauthorized!" });
  if (req.body.supervisors.length < 1)
    return response.status(400).json({ error: "No user was selected! " });
  let reqArray = [];
  req.body.supervisors.forEach(supdata => {
    reqArray.push(new Promise((resolve, reject) => {
    db.collection("tasks")
      .doc(req.params.taskId)
      .collection("supervisors")
      .doc()
      .set(supdata)
      .then(() => {
        return res.status(200).json(supdata);
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
    }))
  });
  Promise.all(reqArray).then(()=>{
    return res.status(200).json({ message: 'Supervisors added successfully!'});
  })
};

exports.removeSupervisors = (req, res) => {
  if (req.user.onDuty == false)
    return res.status(401).json({ Error: "Unauthorized!" });
  if (req.body.supervisors.length < 1)
    return response.status(400).json({ error: "No user was selected! " });
    let reqArray = [];
  req.body.supervisors.forEach(supdata => {
    reqArray.push(new Promise((resolve, reject) => {
    if (req.user.handle == supdata.handle)
      return response
        .status(400)
        .json({ error: "User is a mandatory supervisor in this task! :"+supdata.handle });
    db.collection("tasks")
      .doc(req.params.taskId)
      .collection("supervisors")
      .doc(supdata.id)
      .delete()
      .then(() => {
        return res.status(200).json({ message: "successful!" });
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
    }))
  });
  Promise.all(reqArray).then(()=>{
    return res.status(200).json({ message: 'Supervisors removed successfully!'});
  })
};

exports.removePICS = (req, res) => {
  if (req.user.onDuty == false)
    return res.status(401).json({ Error: "Unauthorized!" });
  if (req.body.PICS.length < 1)
    return res.status(400).json({ error: "No user was selected! " });
    let reqArray = [];
  req.body.PICS.forEach(picdata => {
    reqArray.push(new Promise((resolve, reject) => {
    if (req.user.handle == picdata.handle)
      return res
        .status(400)
        .json({ error: "This user is a mandatory supervisor in this task! " });
    db.collection("tasks")
      .doc(req.params.taskId)
      .collection("PIC")
      .doc(picdata.id)
      .delete()
      .then(() => {
        return res.status(200).json({ message: "successful!" });
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
    }))
  });
  Promise.all(reqArray).then(()=>{
    return res.status(200).json({ message: 'PICS removed successfully!'});
  })
};

exports.postTaskResponse = (req, res) => {
  if (req.user.onDuty == false) {
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
  if (req.body.taskId) {
    db.doc(`/tasks/${req.body.taskId}`)
      .get()
      .then(taskReference => {
        if (!taskReference.exists)
          return res
            .status(404)
            .json({ error: "The task can not be accessed (deleted)!" });
        else {
          if (taskReference.data().status != "ongoing") {
            return res.status(404).json({
              error:
                "This task is not active, try changing status to 'ongoing'!"
            });
          } else
            taskReference.ref.update({
              responseCount: taskReference.data().responseCount + 1
            });
        }
      });
  }
  let feed = {};
  const newResponse = {
    userHandle: req.user.handle,
    imageUrl: req.user.imageUrl,
    createdAt: new Date().toISOString(),
    priority: req.body.priority,
    title: req.body.title,
    details: req.body.details,
    commentCount: 0,
    responseCount: 0
  };

  const files = req.files;
  let batch = db.batch();

  if (req.files.length > 0) {
    db.collection("tasks")
      .doc(req.body.taskId)
      .collection("taskResponses")
      .add(newResponse)
      .then(feedback => {
        feed = feedback;
        let fileRef = [];
        req.files.forEach((fl, k) => {
          fileRef.push(
            db
              .collection("tasks")
              .doc(req.body.taskId)
              .collection("taskResponses")
              .doc(feedback.id)
              .collection("files")
              .doc()
          );
          batch.set(fileRef[k], fl);
        });
        return batch.commit();
      })
      .then(() => {
        return res.json({
          taskId: req.body.taskId,
          taskResponseId: feed.id,
          files: files,
          ...newResponse
        });
      })
      .catch(err => {
        res.status(500).json({ error: err.code });
        console.error(err);
      });
  } else {
    db.collection("tasks")
      .doc(req.body.taskId)
      .collection("taskResponses")
      .add(newResponse)
      .then(feedback => {
        return res.json({
          taskId: req.body.taskId,
          taskResponseId: feedback.id,
          files: [],
          ...newResponse
        });
      })
      .catch(err => {
        res.status(500).json({ error: "The request was not a success!" });
        console.error(err);
      });
  }
};

exports.postResponseResponse = (req, res) => {
  if (req.user.onDuty == false) {
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
  if (req.body.taskId) {
    db.doc(`/tasks/${req.body.taskId}`)
      .get()
      .then(taskReference => {
        if (!taskReference.exists)
          return res
            .status(404)
            .json({ error: "The parent task can not be accessed (deleted)!" });
        else {
          if (taskReference.data().status != "ongoing") {
            return res.status(404).json({
              error:
                "This task is not active, try changing status to 'ongoing'!"
            });
          } else {
          }
        }
      });
  }
  if (req.body.taskResponseId) {
    db.collection("tasks")
      .doc(req.body.taskId)
      .collection("taskResponses")
      .doc(req.body.taskResponseId)
      .get()
      .then(taskRef => {
        if (!taskRef.exists)
          return res
            .status(404)
            .json({ error: "The response can not be accessed (deleted)!" });
        else
          taskRef.ref.update({
            responseCount: taskRef.data().responseCount + 1
          });
      });
  }
  let feed = {};
  const newReresponse = {
    userHandle: req.user.handle,
    imageUrl: req.user.imageUrl,
    createdAt: new Date().toISOString(),
    priority: req.body.priority,
    title: req.body.title,
    details: req.body.details,
    commentCount: 0
  };

  const files = req.files;
  let batch = db.batch();

  if (req.files.length > 0) {
    db.collection("tasks")
      .doc(req.body.taskId)
      .collection("taskResponses")
      .doc(req.body.taskResponseId)
      .collection("responses")
      .add(newReresponse)
      .then(feedback => {
        feed = feedback;
        let fileRef = [];
        req.files.forEach((fl, k) => {
          fileRef.push(
            db
              .collection("tasks")
              .doc(req.body.taskId)
              .collection("taskResponses")
              .doc(req.body.taskResponseId)
              .collection("responses")
              .doc(feedback.id)
              .collection("files")
              .doc()
          );
          batch.set(fileRef[k], fl);
        });
        return batch.commit();
      })
      .then(() => {
        return res.json({
          taskId: req.body.taskId,
          taskResponseId: req.body.taskResponseId,
          responseResponseId: feed.id,
          files: files,
          ...newReresponse
        });
      })
      .catch(err => {
        res.status(500).json({ error: err.code });
        console.error(err);
      });
  } else {
    db.collection("tasks")
      .doc(req.body.taskId)
      .collection("taskResponses")
      .doc(req.body.taskResponseId)
      .collection("responses")
      .add(newReresponse)
      .then(feedback => {
        return res.json({
          taskId: req.body.taskId,
          taskResponseId: taskResponseId,
          responseResponseId: feedback.id,
          files: [],
          ...newReresponse
        });
      })
      .catch(err => {
        res.status(500).json({ error: "The request was not a success!" });
        console.error(err);
      });
  }
};

exports.postCommentToTask = (req, res) => {
  if (req.user.onDuty == false)
    return res.status(401).json({ Error: "Unauthorized!" });
  if (req.body.body.trim() == "")
    return res.status(400).json({ error: "Must not be empty!" });

  let newComment = {
    body: req.body.body.trim(),
    userHandle: req.user.handle,
    createdAt: new Date().toISOString(),
    imageUrl: req.user.imageUrl
  };
  db.doc(`/tasks/${req.body.taskId}`)
    .get()
    .then(document => {
      if (!document.exists)
        return res.status(404).json({ error: "Task not found!" });
      else {
        if (document.data().status != "ongoing")
          return res.status(404).json({
            error: "This task is not active, try changing status to 'ongoing'!"
          });
      }
      return document.ref.update({
        commentCount: document.data().commentCount + 1
      });
    })
    .then(() => {
      return db
        .collection("tasks")
        .doc(req.body.taskId)
        .collection("comments")
        .add(newComment);
    })
    .then(addedComment => {
      return res.json({
        commentId: addedComment.id,
        taskId: req.body.taskId,
        ...newComment
      });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.postCommentToTaskResponse = (req, res) => {
  if (req.user.onDuty == false)
    return res.status(401).json({ Error: "Unauthorized!" });
  if (req.body.body.trim() == "")
    return res.status(400).json({ error: "Must not be empty!" });

  if (req.body.taskId) {
    db.doc(`/tasks/${req.body.taskId}`)
      .get()
      .then(taskReference => {
        if (!taskReference.exists)
          return res
            .status(404)
            .json({ error: "The parent task can not be accessed (deleted)!" });
        else {
          if (taskReference.data().status != "ongoing") {
            return res.status(404).json({
              error:
                "This task is not active, try changing status to 'ongoing'!"
            });
          } else {
          }
        }
      });
  }
  let newComment = {
    body: req.body.body.trim(),
    userHandle: req.user.handle,
    createdAt: new Date().toISOString(),
    imageUrl: req.user.imageUrl
  };
  db.collection("tasks")
    .doc(req.body.taskId)
    .collection("taskResponses")
    .doc(req.body.taskResponseId)
    .get()
    .then(document => {
      if (!document.exists)
        return res.status(404).json({ error: "Response not found!" });
      return document.ref.update({
        commentCount: document.data().commentCount + 1
      });
    })
    .then(() => {
      return db
        .collection("tasks")
        .doc(req.body.taskId)
        .collection("taskResponses")
        .doc(req.body.taskResponseId)
        .collection("comments")
        .add(newComment);
    })
    .then(addedComment => {
      return res.json({
        commentId: addedComment.id,
        taskId: req.body.taskId,
        taskResponseId: req.body.taskResponseId,
        ...newComment
      });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.postCommentToResponseResponse = (req, res) => {
  if (req.user.onDuty == false)
    return res.status(401).json({ Error: "Unauthorized!" });
  if (req.body.body.trim() == "")
    return res.status(400).json({ error: "Must not be empty!" });

  if (req.body.taskId) {
    db.doc(`/tasks/${req.body.taskId}`)
      .get()
      .then(taskReference => {
        if (!taskReference.exists)
          return res
            .status(404)
            .json({ error: "The parent task can not be accessed (deleted)!" });
        else {
          if (taskReference.data().status != "ongoing") {
            return res.status(404).json({
              error:
                "This task is not active, try changing status to 'ongoing'!"
            });
          } else {
          }
        }
      });
  }
  let newComment = {
    body: req.body.body.trim(),
    userHandle: req.user.handle,
    createdAt: new Date().toISOString(),
    imageUrl: req.user.imageUrl
  };
  db.collection("tasks")
    .doc(req.body.taskId)
    .collection("taskResponses")
    .doc(req.body.taskResponseId)
    .collection("responses")
    .doc(req.body.responseResponseId)
    .get()
    .then(document => {
      if (!document.exists)
        return res.status(404).json({ error: "Response not found!" });
      return document.ref.update({
        commentCount: document.data().commentCount + 1
      });
    })
    .then(() => {
      return db
        .collection("tasks")
        .doc(req.body.taskId)
        .collection("taskResponses")
        .doc(req.body.taskResponseId)
        .collection("responses")
        .doc(req.body.responseResponseId)
        .collection("comments")
        .add(newComment);
    })
    .then(addedComment => {
      return res.json({
        commentId: addedComment.id,
        taskId: req.body.taskId,
        taskResponseId: req.body.taskResponseId,
        responseResponseId: req.body.responseResponseId,
        ...newComment
      });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.changeTaskStatus = (req, res) => {
  if (req.user.onDuty == false)
    return res.status(401).json({ Error: "Unauthorized!" });
  if (req.params.taskId) {
    let updatedTask = {};
    db.doc(`/tasks/${req.params.taskId}`)
      .get()
      .then(taskRef => {
        if (!taskRef.exists)
          return res
            .status(404)
            .json({ error: "The task can not be accessed (deleted)!" });
        else {
          if (taskRef.data().userHandle != req.user.handle)
            return res.status(401).json({ error: "Unauthorized" });
          else {
            const batch = db.batch();
            let i = 0;
            let j = 0;
            let supArr = [];
            let picArr = [];
            updatedTask = taskRef.data();
            batch.update(taskRef.ref, {
              lastStatusLog: new Date().toISOString(),
              status: req.body.status
            });
            updatedTask.status = req.body.status;
            if (taskRef.data().status === "ongoing") {
              if (req.body.status === "completed") {
                taskRef.ref
                  .collection("supervisors")
                  .get()
                  .then(supsRef => {
                    supsRef.forEach(supRef => {
                      db.doc(`/users/${supRef.data().handle}`)
                        .get()
                        .then(supRefData => {
                          supArr.push(
                            db.collection("users").doc(supRef.data().handle)
                          );
                          if (req.body.deadline >= new Date().toISOString()) {
                            batch.update(supArr[i], {
                              OAS: supRefData.data().OAS - 1,
                              COTAS: supRefData.data().COTAS + 1
                            });
                            updatedTask.OAS = supRefData.data().OAS - 1;
                            updatedTask.COTAS = supRefData.data().COTAS + 1;
                          } else {
                            batch.update(supArr[i], {
                              OAS: supRefData.data().OAS - 1,
                              CLAS: supRefData.data().CLAS + 1
                            });
                            updatedTask.OAS = supRefData.data().OAS - 1;
                            updatedTask.CLAS = supRefData.data().CLAS + 1;
                          }
                        });
                      i = i + 1;
                    });
                  })
                  .then(() => {
                    taskRef.ref
                      .collection("PIC")
                      .get()
                      .then(picsRef => {
                        picsRef.forEach(picRef => {
                          db.doc(`/users/${picRef.data().handle}`)
                            .get()
                            .then(picRefData => {
                              picArr.push(
                                db.collection("users").doc(picRef.data().handle)
                              );
                              if (
                                req.body.deadline >= new Date().toISOString()
                              ) {
                                batch.update(picArr[j], {
                                  OAPIC: picRefData.data().OAPIC - 1,
                                  COTAPIC: picRefData.data().COTAPIC + 1
                                });
                                updatedTask.OAPIC = supRefData.data().OAPIC - 1;
                                updatedTask.COTAPIC =
                                  supRefData.data().COTAPIC + 1;
                              } else {
                                batch.update(picArr[j], {
                                  OAPIC: picRefData.data().OAPIC - 1,
                                  CLAPIC: picRefData.data().CLAPIC + 1
                                });
                                updatedTask.OAPIC = supRefData.data().OAPIC - 1;
                                updatedTask.CLAPIC =
                                  supRefData.data().CLAPIC + 1;
                              }
                            });
                          j = j + 1;
                        });
                      });
                  });
              } else if (req.body.status === "failed") {
                taskRef.ref
                  .collection("supervisors")
                  .get()
                  .then(supsRef => {
                    supsRef.forEach(supRef => {
                      db.doc(`/users/${supRef.data().handle}`)
                        .get()
                        .then(supRefData => {
                          supArr.push(
                            db.collection("users").doc(supRef.data().handle)
                          );
                          batch.update(supArr[i], {
                            OAS: supRefData.data().OAS - 1,
                            FAS: supRefData.data().FAS + 1
                          });
                          updatedTask.OAS = supRefData.data().OAS - 1;
                          updatedTask.FAS = supRefData.data().FAS + 1;
                        });
                      i = i + 1;
                    });
                  })
                  .then(() => {
                    taskRef.ref
                      .collection("PIC")
                      .get()
                      .then(picsRef => {
                        picsRef.forEach(picRef => {
                          db.doc(`/users/${picRef.data().handle}`)
                            .get()
                            .then(picRefData => {
                              picArr.push(
                                db.collection("users").doc(picRef.data().handle)
                              );
                              batch.update(picArr[j], {
                                OAPIC: picRefData.data().OAPIC - 1,
                                FAPIC: picRefData.data().FAPIC + 1
                              });
                              updatedTask.OAPIC = supRefData.data().OAPIC - 1;
                              updatedTask.FAPIC = supRefData.data().FAPIC + 1;
                            });
                          j = j + 1;
                        });
                      });
                  });
              } else if (req.body.status === "discontinued") {
                taskRef.ref
                  .collection("supervisors")
                  .get()
                  .then(supsRef => {
                    supsRef.forEach(supRef => {
                      db.doc(`/users/${supRef.data().handle}`)
                        .get()
                        .then(supRefData => {
                          supArr.push(
                            db.collection("users").doc(supRef.data().handle)
                          );
                          batch.update(supArr[i], {
                            OAS: supRefData.data().OAS - 1,
                            DISCO: supRefData.data().DISCO + 1
                          });
                          updatedTask.OAS = supRefData.data().OAS - 1;
                          updatedTask.DISCO = supRefData.data().DISCO + 1;
                        });
                      i = i + 1;
                    });
                  })
                  .then(() => {
                    taskRef.ref
                      .collection("PIC")
                      .get()
                      .then(picsRef => {
                        picsRef.forEach(picRef => {
                          db.doc(`/users/${picRef.data().handle}`)
                            .get()
                            .then(picRefData => {
                              picArr.push(
                                db.collection("users").doc(picRef.data().handle)
                              );
                              batch.update(picArr[j], {
                                OAPIC: picRefData.data().OAPIC - 1,
                                DISCO: picRefData.data().DISCO + 1
                              });
                              updatedTask.OAPIC = supRefData.data().OAPIC - 1;
                              updatedTask.DISCO = supRefData.data().DISCO + 1;
                            });
                          j = j + 1;
                        });
                      });
                  });
              }
            } else if (taskRef.data().status === "completed") {
              if (req.body.status === "ongoing") {
                taskRef.ref
                  .collection("supervisors")
                  .get()
                  .then(supsRef => {
                    supsRef.forEach(supRef => {
                      db.doc(`/users/${supRef.data().handle}`)
                        .get()
                        .then(supRefData => {
                          supArr.push(
                            db.collection("users").doc(supRef.data().handle)
                          );
                          if (
                            req.body.deadline >= taskRef.data().lastStatusLog
                          ) {
                            batch.update(supArr[i], {
                              OAS: supRefData.data().OAS + 1,
                              COTAS: supRefData.data().COTAS - 1
                            });
                            updatedTask.OAS = supRefData.data().OAS + 1;
                            updatedTask.COTAS = supRefData.data().COTAS - 1;
                          } else {
                            batch.update(supArr[i], {
                              OAS: supRefData.data().OAS + 1,
                              CLAS: supRefData.data().CLAS - 1
                            });
                            updatedTask.OAS = supRefData.data().OAS + 1;
                            updatedTask.CLAS = supRefData.data().CLAS - 1;
                          }
                        });
                      i = i + 1;
                    });
                  })
                  .then(() => {
                    taskRef.ref
                      .collection("PIC")
                      .get()
                      .then(picsRef => {
                        picsRef.forEach(picRef => {
                          db.doc(`/users/${picRef.data().handle}`)
                            .get()
                            .then(picRefData => {
                              picArr.push(
                                db.collection("users").doc(picRef.data().handle)
                              );
                              if (
                                req.body.deadline >=
                                taskRef.data().lastStatusLog
                              ) {
                                batch.update(picArr[j], {
                                  OAPIC: picRefData.data().OAPIC + 1,
                                  COTAPIC: picRefData.data().COTAPIC - 1
                                });
                                updatedTask.COTAPIC =
                                  supRefData.data().COTAPIC - 1;
                                updatedTask.OAPIC = supRefData.data().OAPIC + 1;
                              } else {
                                batch.update(picArr[j], {
                                  OAPIC: picRefData.data().OAPIC + 1,
                                  CLAPIC: picRefData.data().CLAPIC - 1
                                });
                                updatedTask.CLAPIC =
                                  supRefData.data().CLAPIC - 1;
                                updatedTask.OAPIC = supRefData.data().OAPIC + 1;
                              }
                            });
                          j = j + 1;
                        });
                      });
                  });
              } else if (req.body.status === "failed") {
                taskRef.ref
                  .collection("supervisors")
                  .get()
                  .then(supsRef => {
                    supsRef.forEach(supRef => {
                      db.doc(`/users/${supRef.data().handle}`)
                        .get()
                        .then(supRefData => {
                          supArr.push(
                            db.collection("users").doc(supRef.data().handle)
                          );
                          if (
                            req.body.deadline >= taskRef.data().lastStatusLog
                          ) {
                            batch.update(supArr[i], {
                              FAS: supRefData.data().FAS + 1,
                              COTAS: supRefData.data().COTAS - 1
                            });
                            updatedTask.FAS = supRefData.data().FAS + 1;
                            updatedTask.COTAS = supRefData.data().COTAS - 1;
                          } else {
                            batch.update(supArr[i], {
                              FAS: supRefData.data().FAS + 1,
                              CLAS: supRefData.data().CLAS - 1
                            });
                            updatedTask.CLAS = supRefData.data().CLAS - 1;
                            updatedTask.FAS = supRefData.data().FAS + 1;
                          }
                        });
                      i = i + 1;
                    });
                  })
                  .then(() => {
                    taskRef.ref
                      .collection("PIC")
                      .get()
                      .then(picsRef => {
                        picsRef.forEach(picRef => {
                          db.doc(`/users/${picRef.data().handle}`)
                            .get()
                            .then(picRefData => {
                              picArr.push(
                                db.collection("users").doc(picRef.data().handle)
                              );
                              if (
                                req.body.deadline >=
                                taskRef.data().lastStatusLog
                              ) {
                                batch.update(picArr[j], {
                                  COTAPIC: picRefData.data().COTAPIC - 1,
                                  FAPIC: picRefData.data().FAPIC + 1
                                });
                                updatedTask.COTAPIC =
                                  supRefData.data().COTAPIC - 1;
                                updatedTask.FAPIC = supRefData.data().FAPIC + 1;
                              } else {
                                batch.update(picArr[j], {
                                  CLAPIC: picRefData.data().CLAPIC - 1,
                                  FAPIC: picRefData.data().FAPIC + 1
                                });
                                updatedTask.CLAPIC =
                                  supRefData.data().CLAPIC - 1;
                                updatedTask.FAPIC = supRefData.data().FAPIC + 1;
                              }
                            });
                          j = j + 1;
                        });
                      });
                  });
              } else if (req.body.status === "discontinued") {
                taskRef.ref
                  .collection("supervisors")
                  .get()
                  .then(supsRef => {
                    supsRef.forEach(supRef => {
                      db.doc(`/users/${supRef.data().handle}`)
                        .get()
                        .then(supRefData => {
                          supArr.push(
                            db.collection("users").doc(supRef.data().handle)
                          );
                          if (
                            req.body.deadline >= taskRef.data().lastStatusLog
                          ) {
                            batch.update(supArr[i], {
                              DISCO: supRefData.data().DISCO + 1,
                              COTAS: supRefData.data().COTAS - 1
                            });
                            updatedTask.DISCO = supRefData.data().DISCO + 1;
                            updatedTask.COTAS = supRefData.data().COTAS - 1;
                          } else {
                            batch.update(supArr[i], {
                              DISCO: supRefData.data().DISCO + 1,
                              CLAS: supRefData.data().CLAS - 1
                            });
                            updatedTask.CLAS = supRefData.data().CLAS - 1;
                            updatedTask.DISCO = supRefData.data().DISCO + 1;
                          }
                        });
                      i = i + 1;
                    });
                  })
                  .then(() => {
                    taskRef.ref
                      .collection("PIC")
                      .get()
                      .then(picsRef => {
                        picsRef.forEach(picRef => {
                          db.doc(`/users/${picRef.data().handle}`)
                            .get()
                            .then(picRefData => {
                              picArr.push(
                                db.collection("users").doc(picRef.data().handle)
                              );
                              if (
                                req.body.deadline >=
                                taskRef.data().lastStatusLog
                              ) {
                                batch.update(picArr[j], {
                                  COTAPIC: picRefData.data().COTAPIC - 1,
                                  DISCO: picRefData.data().DISCO + 1
                                });
                                updatedTask.COTAPIC =
                                  supRefData.data().COTAPIC - 1;
                                updatedTask.DISCO = supRefData.data().DISCO + 1;
                              } else {
                                batch.update(picArr[j], {
                                  CLAPIC: picRefData.data().CLAPIC - 1,
                                  DISCO: picRefData.data().DISCO + 1
                                });
                                updatedTask.CLAPIC =
                                  supRefData.data().CLAPIC - 1;
                                updatedTask.DISCO = supRefData.data().DISCO + 1;
                              }
                            });
                          j = j + 1;
                        });
                      });
                  });
              }
            } else if (taskRef.data().status === "failed") {
              if (req.body.status === "ongoing") {
                taskRef.ref
                  .collection("supervisors")
                  .get()
                  .then(supsRef => {
                    supsRef.forEach(supRef => {
                      db.doc(`/users/${supRef.data().handle}`)
                        .get()
                        .then(supRefData => {
                          supArr.push(
                            db.collection("users").doc(supRef.data().handle)
                          );
                          batch.update(supArr[i], {
                            OAS: supRefData.data().OAS + 1,
                            FAS: supRefData.data().FAS - 1
                          });
                          updatedTask.FAS = supRefData.data().FAS - 1;
                          updatedTask.OAS = supRefData.data().OAS + 1;
                        });
                      i = i + 1;
                    });
                  })
                  .then(() => {
                    taskRef.ref
                      .collection("PIC")
                      .get()
                      .then(picsRef => {
                        picsRef.forEach(picRef => {
                          db.doc(`/users/${picRef.data().handle}`)
                            .get()
                            .then(picRefData => {
                              picArr.push(
                                db.collection("users").doc(picRef.data().handle)
                              );
                              batch.update(picArr[j], {
                                FAPIC: picRefData.data().FAPIC - 1,
                                OAPIC: picRefData.data().OAPIC + 1
                              });
                              updatedTask.FAPIC = supRefData.data().FAPIC - 1;
                              updatedTask.OAPIC = supRefData.data().OAPIC + 1;
                            });
                          j = j + 1;
                        });
                      });
                  });
              } else if (req.body.status === "completed") {
                taskRef.ref
                  .collection("supervisors")
                  .get()
                  .then(supsRef => {
                    supsRef.forEach(supRef => {
                      db.doc(`/users/${supRef.data().handle}`)
                        .get()
                        .then(supRefData => {
                          supArr.push(
                            db.collection("users").doc(supRef.data().handle)
                          );
                          if (req.body.deadline >= new Date().toISOString()) {
                            batch.update(supArr[i], {
                              FAS: supRefData.data().FAS - 1,
                              COTAS: supRefData.data().COTAS + 1
                            });
                            updatedTask.FAS = supRefData.data().FAS - 1;
                            updatedTask.COTAS = supRefData.data().COTAS + 1;
                          } else {
                            batch.update(supArr[i], {
                              FAS: supRefData.data().FAS - 1,
                              CLAS: supRefData.data().CLAS + 1
                            });
                            updatedTask.FAS = supRefData.data().FAS - 1;
                            updatedTask.CLAS = supRefData.data().CLAS + 1;
                          }
                        });
                      i = i + 1;
                    });
                  })
                  .then(() => {
                    taskRef.ref
                      .collection("PIC")
                      .get()
                      .then(picsRef => {
                        picsRef.forEach(picRef => {
                          db.doc(`/users/${picRef.data().handle}`)
                            .get()
                            .then(picRefData => {
                              picArr.push(
                                db.collection("users").doc(picRef.data().handle)
                              );
                              batch.update(picArr[j], {
                                OAPIC: picRefData.data().OAPIC - 1,
                                FAPIC: picRefData.data().FAPIC + 1
                              });
                              updatedTask.OAPIC = supRefData.data().OAPIC - 1;
                              updatedTask.FAPIC = supRefData.data().FAPIC + 1;
                            });
                          j = j + 1;
                        });
                      });
                  });
              } else if (req.body.status === "discontinued") {
                taskRef.ref
                  .collection("supervisors")
                  .get()
                  .then(supsRef => {
                    supsRef.forEach(supRef => {
                      db.doc(`/users/${supRef.data().handle}`)
                        .get()
                        .then(supRefData => {
                          supArr.push(
                            db.collection("users").doc(supRef.data().handle)
                          );
                          batch.update(supArr[i], {
                            DISCO: supRefData.data().DISCO + 1,
                            FAS: supRefData.data().FAS - 1
                          });
                          updatedTask.FAS = supRefData.data().FAS - 1;
                          updatedTask.DISCO = supRefData.data().DISCO + 1;
                        });
                      i = i + 1;
                    });
                  })
                  .then(() => {
                    taskRef.ref
                      .collection("PIC")
                      .get()
                      .then(picsRef => {
                        picsRef.forEach(picRef => {
                          db.doc(`/users/${picRef.data().handle}`)
                            .get()
                            .then(picRefData => {
                              picArr.push(
                                db.collection("users").doc(picRef.data().handle)
                              );
                              batch.update(picArr[j], {
                                FAPIC: picRefData.data().FAPIC - 1,
                                DISCO: picRefData.data().DISCO + 1
                              });
                              updatedTask.FAPIC = supRefData.data().FAPIC - 1;
                              updatedTask.DISCO = supRefData.data().DISCO + 1;
                            });
                          j = j + 1;
                        });
                      });
                  });
              }
            } else if (taskRef.data().status === "discontinued") {
              if (req.body.status === "ongoing") {
                taskRef.ref
                  .collection("supervisors")
                  .get()
                  .then(supsRef => {
                    supsRef.forEach(supRef => {
                      db.doc(`/users/${supRef.data().handle}`)
                        .get()
                        .then(supRefData => {
                          supArr.push(
                            db.collection("users").doc(supRef.data().handle)
                          );
                          batch.update(supArr[i], {
                            OAS: supRefData.data().OAS + 1,
                            DISCO: supRefData.data().DISCO - 1
                          });
                          updatedTask.DISCO = supRefData.data().DISCO - 1;
                          updatedTask.OAS = supRefData.data().OAS + 1;
                        });
                      i = i + 1;
                    });
                  })
                  .then(() => {
                    taskRef.ref
                      .collection("PIC")
                      .get()
                      .then(picsRef => {
                        picsRef.forEach(picRef => {
                          db.doc(`/users/${picRef.data().handle}`)
                            .get()
                            .then(picRefData => {
                              picArr.push(
                                db.collection("users").doc(picRef.data().handle)
                              );
                              batch.update(picArr[j], {
                                DISCO: picRefData.data().DISCO - 1,
                                OAPIC: picRefData.data().OAPIC + 1
                              });
                              updatedTask.DISCO = supRefData.data().DISCO - 1;
                              updatedTask.OAPIC = supRefData.data().OAPIC + 1;
                            });
                          j = j + 1;
                        });
                      });
                  });
              } else if (req.body.status === "completed") {
                taskRef.ref
                  .collection("supervisors")
                  .get()
                  .then(supsRef => {
                    supsRef.forEach(supRef => {
                      db.doc(`/users/${supRef.data().handle}`)
                        .get()
                        .then(supRefData => {
                          supArr.push(
                            db.collection("users").doc(supRef.data().handle)
                          );
                          if (req.body.deadline >= new Date().toISOString()) {
                            batch.update(supArr[i], {
                              DISCO: supRefData.data().DISCO - 1,
                              COTAS: supRefData.data().COTAS + 1
                            });
                            updatedTask.DISCO = supRefData.data().DISCO - 1;
                            updatedTask.COTAS = supRefData.data().COTAS + 1;
                          } else {
                            batch.update(supArr[i], {
                              DISCO: supRefData.data().DISCO - 1,
                              CLAS: supRefData.data().CLAS + 1
                            });
                            updatedTask.DISCO = supRefData.data().DISCO - 1;
                            updatedTask.CLAS = supRefData.data().CLAS + 1;
                          }
                        });
                      i = i + 1;
                    });
                  })
                  .then(() => {
                    taskRef.ref
                      .collection("PIC")
                      .get()
                      .then(picsRef => {
                        picsRef.forEach(picRef => {
                          db.doc(`/users/${picRef.data().handle}`)
                            .get()
                            .then(picRefData => {
                              picArr.push(
                                db.collection("users").doc(picRef.data().handle)
                              );
                              if (
                                req.body.deadline >= new Date().toISOString()
                              ) {
                                batch.update(picArr[j], {
                                  COTAPIC: picRefData.data().COTAPIC + 1,
                                  DISCO: picRefData.data().DISCO - 1
                                });
                                updatedTask.DISCO = supRefData.data().DISCO - 1;
                                updatedTask.COTAPIC =
                                  supRefData.data().COTAPIC + 1;
                              } else {
                                batch.update(picArr[j], {
                                  CLAPIC: picRefData.data().CLAPIC + 1,
                                  DISCO: picRefData.data().DISCO - 1
                                });
                                updatedTask.DISCO = supRefData.data().DISCO - 1;
                                updatedTask.CLAPIC =
                                  supRefData.data().CLAPIC + 1;
                              }
                            });
                          j = j + 1;
                        });
                      });
                  });
              } else if (req.body.status === "failed") {
                taskRef.ref
                  .collection("supervisors")
                  .get()
                  .then(supsRef => {
                    supsRef.forEach(supRef => {
                      db.doc(`/users/${supRef.data().handle}`)
                        .get()
                        .then(supRefData => {
                          supArr.push(
                            db.collection("users").doc(supRef.data().handle)
                          );
                          batch.update(supArr[i], {
                            DISCO: supRefData.data().DISCO - 1,
                            FAS: supRefData.data().FAS + 1
                          });
                          updatedTask.DISCO = supRefData.data().DISCO - 1;
                          updatedTask.FAS = supRefData.data().FAS + 1;
                        });
                      i = i + 1;
                    });
                  })
                  .then(() => {
                    taskRef.ref
                      .collection("PIC")
                      .get()
                      .then(picsRef => {
                        picsRef.forEach(picRef => {
                          db.doc(`/users/${picRef.data().handle}`)
                            .get()
                            .then(picRefData => {
                              picArr.push(
                                db.collection("users").doc(picRef.data().handle)
                              );
                              batch.update(picArr[j], {
                                FAPIC: picRefData.data().FAPIC + 1,
                                DISCO: picRefData.data().DISCO - 1
                              });
                              updatedTask.DISCO = supRefData.data().DISCO - 1;
                              updatedTask.FAPIC = supRefData.data().COTAS + 1;
                            });
                          j = j + 1;
                        });
                      });
                  });
              }
            }
            return batch.commit();
          }
        }
      })
      .then(() => {
        db.collection("tasks")
          .where("parentId", "==", req.params.taskId)
          .get()
          .then(childs => {
            if (childs.exists) {
              childs.forEach(child => {
                child.ref.update({
                  parentStatus: req.body.status,
                  parentStatusApproval: false
                });
              });
            }
          });
      })
      .then(() => {
        return res.status(200).json(updatedTask);
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  }
};

exports.changeTaskDeadline = (req, res) => {
  if (req.user.onDuty == false)
    return res.status(401).json({ Error: "Unauthorized!" });
  if (req.params.taskId) {
    db.doc(`/tasks/${req.params.taskId}`)
      .get()
      .then(taskRef => {
        if (!taskRef.exists)
          return res
            .status(404)
            .json({ error: "The task can not be accessed (deleted)!" });
        else {
          if (taskRef.data().status != "ongoing")
            return res.status(404).json({
              error:
                "This task is not active, try changing status to 'ongoing'!"
            });
          else {
            if (taskRef.data().userHandle != req.user.handle)
              return res.status(401).json({ error: "Unauthorized" });
            else return taskRef.ref.update({ deadline: req.body.deadline });
          }
        }
      })
      .then(() => {
        return res.status(200).json({
          deadline: req.body.deadline
        });
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  }
};

exports.editTask = (req, res) => {
  if (req.user.onDuty == false)
    return res.status(401).json({ Error: "Unauthorized!" });
  if (req.params.taskId) {
    db.doc(`/tasks/${req.params.taskId}`)
      .get()
      .then(taskRef => {
        if (!taskRef.exists)
          return res
            .status(404)
            .json({ error: "The parent task can not be accessed (deleted)!" });
        else {
          if (taskRef.data().status != "ongoing")
            return res.status(404).json({
              error:
                "This task is not active, try changing status to 'ongoing'!"
            });
          else {
            if (taskRef.data().userHandle != req.user.handle)
              return res.status(401).json({ error: "Unauthorized" });
            else return taskRef.ref.update(req.body);
          }
        }
      })
      .then(() => {
        return res.status(200).json(req.body);
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  }
};

exports.editTaskResponse = (req, res) => {
  if (req.user.onDuty == false)
    return res.status(401).json({ Error: "Unauthorized!" });
  if (req.params.taskId) {
    db.doc(`/tasks/${req.params.taskId}`)
      .get()
      .then(taskReference => {
        if (!taskReference.exists)
          return res
            .status(404)
            .json({ error: "The parent task can not be accessed (deleted)!" });
        else {
          if (taskReference.data().status != "ongoing") {
            return res.status(404).json({
              error:
                "This task is not active, try changing status to 'ongoing'!"
            });
          } else {
          }
        }
      });
  }
  if (req.params.taskId && req.params.taskResponseId) {
    db.collection("tasks")
      .doc(req.params.taskId)
      .collection("taskResponses")
      .doc(req.params.taskResponseId)
      .get()
      .then(taskRef => {
        if (!taskRef.exists)
          return res
            .status(404)
            .json({ error: "The response can not be accessed (deleted)!" });
        else {
          if (taskRef.data().userHandle != req.user.handle)
            return res.status(401).json({ error: "Unauthorized" });
          else return taskRef.ref.update(req.body);
        }
      })
      .then(() => {
        return res.status(200).json(req.body);
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  }
};

exports.editResponseResponse = (req, res) => {
  if (req.user.onDuty == false)
    return res.status(401).json({ Error: "Unauthorized!" });
  if (req.params.taskId) {
    db.doc(`/tasks/${req.params.taskId}`)
      .get()
      .then(taskReference => {
        if (!taskReference.exists)
          return res
            .status(404)
            .json({ error: "The parent task can not be accessed (deleted)!" });
        else {
          if (taskReference.data().status != "ongoing") {
            return res.status(404).json({
              error:
                "This task is not active, try changing status to 'ongoing'!"
            });
          } else {
          }
        }
      });
  }
  if (
    req.params.taskId &&
    req.params.taskResponseId &&
    req.params.responseResponseId
  ) {
    db.collection("tasks")
      .doc(req.params.taskId)
      .collection("taskResponses")
      .doc(req.params.taskResponseId)
      .collection("responses")
      .doc(req.params.responseResponseId)
      .get()
      .then(taskRef => {
        if (!taskRef.exists)
          return res
            .status(404)
            .json({ error: "The response can not be accessed (deleted)!" });
        else {
          if (taskRef.data().userHandle != req.user.handle)
            return res.status(401).json({ error: "Unauthorized" });
          else return taskRef.ref.update(req.body);
        }
      })
      .then(() => {
        return res.status(200).json(req.body);
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  }
};

exports.addFilesToTask = (req, res) => {
  if (req.user.onDuty == false) {
    req.files.forEach(file => {
      admin
        .storage()
        .bucket()
        .file(file.tempName)
        .delete();
    });
    return res.status(401).json({ Error: "Unauthorized!" });
  }
  let batch = db.batch();
  if (req.params.taskId) {
    let parentTaskRef = db.collection("tasks").doc(req.params.taskId);
    parentTaskRef
      .get()
      .then(taskRef => {
        if (!taskRef.exists) {
          req.files.forEach(file => {
            admin
              .storage()
              .bucket()
              .file(file.tempName)
              .delete();
          });
          return res
            .status(404)
            .json({ error: "The task can not be accessed (deleted)!" });
        } else {
          if (taskRef.data().status != "ongoing") {
            req.files.forEach(file => {
              admin
                .storage()
                .bucket()
                .file(file.tempName)
                .delete();
            });
            return res.status(404).json({
              error:
                "This task is not active, try changing status to 'ongoing'!"
            });
          } else if (taskRef.data().userHandle != req.user.handle) {
            req.files.forEach(file => {
              admin
                .storage()
                .bucket()
                .file(file.tempName)
                .delete();
            });
            return res.status(401).json({ error: "Unauthorized" });
          } else {
            let fileRef = [];
            req.files.forEach((fl, k) => {
              fileRef.push(parentTaskRef.collection("files").doc());
              batch.set(fileRef[k], fl);
            });
            return batch.commit();
          }
        }
      })
      .then(() => {
        return res.status(200).json({
          files: req.files
        });
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  }
};

exports.addFilesToTaskResponse = (req, res) => {
  if (req.user.onDuty == false)
    return res.status(401).json({ Error: "Unauthorized!" });
  if (req.params.taskId) {
    db.doc(`/tasks/${req.params.taskId}`)
      .get()
      .then(taskReference => {
        if (!taskReference.exists)
          return res
            .status(404)
            .json({ error: "The task can not be accessed (deleted)!" });
        else {
          if (taskReference.data().status != "ongoing") {
            return res.status(404).json({
              error:
                "This task is not active, try changing status to 'ongoing'!"
            });
          } else {
          }
        }
      });
  }
  if (req.params.taskId && req.params.taskResponseId) {
    let parentTaskRef = db.collection("tasks").doc(req.params.taskId);
    let parentTaskResponseRef = parentTaskRef
      .collection("taskResponses")
      .doc(req.params.taskResponseId);
    const batch = db.batch();
    parentTaskResponseRef
      .get()
      .then(taskRef => {
        if (!taskRef.exists)
          return res
            .status(404)
            .json({ error: "The response can not be accessed (deleted)!" });
        else if (taskRef.data().userHandle != req.user.handle)
          return res.status(401).json({ error: "Unauthorized" });
        else {
          let fileRef = [];
          req.files.forEach((fl, k) => {
            fileRef.push(parentTaskResponseRef.collection("files").doc());
            batch.set(fileRef[k], fl);
          });
          return batch.commit();
        }
      })
      .then(() => {
        return res.status(200).json({
          files: req.files
        });
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  }
};

exports.addFilesToResponseResponse = (req, res) => {
  if (req.user.onDuty == false)
    return res.status(401).json({ Error: "Unauthorized!" });
  if (req.params.taskId) {
    db.doc(`/tasks/${req.params.taskId}`)
      .get()
      .then(taskReference => {
        if (!taskReference.exists)
          return res
            .status(404)
            .json({ error: "The task can not be accessed (deleted)!" });
        else {
          if (taskReference.data().status != "ongoing") {
            return res.status(404).json({
              error:
                "This task is not active, try changing status to 'ongoing'!"
            });
          } else {
          }
        }
      });
  }
  if (req.params.taskId) {
    let parentTaskRef = db
      .collection("tasks")
      .doc(req.params.taskId)
      .collection("taskResponses")
      .doc(req.params.taskResponseId)
      .collection("responses")
      .doc(req.params.responseResponseId);
    const batch = db.batch();
    parentTaskRef
      .get()
      .then(taskRef => {
        if (!taskRef.exists)
          return res
            .status(404)
            .json({ error: "The response can not be accessed (deleted)!" });
        else if (taskRef.data().userHandle != req.user.handle)
          return res.status(401).json({ error: "Unauthorized" });
        else {
          let fileRef = [];
          req.files.forEach((fl, k) => {
            fileRef.push(parentTaskRef.collection("files").doc());
            batch.set(fileRef[k], fl);
          });
          return batch.commit();
        }
      })
      .then(() => {
        return res.status(200).json({
          files: req.files
        });
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  }
};

exports.deleteTaskResponse = (req, res) => {
  if (req.user.onDuty == false)
    return res.status(401).json({ Error: "Unauthorized!" });
  let taskResponsePath = db
    .collection("tasks")
    .doc(req.params.taskId)
    .collection("taskResponses")
    .doc(req.params.taskResponseId);
  let path = `/tasks/${req.params.taskId}/taskResponses/${req.params.taskResponseId}`;
  taskResponsePath
    .get()
    .then(data => {
      if (!data.exists)
        return res.status(404).json({ error: "Response not found!" });
      if (data.data().userHandle != req.user.handle)
        return res.status(401).json({ error: "Unauthorized!" });
      return data.ref.delete();
    })
    .then(() => {
      return firebase_tools.firestore
        .delete(path, {
          project: process.env.GCLOUD_PROJECT,
          recursive: true,
          yes: true
        })
        .then(() => {
          return res
            .status(200)
            .json({ message: "Response(s) deleted successfully!" });
        });
    })
    .catch(errors => {
      console.error(errors);
      return res.status(500).json({ error: errors.code });
    });
};

exports.deleteResponseResponse = (req, res) => {
  if (req.user.onDuty == false)
    return res.status(401).json({ Error: "Unauthorized!" });
  let taskResponseResponsePath = db
    .collection("tasks")
    .doc(req.params.taskId)
    .collection("taskResponses")
    .doc(req.params.taskResponseId)
    .collection("responses")
    .doc(req.params.responseResponseId);
  let path = `/tasks/${req.params.taskId}/taskResponses/${req.params.taskResponseId}/responses/${req.params.responseResponseId}`;

  taskResponseResponsePath
    .get()
    .then(data => {
      if (!data.exists)
        return res.status(404).json({ error: "Response not found!" });
      if (data.data().userHandle != req.user.handle)
        return res.status(401).json({ error: "Unauthorized!" });
      return data.ref.delete();
    })
    .then(() => {
      return firebase_tools.firestore
        .delete(path, {
          project: process.env.GCLOUD_PROJECT,
          recursive: true,
          yes: true
        })
        .then(() => {
          return res
            .status(200)
            .json({ message: "Response deleted successfully!" });
        });
    })
    .catch(errors => {
      console.error(errors);
      return res.status(500).json({ error: errors.code });
    });
};

exports.deleteTaskComment = (req, res) => {
  if (req.user.onDuty == false)
    return res.status(401).json({ Error: "Unauthorized!" });
  let taskPath = db.doc(`/tasks/${req.params.taskId}`);
  let commentPath = db
    .collection("tasks")
    .doc(req.params.taskId)
    .collection("comments")
    .doc(req.params.commentId);
  let taskData;

  taskPath
    .get()
    .then(doc => {
      if (!doc.exists)
        return res.status(404).json({ error: "Task not found!" });

      taskData = doc.data();
      taskData.taskId = doc.id;
      return commentPath.get();
    })
    .then(data => {
      if (data.empty)
        return res.status(400).json({ error: "Comment already deleted!" });
      if (data.data().userHandle !== req.user.handle)
        return res.status(401).json({ error: "Unauthorized!" });
      return commentPath
        .delete()
        .then(() => {
          taskData.commentCount--;
          return taskPath.update({ commentCount: taskData.commentCount });
        })
        .then(() => {
          return res.status(200).json(taskData);
        })
        .catch(err => {
          console.error(err);
          return res.status(500).json({ error: "Something went wrong!" });
        });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.deleteTaskResponseComment = (req, res) => {
  if (req.user.onDuty == false)
    return res.status(401).json({ Error: "Unauthorized!" });
  let taskPath = db
    .collection("tasks")
    .doc(req.params.taskId)
    .collection("taskResponses")
    .doc(req.params.taskResponseId);
  let commentPath = db
    .collection("tasks")
    .doc(req.params.taskId)
    .collection("taskResponses")
    .doc(req.params.taskResponseId)
    .collection("comments")
    .doc(req.params.commentId);
  let taskData;

  taskPath
    .get()
    .then(doc => {
      if (!doc.exists)
        return res.status(404).json({ error: "Response not found!" });

      taskData = doc.data();
      taskData.taskResponseId = doc.id;
      return commentPath.get();
    })
    .then(data => {
      if (data.empty)
        return res.status(400).json({ error: "Comment already deleted!" });
      if (data.data().userHandle !== req.user.handle)
        return res.status(401).json({ error: "Unauthorized!" });
      return commentPath
        .delete()
        .then(() => {
          taskData.commentCount--;
          return taskPath.update({ commentCount: taskData.commentCount });
        })
        .then(() => {
          return res.status(200).json(taskData);
        })
        .catch(err => {
          console.error(err);
          return res.status(500).json({ error: "Something went wrong!" });
        });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.deleteResponseResponseComment = (req, res) => {
  if (req.user.onDuty == false)
    return res.status(401).json({ Error: "Unauthorized!" });
  let taskPath = db
    .collection("tasks")
    .doc(req.params.taskId)
    .collection("taskResponses")
    .doc(req.params.taskResponseId)
    .collection("responses")
    .doc(req.params.responseResponseId);
  let commentPath = db
    .collection("tasks")
    .doc(req.params.taskId)
    .collection("taskResponses")
    .doc(req.params.taskResponseId)
    .collection("responses")
    .doc(req.params.responseResponseId)
    .collection("comments")
    .doc(req.params.commentId);
  let taskData;

  taskPath
    .get()
    .then(doc => {
      if (!doc.exists)
        return res.status(404).json({ error: "Response not found!" });

      taskData = doc.data();
      taskData.responseResponseId = doc.id;
      return commentPath.get();
    })
    .then(data => {
      if (data.empty)
        return res.status(400).json({ error: "Comment already deleted!" });
      if (data.data().userHandle !== req.user.handle)
        return res.status(401).json({ error: "Unauthorized!" });
      return commentPath
        .delete()
        .then(() => {
          taskData.commentCount--;
          return taskPath.update({ commentCount: taskData.commentCount });
        })
        .then(() => {
          return res.status(200).json(taskData);
        })
        .catch(err => {
          console.error(err);
          return res.status(500).json({ error: "Something went wrong!" });
        });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
