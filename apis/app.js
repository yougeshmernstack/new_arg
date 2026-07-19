require('dotenv').config();
require('./connections')
require('./MODALS/wallets')
const express = require('express');
const http = require('http');
const { setupWebSocket } = require('./webSocket/broadCast');

const app = express();
const server = http.createServer(app);
const cors = require('cors');
const corsOptions = {
    origin: '*', // Replace with your React app's URL
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
};
app.use(express.json());
app.use(cors(corsOptions));
app.use(express.static('public'));
const crypto = require('crypto');
const bodyParser = require('body-parser');
const { getAllRoutes } = require('./utils/get-all-routes');
const authenticator = require('./utils/authuser');
const admin = require('./ROUTES/adminRoutes');
const franchise = require('./ROUTES/franchiseRoutes');
const distributor = require('./ROUTES/distributorRoutes');
const themeRouter = require('./ROUTES/themeRoutes');
const { default: axios } = require('axios');
const port = process.env.PORT;
const path = require('path');
const { sendEmail } = require('./SERVICES/EmailService');
var jsonParser = bodyParser.json();
app.use(jsonParser)
app.use(bodyParser.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, './Template/html'));
app.use('/Template', express.static(path.join(__dirname, 'Template')));
app.get('/welcome', (req, res) => {
    const user = {
        firstname: 'John',
        lastname: 'Doe',
        username: 'johndoe',
        password: '123456',
        email: 'john.doe@example.com'
    };
    
    res.render('welcome', user);
});
app.use('/franchise', franchise)
app.use('/distributor', distributor)
app.use('/theme', themeRouter)
app.get('/send-welcome-email', async (req, res) => {
    const user = {
        firstname: 'John',
        lastname: 'Doe',
        username: 'johndoe',
        password: '123456',
        email: 'john.doe@example.com'
    };
    const subject = 'Welcome to gog!';
    const text = 'Welcome to gog! We are excited to have you on board.';
    
    try {
        const response = await sendEmail('eracomjoginder@gmail.com', subject, text, user);
        if (response.success) {
            res.status(200).json({ success: true, messageId: response.messageId });
        } else {
            res.status(500).json({ success: false, error: response.error });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to send email.' });
    }
});
app.use('/admin', admin)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
app.use(express.static(__dirname + '/uploads/'))
const merchantKey = process.env.MERCHANT_KEY;
app.get('/', async (req, res) => {
    res.send('hello bharat betteries testing')
});
const clients = {};
function sendDataToUser(userId, data) {
    const client = clients[userId];
    if (client) {
        client.send(JSON.stringify(data));
    } else {
        console.log(` ${userId} is not connected.`);
    }
}
// wss.on('connection', function connection(ws) {
//     console.log('Client connected');
    
//     // Handle messages from clients
//     ws.on('message', function incoming(message) {
//         const data = JSON.parse(message);
//         // Assuming userId is sent along with the message
//         const userId = data.userId;
//         clients[userId] = ws; // Store client reference by userId
//     });
    
//     // Handle closing of connection
//     ws.on('close', function close() {
//         console.log('Client disconnected');
//         // Clean up client reference
//         Object.keys(clients).forEach((userId) => {
//             if (clients[userId] === ws) {
//                 delete clients[userId];
//             }
//         });
//     });
// });

// app.get('/get_games/:page',async (req,res)=>{
    //     const page = req.params.page;
    // //  for (let index = 1; index < 78; index++) {
        //      const RESULT = await GAME.game1(page)
        // //  }
        //     res.json({DATA:'RES'})
        // });
app.get('/project_setup', async (req, res) => {
    res.json({ DATA: 'RES'})
});

setupWebSocket(server);
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});