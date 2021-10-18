const io = require('socket.io')(3100, {
    pingInterval: 30005,
    pingTimeout: 5000,
    upgradeTimeout: 3000,
    allowUpgrades: true,
    cookie: false,
    serveClient: true
});

let users = {};
let socketToRoom = {};
const maximum = process.env.MAXIMUM || 4;


console.log('Starting Socket.IO server, port : 3100');

io.on('connection', (socket) => {
	console.log('connected');
	socket.on('join_room', data => {
        console.log(socket.id);
        // user[room]에는 room에 있는 사용자들이 배열 형태로 저장된다.
        // room이 존재한다면
        if (users[data.room]) {
            const length = users[data.room].length;
            // 최대 인원을 충족시켰으면 더 이상 접속 불가
            if (length === maximum) {
                socket.to(socket.id).emit('room_full');
                return;
            }
            // 인원이 최대 인원보다 적으면 접속 가능
            users[data.room].push({id: socket.id, type: data.type}); 
            //users[data.room].push({id: socket.id, username : data.user_name}); // id 이외에 다른 속성 추가 가능
        } else { // room이 존재하지 않는다면 새로 생성
            users[data.room] = [{id: socket.id, type: data.type}];
        }
        // 해당 소켓이 어느 room에 속해있는 지 알기 위해 저장
        socketToRoom[socket.id] = data.room;

        socket.join(data.room);
        console.log(`[${socketToRoom[socket.id]}]: ${socket.id} enter, type ${data.type}`);

        // 본인을 제외한 같은 room의 user array
        const usersInThisRoom = users[data.room].filter(user => user.id !== socket.id);

        console.log(usersInThisRoom);

        // 본인에게 해당 user array를 전송
        // 새로 접속하는 user가 이미 방에 있는 user들에게 offer(signal)를 보내기 위해
        // io.sockets.to(socket.id).emit('all_users', usersInThisRoom);

        //socket.broadcast.emit('callee');
        
        if (data.type == 'host')    // 소켓주인이 호스트인 경우에
        {   
            console.log('host connect!');
            socket.emit('host');    //host인 경우 호스트로 전달
        }else //소켓주인이 게스트 인 경우에
        {//게스트 입장시, 호스트에 게스트의 socketID 전달.
            for (i in users[data.room])
            {
                if (users[data.room][i].type == "host")
                    console.log(users[data.room][i]);
                    io.sockets.socket(users[data.room][i].id).emit('guestEnter', socket.id);
            }
        }
    });
    //1:N
    //호스트가 offer 보냄. 타겟 게스트(게스트의 소켓ID)로 sdp보냄.
    socket.on('offer', data =>{
        console.log(data.sdp);
        //console.log(data.type);
        console.log(data.guestID);

        io.sockets.socket(data.guestID).emit('getOffer', data.sdp);
    });

    //게스트가 answer 보냄. 호스트(호스트의 소켓ID)로 sdp 보냄
    socket.on('answer', data =>{
        console.log(data.sdp);
        console.log(data.hostID);
        console.log(data.guestID);
        
        io.sockets.socket(data.hostID).emit('getAnswer', {sdp : data.sdp, guestID : data.guestID});
    });

    //호스트 혹은 게스트가 서로의 소켓ID를 통해 candidate 전달
    socket.on('candidate', data =>{
        console.log(data.candidate);
        console.log(data.targetID);
        console.log(data.senderID);
        
        io.sockets.socket(data.targetID).emit('getCandidate', {candidate : data.candidate, senderID : data.senderID} );
    });


    socket.on('disconnect', () => {
        console.log(`[${socketToRoom[socket.id]}]: ${socket.id} exit`);
        // disconnect한 user가 포함된 roomID
        const roomID = socketToRoom[socket.id];
        // room에 포함된 유저
        let room = users[roomID];
        // room이 존재한다면(user들이 포함된)
        if (room) {
            // disconnect user를 제외
            room = room.filter(user => user.id !== socket.id);
            users[roomID] = room;
        }
        // 어떤 user가 나갔는 지 room의 다른 user들에게 통보

        socket.broadcast.to(room).emit('user_exit', {id: socket.id});
        console.log("DISCONNECTED");
    })



/*

	// 다른 user들에게 offer를 보냄 (자신의 RTCSessionDescription)
    socket.on('offer', sdp => {
        console.log('offer: ' + socket.id);
        //dat_json = JSON.parse(sdp.toString());
        //console.log(dat_json);
        // room에는 두 명 밖에 없으므로 broadcast 사용해서 전달
        socket.broadcast.emit('getOffer', sdp);
    });

    // offer를 보낸 user에게 answer을 보냄 (자신의 RTCSessionDescription)
    socket.on('answer', sdp => {
        console.log('answer: ' + socket.id);
        console.log(sdp);
        // room에는 두 명 밖에 없으므로 broadcast 사용해서 전달
        socket.broadcast.emit('getAnswer', sdp);
    });

    // 자신의 ICECandidate 정보를 signal(offer 또는 answer)을 주고 받은 상대에게 전달
    socket.on('candidate', candidate => {
        console.log('candidate: ' + socket.id);
        // room에는 두 명 밖에 없으므로 broadcast 사용해서 전달
        socket.broadcast.emit('getCandidate', candidate);
    })

    // user가 연결이 끊겼을 때 처리
    socket.on('disconnect', () => {
        console.log(`[${socketToRoom[socket.id]}]: ${socket.id} exit`);
        // disconnect한 user가 포함된 roomID
        const roomID = socketToRoom[socket.id];
        // room에 포함된 유저
        let room = users[roomID];
        // room이 존재한다면(user들이 포함된)
        if (room) {
            // disconnect user를 제외
            room = room.filter(user => user.id !== socket.id);
            users[roomID] = room;
        }
        // 어떤 user가 나갔는 지 room의 다른 user들에게 통보
        socket.broadcast.to(room).emit('user_exit', {id: socket.id});
        //console.log(users);
        console.log("DISCONNECTED");
    })
    */
});