const WebSocket = require('ws');

const port = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port });

console.log(`WebSocket server listening on ws://localhost:${port}`);

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    // Simple broadcast: reenvía a todos los clientes excepto el que lo envió
    try {
      const parsed = JSON.parse(message);
      // opcional: validar mensajes
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(parsed));
        }
      });
    } catch (e) {
      console.warn('Invalid message received', e);
    }
  });

  ws.on('close', () => console.log('Client disconnected'));
});
