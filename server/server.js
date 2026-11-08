require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const User = require('./models/user');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingInterval: 10000,
    pingTimeout: 5000
});

const JWT_SECRET = process.env.JWT_SECRET || 'dam_cuoi_online_secret_2026';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dam_cuoi_online';

mongoose
    .connect(MONGO_URI)
    .then(() => console.log('✅ Đã kết nối MongoDB thành công'))
    .catch((err) => console.error('❌ Lỗi kết nối MongoDB (Server vẫn chạy chế độ RAM):', err.message));

// ======================== API XÁC THỰC & TÀI KHOẢN ========================

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, recoveryPin, displayName, gender, role } = req.body;
        if (!username || !password || !recoveryPin) {
            return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin.' });
        }
        const existing = await User.findOne({ username: username.toLowerCase().trim() });
        if (existing) {
            return res.status(400).json({ error: 'Tên tài khoản đã tồn tại.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const recoveryPinHash = await bcrypt.hash(String(recoveryPin), 10);
        const defaultName = (displayName || '').trim() || (gender === '♀' ? 'Cô Dâu' : 'Chú Rể');

        const user = await User.create({
            username: username.toLowerCase().trim(),
            passwordHash,
            recoveryPinHash,
            displayName: defaultName,
            gender: gender || '♂',
            role: role || (gender === '♀' ? 'bride' : 'groom'),
            outfit: {
                style: 'royal_wedding',
                primaryColor: '#ffffff',
                accentColor: '#ff69b4',
                hasCrown: true,
                prop: gender === '♀' ? 'bouquet' : 'ring_box'
            }
        });

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: sanitizeUser(user) });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi máy chủ khi đăng ký: ' + err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username: (username || '').toLowerCase().trim() });
        if (!user) {
            return res.status(400).json({ error: 'Tài khoản không tồn tại.' });
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            return res.status(400).json({ error: 'Mật khẩu không chính xác.' });
        }

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: sanitizeUser(user) });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi máy chủ khi đăng nhập.' });
    }
});

app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { username, recoveryPin, newPassword } = req.body;
        const user = await User.findOne({ username: (username || '').toLowerCase().trim() });
        if (!user) {
            return res.status(400).json({ error: 'Không tìm thấy tài khoản.' });
        }

        const validPin = await bcrypt.compare(String(recoveryPin), user.recoveryPinHash);
        if (!validPin) {
            return res.status(400).json({ error: 'Mã PIN khôi phục không đúng.' });
        }

        user.passwordHash = await bcrypt.hash(newPassword, 10);
        await user.save();
        res.json({ message: 'Đặt lại mật khẩu thành công! Hãy đăng nhập lại.' });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khôi phục mật khẩu.' });
    }
});

app.post('/api/user/save', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Thiếu token xác thực.' });

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const updates = req.body;

        const user = await User.findByIdAndUpdate(
            decoded.userId,
            {
                $set: {
                    displayName: updates.displayName,
                    gender: updates.gender,
                    role: updates.role,
                    outfit: updates.outfit,
                    xuHy: updates.xuHy,
                    fullness: updates.fullness,
                    vowLuck: updates.vowLuck,
                    inventory: updates.inventory,
                    achievements: updates.achievements,
                    friends: updates.friends,
                    weddingHistory: updates.weddingHistory,
                    lastRoom: updates.lastRoom,
                    lastPosition: updates.lastPosition
                }
            },
            { new: true }
        );

        res.json({ user: sanitizeUser(user) });
    } catch (err) {
        res.status(401).json({ error: 'Phiên đăng nhập hết hạn hoặc không hợp lệ.' });
    }
});

function sanitizeUser(user) {
    return {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        gender: user.gender,
        role: user.role,
        outfit: user.outfit,
        xuHy: user.xuHy,
        fullness: user.fullness,
        vowLuck: user.vowLuck,
        inventory: user.inventory,
        achievements: user.achievements,
        friends: user.friends,
        weddingHistory: user.weddingHistory,
        lastRoom: user.lastRoom,
        lastPosition: user.lastPosition
    };
}

// ======================== HỆ THỐNG 2 MAP x 500 NGƯỜI (1.000 CCU) ========================

const MAX_PLAYERS_PER_ROOM = 500;
const rooms = {
    room_1: {
        id: 'room_1',
        name: 'Map 1: Rạp Cưới Nhà Quê (500 người)',
        mapType: 'village',
        players: {},
        seats: {},
        ceremonyStep: 0,
        bouquetActive: false,
        bouquetPos: { x: 0, y: 4, z: -6 },
        totalGiftPot: 15000000,
        couple: {
            groomId: null,
            brideId: null,
            groomName: 'Chú Rể',
            brideName: 'Cô Dâu'
        }
    },
    room_2: {
        id: 'room_2',
        name: 'Map 2: Đám Cưới Rừng Hoa (500 người)',
        mapType: 'flower_forest',
        players: {},
        seats: {},
        ceremonyStep: 0,
        bouquetActive: false,
        bouquetPos: { x: 0, y: 4, z: -6 },
        totalGiftPot: 15000000,
        couple: {
            groomId: null,
            brideId: null,
            groomName: 'Chú Rể',
            brideName: 'Cô Dâu'
        }
    }
};

io.on('connection', (socket) => {
    let currentRoom = 'room_1';

    socket.on('join_room', ({ roomId, playerProfile }) => {
        const targetRoom = rooms[roomId] ? roomId : 'room_1';
        if (Object.keys(rooms[targetRoom].players).length >= MAX_PLAYERS_PER_ROOM) {
            socket.emit('room_full', { message: 'Map này đã đủ 500 người chơi, vui lòng chuyển sang Map còn lại!' });
            return;
        }

        if (rooms[currentRoom] && rooms[currentRoom].players[socket.id]) {
            releasePlayerSeat(currentRoom, socket.id);
            delete rooms[currentRoom].players[socket.id];
            socket.leave(currentRoom);
            io.to(currentRoom).emit('player_left', { id: socket.id });
        }

        currentRoom = targetRoom;
        socket.join(currentRoom);

        const defaultName = playerProfile?.gender === '♀' ? 'Cô Dâu' : 'Chú Rể';
        rooms[currentRoom].players[socket.id] = {
            id: socket.id,
            displayName: playerProfile?.displayName || defaultName,
            gender: playerProfile?.gender || '♂',
            role: playerProfile?.role || 'groom',
            outfit: playerProfile?.outfit || { hasCrown: true },
            x: Number(playerProfile?.lastPosition?.x) || (Math.random() - 0.5) * 4,
            y: 0,
            z: Number(playerProfile?.lastPosition?.z) || 8,
            rotY: 0,
            action: 'idle',
            chatText: '',
            seatKey: null
        };

        socket.emit('room_state', {
            roomId: currentRoom,
            players: rooms[currentRoom].players,
            seats: rooms[currentRoom].seats,
            ceremonyStep: rooms[currentRoom].ceremonyStep,
            totalGiftPot: rooms[currentRoom].totalGiftPot,
            couple: rooms[currentRoom].couple,
            roomSummary: getRoomSummary()
        });

        socket.emit('couple_updated', rooms[currentRoom].couple);
        socket.to(currentRoom).emit('player_joined', rooms[currentRoom].players[socket.id]);
    });

    socket.on('move', ({ x, y, z, rotY, action }) => {
        const room = rooms[currentRoom];
        if (!room || !room.players[socket.id]) return;
        const p = room.players[socket.id];
        p.x = x;
        p.y = y;
        p.z = z;
        p.rotY = rotY;
        p.action = action || 'idle';
        socket.to(currentRoom).emit('player_moved', { id: socket.id, x, y, z, rotY, action: p.action });
    });

    socket.on('chat', ({ text }) => {
        const room = rooms[currentRoom];
        if (!room || !room.players[socket.id]) return;
        room.players[socket.id].chatText = text;
        io.to(currentRoom).emit('player_chat', {
            id: socket.id,
            sender: room.players[socket.id].displayName,
            text
        });
    });

    socket.on('send_proposal', ({ targetId }) => {
        const room = rooms[currentRoom];
        if (!room || !room.players[socket.id] || !room.players[targetId]) return;
        const sender = room.players[socket.id];

        io.to(targetId).emit('receive_proposal', {
            fromId: socket.id,
            fromName: sender.displayName,
            fromGender: sender.gender
        });
    });

    socket.on('accept_proposal', ({ proposerId }) => {
        const room = rooms[currentRoom];
        if (!room || !room.players[socket.id] || !room.players[proposerId]) return;

        const p1 = room.players[proposerId];
        const p2 = room.players[socket.id];

        const groom = p1.gender === '♂' ? p1 : p2.gender === '♂' ? p2 : p1;
        const bride = groom.id === p1.id ? p2 : p1;

        groom.role = 'groom';
        groom.x = -0.95;
        groom.z = -8.8;

        bride.role = 'bride';
        bride.x = 0.95;
        bride.z = -8.8;

        room.couple = {
            groomId: groom.id,
            brideId: bride.id,
            groomName: groom.displayName,
            brideName: bride.displayName
        };

        io.to(currentRoom).emit('couple_matched', {
            couple: room.couple,
            groomPos: { id: groom.id, x: groom.x, z: groom.z },
            bridePos: { id: bride.id, x: bride.x, z: bride.z }
        });
    });

    socket.on('cancel_couple', () => {
        const room = rooms[currentRoom];
        if (!room) return;
        room.couple = {
            groomId: null,
            brideId: null,
            groomName: 'Chú Rể',
            brideName: 'Cô Dâu'
        };
        io.to(currentRoom).emit('couple_updated', room.couple);
    });

    socket.on('claim_seat', ({ seatKey, seatPos }) => {
        const room = rooms[currentRoom];
        if (!room || !room.players[socket.id]) return;

        if (room.seats[seatKey] && room.seats[seatKey] !== socket.id) {
            socket.emit('seat_rejected', { message: 'Ghế này đã có người nhanh tay ngồi trước rồi!' });
            return;
        }

        releasePlayerSeat(currentRoom, socket.id);
        room.seats[seatKey] = socket.id;
        const p = room.players[socket.id];
        p.seatKey = seatKey;
        p.x = seatPos.x;
        p.z = seatPos.z;
        p.action = 'sitting';

        io.to(currentRoom).emit('seats_updated', {
            seats: room.seats,
            playerId: socket.id,
            seatKey,
            seatPos
        });
    });

    socket.on('send_gift', ({ amount, groomName, brideName, note }) => {
        const room = rooms[currentRoom];
        if (!room || !room.players[socket.id]) return;
        room.totalGiftPot += Number(amount) || 0;
        io.to(currentRoom).emit('gift_broadcast', {
            sender: room.players[socket.id].displayName,
            amount,
            groomName,
            brideName,
            note,
            totalGiftPot: room.totalGiftPot
        });
    });

    socket.on('ceremony_step', ({ step }) => {
        const room = rooms[currentRoom];
        if (!room) return;
        room.ceremonyStep = step;
        io.to(currentRoom).emit('ceremony_updated', { step });
    });

    socket.on('toss_bouquet', () => {
        const room = rooms[currentRoom];
        if (!room) return;
        room.bouquetActive = true;
        room.bouquetPos = {
            x: (Math.random() - 0.5) * 10,
            y: 0.6,
            z: (Math.random() - 0.2) * 8
        };
        io.to(currentRoom).emit('bouquet_tossed', room.bouquetPos);
    });

    socket.on('catch_bouquet', () => {
        const room = rooms[currentRoom];
        if (!room || !room.bouquetActive || !room.players[socket.id]) return;
        room.bouquetActive = false;
        io.to(currentRoom).emit('bouquet_caught', {
            winnerId: socket.id,
            winnerName: room.players[socket.id].displayName
        });
    });

    socket.on('disconnect', () => {
        const room = rooms[currentRoom];
        if (room && room.players[socket.id]) {
            releasePlayerSeat(currentRoom, socket.id);
            delete room.players[socket.id];
            io.to(currentRoom).emit('player_left', { id: socket.id });
        }
    });
});

function releasePlayerSeat(roomId, socketId) {
    const room = rooms[roomId];
    if (!room) return;
    for (const key of Object.keys(room.seats)) {
        if (room.seats[key] === socketId) {
            delete room.seats[key];
        }
    }
}

function getRoomSummary() {
    return Object.values(rooms).map((r) => ({
        id: r.id,
        name: r.name,
        count: Object.keys(r.players).length,
        max: MAX_PLAYERS_PER_ROOM
    }));
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`🚀 Server Đám Cưới Online (2 Map x 500 CCU) đang chạy tại http://localhost:${PORT}`);
});