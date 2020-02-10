const { db } = require("../util/admin");

exports.addTodo = (req, res) => {
    if (req.body.body.trim() == "")
      return res.status(400).json({ error: "Must not be empty!" });
    if (req.body.deadline <= new Date())
    return res.status(400).json({ error: "Invalid due time!" });
  
    let newTodo = {
      body: req.body.body.trim(),
      createdAt: new Date().toISOString(),
      deadline: req.body.deadline,
      repeat: req.body.repeat,
      status: 'pending'
    };
    let newShedule = {
      body: req.body.body.trim(),
      createdAt: new Date().toISOString(),
      deadline: req.body.deadline,
      repeat: req.body.repeat,
      type: 'ToDo'
    }
    let todoid = '';
    db.collection("users")
    .doc(req.user.handle)
    .collection("todo")
      .add(newTodo)
      .then((addedTodo) => {
        todoid = addedTodo.id;
        return db
          .collection("users")
          .doc(req.user.handle)
          .collection("schedule")
          .doc(todoid)
          .set({...newShedule,typeId:todoid});
      })
      .then(() => {
        return res.status(200).json({
          todoId: todoid,
          ...newTodo
        });
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  };
  
exports.editTodo = (req, res) => {
    if (req.body.body.trim() == "")
      return res.status(400).json({ error: "Must not be empty!" })
    if (req.body.deadline <= new Date())
    return res.status(400).json({ error: "Invalid due time!" })
  
    let newTodo = {
      body: req.body.body.trim(),
      deadline: req.body.deadline,
      repeat: req.body.repeat,
      status: 'pending'
    }
    let newShedule = {
      body: req.body.body.trim(),
      deadline: req.body.deadline,
      repeat: req.body.repeat,
      type: 'ToDo'
    }
    let todoid = req.params.todoid;
    db.collection("users")
    .doc(req.user.handle)
    .collection("todo")
    .doc(todoid)
    .update(newTodo)
    .then(() => {
        return db.collection("users").doc(req.user.handle).collection("schedule").doc(todoid).update(newShedule)
    })
    .then(() => {
        return res.status(200).json({ message: "update successful!"});
    })
    .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code });
    });
  };
 
exports.changeTodoStatus = (req, res) => {
    let todoid = req.params.todoid;
    let newState = req.params.status;
    let todo = {};
    db.collection("users")
    .doc(req.user.handle)
    .collection("todo")
    .doc(todoid)
    .get()
    .then((todoFeed)=>{
        todo = todoFeed;
        return todoFeed.ref.update({status: newState})
    })
    .then(() => {
        if(newState === "complete")
        return db.collection("users").doc(req.user.handle).collection("schedule").doc(todoid).delete()
        else return db.collection("users")
        .doc(req.user.handle)
        .collection("schedule")
        .doc(todoid)
        .set({
            body: todo.body,
            createdAt: new Date().toISOString(),
            deadline: todo.deadline,
            repeat: todo.repeat,
            type: 'ToDo',
            typeId:todoid
          })
    })
    .then(() => {
        return res.status(200).json({ message: "update successful!"});
    })
    .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code });
    });
  };