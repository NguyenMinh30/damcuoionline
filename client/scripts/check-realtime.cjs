
const { io } = require('socket.io-client');

const base = process.argv[2] || 'http://localhost:4000';
const options = {
    transports: ['websocket'],
    reconnection: false,
    timeout: 10000
};

const alice = io(base, options);
const bob = io(base, options);

let aliceReady = false;
let bobReady = false;
let aliceSawBob = false;
let bobSawMove = false;
let finished = false;

function finish(ok, message) {
    if (finished) return;
    finished = true;

    console.log((ok ? '[PASS] ' : '[FAIL] ') + message);

    alice.disconnect();
    bob.disconnect();
    clearTimeout(timeout);
    process.exitCode = ok ? 0 : 1;
}

function maybeMove() {
    if (!aliceReady || !bobReady) return;

    alice.emit('move', {
        x: 2.5,
        y: 0,
        z: 3.5,
        rotY: 0,
        action: 'walk'
    });
}

alice.on('connect', () => {
    alice.emit('join_room', {
        roomId: 'room_1',
        playerProfile: {
            username: 'test_a',
            displayName: 'Test A',
            isGuest: true
        }
    });
});

bob.on('connect', () => {
    bob.emit('join_room', {
        roomId: 'room_1',
        playerProfile: {
            username: 'test_b',
            displayName: 'Test B',
            isGuest: true
        }
    });
});

alice.on('room_state', () => {
    aliceReady = true;
    maybeMove();
});

bob.on('room_state', (data) => {
    bobReady = true;

    console.log(
        'B vào map, số người khác trong snapshot:',
        Object.keys(data.players || {}).length - 1
    );

    maybeMove();
});

alice.on('player_joined', (player) => {
    if (player.displayName === 'Test B') {
        aliceSawBob = true;
    }
});

bob.on('player_moved', (p) => {
    if (p.id === alice.id && p.x === 2.5) {
        bobSawMove = true;
        finish(true, 'Hai client thấy sự kiện di chuyển trong cùng map.');
    }
});

for (const [name, socket] of [
    ['A', alice],
    ['B', bob]
]) {
    socket.on('connect_error', (error) => {
        finish(false, `Kết nối ${name}: ${error.message}`);
    });
}

const timeout = setTimeout(() => {
    finish(
        false,
        `Không đồng bộ sau 15 giây. A thấy B: ${aliceSawBob}; B thấy move: ${bobSawMove}. Kiểm tra /socket.io routing và các instance của Vercel.`
    );
}, 15000);
