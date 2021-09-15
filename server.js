const WebSocket = require('ws');
const express = require('express');

const app = express();

const server = app.listen(3001, () => {
    console.log('Start Server : port 3001');
});


const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => { // 웹 소켓 연결 시
    console.log('새로운 클라이언트 접속');
    ws.on('message', (message) => { // 클라이언트로부터 메시지 수신 시
        dat = message.toString();
        dat_json = JSON.parse(dat);
        console.log(dat);
        wss.broadcast(dat,ws);
    });

    ws.on('error', (err) => { // 에러 발생 시
        console.error(err);
    });

    ws.on('close', () => { // 연결 종료 시
        console.log('클라이언트 접속 해제');
        clearInterval(ws.interval);
    });

    // ws.interval = setInterval(() => {
    //     if (ws.readyState === ws.OPEN) {
    //         ws.send('서버에서 클라이언트로 메시지를 보냅니다.');
    //     }
    // }, 3000);
});


wss.broadcast = function broadcast(data, sender) {
    //console.log(data);
    wss.clients.forEach(function each(client) {
        if (client !== sender && client.readyState === WebSocket.OPEN)
        {
            client.send(data);
        }
    });
};


wss.checkDisconnect = function checkDisconnect(data, sender)
{
    wss.clients.forEach(function each(client){
        console.log(client);
    });
}
