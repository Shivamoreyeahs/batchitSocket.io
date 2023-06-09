const express = require("express");
const path = require("path");
const http = require("http");
const socketio = require("socket.io");
const Filter = require("bad-words");

const {generateMessage,generateLocationMessage} = require('./utils/messages')
const {addUser,removeUser,getUser,getUserInRoom} = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const publicDirectoryPath = path.join(__dirname, "../public");

app.use(express.static(publicDirectoryPath));

// let count = 0;
io.on("connection", (socket) => {
  console.log(`New web socket connection successfully`);

  // socket.emit("countUpdated",count)
  // socket.on('increment',()=>{
  //     count++;
  //     // socket.emit("countUpdated",count)
  //     io.emit('countUpdated',count)
  //     console.log(count);
  // })

  // socket.emit("message",generateMessage('Welcome!'));    

  // socket.broadcast.emit("message", generateMessage("A new user has joined!!"));

  // listerners for socket.emit('join')
  socket.on('join',(options,callback)=>{
    const {error,user} = addUser({id:socket.id,...options})  // rest operator
    if(error){
     return  callback(error)
    }
    socket.join(user.room)

    socket.emit("message",generateMessage('Admin','Welcome!'));    

    socket.broadcast.to(user.room).emit("message", generateMessage('Admin',`${user.username} has joined group ${user.room}`));
    io.to(user.room).emit('roomData',{
      room:user.room,
      users:getUserInRoom(user.room)
    })
    callback()
  })

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id)
    const filter = new Filter();
    if (filter.isProfane(message)) {
      return callback("Bad-words is not allowed!");
    }

    io.to(user.room).emit("message",generateMessage(user.username,message));
    callback()
  });

  socket.on("sendLocation", (coords, callback) => {
    const user = getUser(socket.id)

    io.to(user.room).emit("locationMessage",generateLocationMessage(user.username,`https://google.com/maps?q=${coords.latitude},${coords.longitude}`));
    callback();
  });
  
  
  socket.on("disconnect", () => {
    const user = removeUser(socket.id)
    if(user){
      io.to(user.room).emit("message", generateMessage('Admin',`${user.username} has left the chat!`));
      io.to(user.room).emit('roomData',{
        room:user.room,
        users:getUserInRoom(user.room)
      })
    }
  });

});

const port = 3000;
server.listen(port, () => {
  console.log(`Connecting to ${port}...`);
});



