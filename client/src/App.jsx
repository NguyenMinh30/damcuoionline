import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import WeddingScene3D from './components/WeddingScene3D';

// Create React App: trên Vercel cùng domain gọi /api và /socket.io tương đối.
// Nếu deploy Backend riêng: REACT_APP_BACKEND_URL=https://backend-cua-ban.example.
// Chạy local: dùng proxy trong client/package.json tới localhost:4000.
const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

export default function App() {
    const [authMode, setAuthMode] = useState('login');
    const [currentUser, setCurrentUser] = useState(null);
    const [authForm, setAuthForm] = useState({
        username: '',
        password: '',
        recoveryPin: '',
        newPassword: '',
        displayName: 'Chú Rể',
        gender: '♂',
        role: 'groom'
    });
    const [statusMsg, setStatusMsg] = useState('');
    const [socketStatus, setSocketStatus] = useState('offline');

    // Trạng thái 2 Map: room_1 (Nhà Quê - 500 người) | room_2 (Rừng Hoa - 500 người)
    const [currentRoom, setCurrentRoom] = useState('room_1');
    const [remotePlayers, setRemotePlayers] = useState({});
    const [totalGiftPot, setTotalGiftPot] = useState(15000000);
    const [ceremonyStep, setCeremonyStep] = useState(0);
    const [bouquetState, setBouquetState] = useState({ active: false, x: 0, z: 0 });
    const [chatInput, setChatInput] = useState('');
    const [eventLogs, setEventLogs] = useState([
        '🎉 Chào mừng bạn đến với Đám Cưới Online!'
    ]);

    const [coupleInfo, setCoupleInfo] = useState({
        groomId: null,
        brideId: null,
        groomName: 'Chú Rể',
        brideName: 'Cô Dâu'
    });
    const [incomingProposal, setIncomingProposal] = useState(null);
    const [stageTeleportTrigger, setStageTeleportTrigger] = useState(null);
    const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });

    const [activeModal, setActiveModal] = useState(null);
    const [giftForm, setGiftForm] = useState({
        amount: 500000,
        groomName: 'Chú Rể',
        brideName: 'Cô Dâu',
        note: 'Chúc hai bạn trăm năm hạnh phúc!'
    });
    const [screenshotCount, setScreenshotCount] = useState(0);

    const [simulatedBots, setSimulatedBots] = useState([]);
    const [ccuTarget, setCcuTarget] = useState(0);

    const socketRef = useRef(null);
    const joystickDeltaRef = useRef({ x: 0, y: 0 });
    const joystickActiveRef = useRef(false);
    const lastPositionSaveAtRef = useRef(0);
    const lastMoveSentAtRef = useRef(0);

    // Giữ tham chiếu mới nhất của phòng và người chơi để tránh ghi đè state cũ (stale closure)
    const currentRoomRef = useRef(currentRoom);
    const currentUserRef = useRef(currentUser);

    useEffect(() => {
        currentRoomRef.current = currentRoom;
    }, [currentRoom]);

    useEffect(() => {
        currentUserRef.current = currentUser;
    }, [currentUser]);

    // Tự động nhả focus khỏi <select> và <button> khi nhấn phím di chuyển để tránh bị đổi ngược lại map cũ
    useEffect(() => {
        const handleGlobalKeyDown = () => {
            const tag = document.activeElement?.tagName;
            if (['SELECT', 'BUTTON'].includes(tag)) {
                document.activeElement.blur();
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown, true);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
    }, []);

    const addLog = (msg) => {
        setEventLogs((prev) => [msg, ...prev.slice(0, 7)]);
    };

    useEffect(() => {
        // localStorage chỉ lưu token/hiển thị; MongoDB quyết định phiên có hợp lệ hay không.
        const token = localStorage.getItem('dco_token');
        if (!token) {
            localStorage.removeItem('dco_active_user');
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (!res.ok || !data.user) {
                    throw new Error(data.error || 'Phiên đăng nhập không hợp lệ.');
                }
                if (cancelled) return;
                const initialRoom = data.user.lastRoom || 'room_1';
                const verifiedUser = { ...data.user, lastRoom: initialRoom, isGuest: false };
                currentRoomRef.current = initialRoom;
                currentUserRef.current = verifiedUser;
                setCurrentRoom(initialRoom);
                setCurrentUser(verifiedUser);
                localStorage.setItem('dco_active_user', JSON.stringify(verifiedUser));
            } catch (error) {
                if (cancelled) return;
                // Nếu API tạm thời mất kết nối: KHÔNG tự cho đăng nhập từ bộ nhớ trình duyệt.
                setStatusMsg(error.message || 'Không thể xác thực phiên đăng nhập.');
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const persistUser = async (updatedFields) => {
        const baseUser = currentUserRef.current || currentUser || {};
        const resolvedRoom =
            updatedFields?.lastRoom ||
            currentRoomRef.current ||
            baseUser.lastRoom ||
            'room_1';

        const mergedUser = {
            ...baseUser,
            ...updatedFields,
            lastRoom: resolvedRoom
        };

        currentUserRef.current = mergedUser;
        setCurrentUser(mergedUser);
        if (mergedUser.isGuest) return;

        const token = localStorage.getItem('dco_token');
        if (!token) {
            addLog('⚠️ Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại để lưu tiến độ.');
            return;
        }

        try {
            const res = await fetch(`${BACKEND_URL}/api/user/save`, {
                method: 'POST',
                keepalive: true,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(mergedUser)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Không thể lưu dữ liệu.');
            const savedUser = {
                ...data.user,
                lastRoom: currentRoomRef.current || data.user.lastRoom || 'room_1',
                isGuest: false
            };
            localStorage.setItem('dco_active_user', JSON.stringify(savedUser));
        } catch (error) {
            console.error('Lỗi lưu tiến độ lên MongoDB:', error);
            addLog(`⚠️ Chưa lưu được tiến độ lên máy chủ: ${error.message}`);
        }
    };

    const handleSwitchRoom = (nextRoom, event) => {
        if (event?.currentTarget) {
            event.currentTarget.blur();
        }
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        if (!nextRoom || nextRoom === currentRoomRef.current) return;

        currentRoomRef.current = nextRoom;
        setCurrentRoom(nextRoom);
        setRemotePlayers({});

        const updatedUser = {
            ...(currentUserRef.current || currentUser),
            lastRoom: nextRoom
        };
        currentUserRef.current = updatedUser;
        setCurrentUser(updatedUser);

        if (socketRef.current?.connected) {
            socketRef.current.emit('join_room', {
                roomId: nextRoom,
                playerProfile: updatedUser
            });
        }

        if (!updatedUser.isGuest) {
            persistUser({ lastRoom: nextRoom });
        }

        addLog(
            nextRoom === 'room_2'
                ? '🌸 Đã chuyển sang Map 2: Đám Cưới Rừng Hoa (Tối đa 500 người)!'
                : '🏡 Đã chuyển sang Map 1: Đám Cưới Nhà Quê (Tối đa 500 người)!'
        );
    };

    const handleQuickPlay = (selectedGender = '♂') => {
        const defaultName = selectedGender === '♀' ? 'Cô Dâu' : 'Chú Rể';

        const guestUser = {
            isGuest: true,
            username: `guest_${Date.now()}`,
            displayName: defaultName,
            gender: selectedGender,
            role: selectedGender === '♀' ? 'bride' : 'groom',
            outfit: {
                hasCrown: true,
                primaryColor: '#ffffff',
                accentColor: '#ff69b4'
            },
            xuHy: 500000,
            fullness: 60,
            vowLuck: 15,
            inventory: ['Vương miện Hoàng Gia (Dùng thử)', 'Phong bì Đỏ'],
            achievements: ['Khách Chơi Ngay'],
            friends: [],
            weddingHistory: [],
            lastRoom: 'room_1',
            lastPosition: { x: 0, z: 8 }
        };

        currentRoomRef.current = 'room_1';
        currentUserRef.current = guestUser;
        setCurrentRoom('room_1');
        setCurrentUser(guestUser);
        addLog('⚡ Bạn đang ở chế độ Chơi Ngay (Tiến trình sẽ không được lưu khi thoát).');
    };

    useEffect(() => {
        if (!currentUser?.username) return;

        const socket = io(BACKEND_URL || window.location.origin, {
            transports: ['websocket'],
            reconnectionAttempts: Infinity,
            timeout: 10000
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setSocketStatus('connecting');
            socket.emit('join_room', {
                roomId: currentRoomRef.current || 'room_1',
                playerProfile: currentUserRef.current || currentUser
            });
        });
        socket.on('connect_error', (err) => {
            setSocketStatus('offline');
            console.error('Socket.IO chưa kết nối:', err.message);
        });
        socket.on('disconnect', () => setSocketStatus('offline'));
        socket.on('room_full', (data) => {
            setSocketStatus('offline');
            addLog(`⚠️ ${data.message}`);
        });

        socket.on('room_state', (data) => {
            setSocketStatus('connected');
            if (data.roomId && data.roomId !== currentRoomRef.current) {
                currentRoomRef.current = data.roomId;
                setCurrentRoom(data.roomId);
            }
            const others = { ...data.players };
            delete others[socket.id];
            setRemotePlayers(others);
            setTotalGiftPot(data.totalGiftPot);
            setCeremonyStep(data.ceremonyStep);
            if (data.couple) setCoupleInfo(data.couple);
        });

        socket.on('player_joined', (p) => {
            setRemotePlayers((prev) => ({ ...prev, [p.id]: p }));
            addLog(
                `👋 ${p.displayName} vừa bước vào ${
                    currentRoomRef.current === 'room_2' ? 'Rừng Hoa' : 'Rạp Cưới Quê'
                }!`
            );
        });

        socket.on('player_moved', (p) => {
            setRemotePlayers((prev) =>
                prev[p.id] ? { ...prev, [p.id]: { ...prev[p.id], ...p } } : prev
            );
        });

        socket.on('player_chat', ({ id, sender, text }) => {
            addLog(`💬 ${sender}: ${text}`);
            if (id !== socket.id) {
                setRemotePlayers((prev) =>
                    prev[id] ? { ...prev, [id]: { ...prev[id], chatText: text } } : prev
                );
            }
        });

        socket.on('receive_proposal', (proposalData) => {
            setIncomingProposal(proposalData);
            addLog(`💍 ${proposalData.fromName} vừa gửi lời cầu hôn đến bạn!`);
        });

        socket.on('couple_matched', ({ couple, groomPos, bridePos }) => {
            setCoupleInfo(couple);
            setGiftForm((prev) => ({
                ...prev,
                groomName: couple.groomName,
                brideName: couple.brideName
            }));
            addLog(
                `💒 Chúc mừng Chú Rể "${couple.groomName}" ❤️ Cô Dâu "${couple.brideName}" đã ghép đôi thành công trên sân khấu!`
            );

            if (socket.id === groomPos.id) {
                setStageTeleportTrigger({ x: groomPos.x, z: groomPos.z, t: Date.now() });
                setCurrentUser((prev) => {
                    const next = {
                        ...prev,
                        role: 'groom',
                        outfit: { ...prev.outfit, hasCrown: true, primaryColor: '#ffffff' },
                        chatText: `💍 Anh đồng ý! Mãi yêu ${couple.brideName}!`
                    };
                    currentUserRef.current = next;
                    return next;
                });
            } else if (socket.id === bridePos.id) {
                setStageTeleportTrigger({ x: bridePos.x, z: bridePos.z, t: Date.now() });
                setCurrentUser((prev) => {
                    const next = {
                        ...prev,
                        role: 'bride',
                        outfit: { ...prev.outfit, hasCrown: true, primaryColor: '#ffffff' },
                        chatText: `💍 Em đồng ý! Trăm năm hạnh phúc bên ${couple.groomName}!`
                    };
                    currentUserRef.current = next;
                    return next;
                });
            }

            setRemotePlayers((prev) => {
                const next = { ...prev };
                if (next[groomPos.id]) {
                    next[groomPos.id] = {
                        ...next[groomPos.id],
                        role: 'groom',
                        x: groomPos.x,
                        z: groomPos.z
                    };
                }
                if (next[bridePos.id]) {
                    next[bridePos.id] = {
                        ...next[bridePos.id],
                        role: 'bride',
                        x: bridePos.x,
                        z: bridePos.z
                    };
                }
                return next;
            });
        });

        socket.on('couple_updated', (couple) => {
            if (couple) setCoupleInfo(couple);
        });

        socket.on('gift_broadcast', ({ sender, amount, groomName, brideName, totalGiftPot: newPot }) => {
            setTotalGiftPot(newPot);
            addLog(
                `🧧 ${sender} vừa mừng cưới ${Number(amount).toLocaleString()} Xu Hỷ cho ${groomName} & ${brideName}!`
            );
        });

        socket.on('bouquet_tossed', (pos) => {
            setBouquetState({ active: true, x: pos.x, z: pos.z });
            addLog('💐 Cô dâu vừa tung hoa cưới! Nhấp vào bó hoa trên sân để chụp lấy vía!');
        });

        socket.on('bouquet_caught', ({ winnerName }) => {
            setBouquetState({ active: false, x: 0, z: 0 });
            addLog(`🎉 ${winnerName} đã bắt được hoa cưới! Xin vía thành công!`);
        });

        socket.on('player_left', ({ id }) => {
            setRemotePlayers((prev) => {
                const copy = { ...prev };
                delete copy[id];
                return copy;
            });
        });

        return () => {
            setSocketStatus('offline');
            socket.disconnect();
            if (socketRef.current === socket) socketRef.current = null;
        };
    }, [currentUser?.username]);

    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        setStatusMsg('');
        const finalDisplayName = authForm.displayName.trim() ||
            (authForm.gender === '♀' ? 'Cô Dâu' : 'Chú Rể');

        try {
            const endpoint = authMode === 'register'
                ? '/api/auth/register'
                : authMode === 'login'
                    ? '/api/auth/login'
                    : '/api/auth/reset-password';

            const response = await fetch(`${BACKEND_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...authForm, displayName: finalDisplayName })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || `Máy chủ trả về lỗi ${response.status}.`);
            }

            if (authMode === 'reset') {
                setStatusMsg(data.message || 'Đặt lại mật khẩu thành công.');
                setAuthMode('login');
                return;
            }

            if (!data.token || !data.user) {
                throw new Error('Máy chủ không trả về token hoặc thông tin tài khoản.');
            }
            localStorage.setItem('dco_token', data.token);
            localStorage.removeItem(`dco_user_${data.user.username}`);
            const initialRoom = data.user.lastRoom || 'room_1';
            const verifiedUser = { ...data.user, lastRoom: initialRoom, isGuest: false };
            localStorage.setItem('dco_active_user', JSON.stringify(verifiedUser));
            currentRoomRef.current = initialRoom;
            currentUserRef.current = verifiedUser;
            setCurrentRoom(initialRoom);
            setCurrentUser(verifiedUser);
        } catch (error) {
            const networkError = error instanceof TypeError;
            setStatusMsg(networkError
                ? 'Không kết nối được Backend. Kiểm tra API, biến môi trường và MongoDB.'
                : (error.message || 'Không thể xác thực với máy chủ.'));
            console.error('Lỗi đăng ký/đăng nhập:', error);
        }
    };

    const handleMatchWithPartnerBot = () => {
        const isPlayerMale = currentUser.gender === '♂';
        const partnerName = isPlayerMale ? 'Cô Dâu' : 'Chú Rể';
        const groomName = isPlayerMale ? currentUser.displayName : partnerName;
        const brideName = isPlayerMale ? partnerName : currentUser.displayName;

        const partnerBot = {
            id: 'partner_stage_bot',
            displayName: partnerName,
            gender: isPlayerMale ? '♀' : '♂',
            role: isPlayerMale ? 'bride' : 'groom',
            outfit: { hasCrown: true, primaryColor: '#ffffff', accentColor: '#ff69b4' },
            x: isPlayerMale ? 0.95 : -0.95,
            z: -8.8,
            action: 'idle',
            chatText: `💖 Trăm năm hạnh phúc bên ${currentUser.displayName}!`
        };

        setSimulatedBots((prev) => [
            ...prev.filter((b) => b.id !== 'partner_stage_bot'),
            partnerBot
        ]);
        setCoupleInfo({
            groomId: 'local',
            brideId: 'partner_stage_bot',
            groomName,
            brideName
        });
        setGiftForm((prev) => ({ ...prev, groomName, brideName }));
        setStageTeleportTrigger({
            x: isPlayerMale ? -0.95 : 0.95,
            z: -8.8,
            t: Date.now()
        });
        persistUser({
            role: isPlayerMale ? 'groom' : 'bride',
            outfit: { ...currentUser.outfit, hasCrown: true, primaryColor: '#ffffff' },
            chatText: `💍 Sánh đôi cùng ${partnerName}!`
        });
        addLog(`💒 Bạn đã ghép đôi làm lễ cùng "${partnerName}" ngay trên sân khấu chính!`);
        setActiveModal(null);
    };

    const handleEatFeast = () => {
        persistUser({
            fullness: Math.min(100, (currentUser.fullness || 50) + 20),
            xuHy: currentUser.xuHy + 20000,
            chatText: '🍗 Gà luộc lá chanh + xôi gấc ngon tuyệt!'
        });
        addLog('🍗 Bạn vừa thưởng thức mâm cỗ (+20% No bụng, +20.000 Xu Hỷ)!');
    };

    const handleToast = () => {
        const toastText = '🍻 1, 2, 3 Dzôôô! Trăm năm hạnh phúc!';
        persistUser({
            action: 'toast',
            chatText: toastText
        });
        socketRef.current?.emit('chat', { text: toastText });
    };

    const handleDance = () => {
        const nextAction = currentUser.action === 'dance' ? 'idle' : 'dance';
        persistUser({
            action: nextAction,
            chatText: nextAction === 'dance' ? '💃 Nhạc đám cưới cực sung!' : ''
        });
    };

    const handlePrayVow = () => {
        const nextLuck = (currentUser.vowLuck || 10) + 15;
        persistUser({
            vowLuck: nextLuck,
            chatText: '🌸 Xin vía năm nay thoát ế, cưới liền tay!'
        });
        addLog(`🌸 Điểm Duyên Phận của bạn tăng lên ${nextLuck} điểm!`);
    };

    const handleSendGift = (e) => {
        e.preventDefault();
        const amount = Number(giftForm.amount) || 0;
        if (amount <= 0 || currentUser.xuHy < amount) {
            alert('Số dư Xu Hỷ của bạn không đủ!');
            return;
        }
        persistUser({
            xuHy: currentUser.xuHy - amount,
            weddingHistory: [
                {
                    groomName: giftForm.groomName,
                    brideName: giftForm.brideName,
                    giftAmount: amount,
                    note: giftForm.note,
                    timestamp: new Date().toISOString()
                },
                ...(currentUser.weddingHistory || [])
            ]
        });
        setTotalGiftPot((p) => p + amount);
        socketRef.current?.emit('send_gift', giftForm);
        addLog(
            `🧧 Đã bỏ phong bì ${amount.toLocaleString()} Xu Hỷ mừng ${giftForm.groomName} & ${giftForm.brideName}!`
        );
        setActiveModal(null);
    };

    // Kiểm thử tải cho cấu hình 2 Map x 500 người (Tổng 1.000 CCU)
    const triggerLoadTest = (totalCCU) => {
        setCcuTarget(totalCCU);
        const perMapCount = Math.floor(totalCCU / 2);
        const renderedBotsCount = Math.min(60, perMapCount); // Hiển thị đại diện mượt 60 FPS
        const names = ['Chú Rể', 'Cô Dâu', 'Minh Khoa', 'Ngọc Ánh', 'Tuấn Kiệt', 'Thảo Tiên'];
        const generated = Array.from({ length: renderedBotsCount }, (_, i) => ({
            id: `bot_${i}`,
            displayName: `${names[i % names.length]} #${i + 1}`,
            gender: i % 2 === 0 ? '♂' : '♀',
            role: i % 2 === 0 ? 'groom' : 'bride',
            outfit: {
                hasCrown: i % 3 === 0,
                primaryColor: i % 2 === 0 ? '#ffffff' : '#ffe4e6'
            },
            x: (Math.random() - 0.5) * 20,
            z: (Math.random() - 0.3) * 18,
            action: i % 4 === 0 ? 'dance' : 'idle',
            chatText: i % 7 === 0 ? 'Chúc mừng hạnh phúc trăm năm!' : ''
        }));
        setSimulatedBots(generated);
        addLog(
            `⚡ Đang mô phỏng ${totalCCU} CCU chia đều 2 Map (${perMapCount}/500 người tại Map hiện tại).`
        );
    };

    const updateJoystickFromPoint = (clientX, clientY, zoneElem) => {
        const rect = zoneElem.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const maxRadius = rect.width * 0.36;

        const rawDx = clientX - centerX;
        const rawDy = clientY - centerY;
        const dist = Math.hypot(rawDx, rawDy);

        const clampedDist = Math.min(dist, maxRadius);
        const angle = Math.atan2(rawDy, rawDx);

        const visualX = Math.cos(angle) * clampedDist;
        const visualY = Math.sin(angle) * clampedDist;

        setKnobOffset({ x: visualX, y: visualY });
        joystickDeltaRef.current = {
            x: Number((visualX / maxRadius).toFixed(2)),
            y: Number((visualY / maxRadius).toFixed(2))
        };
    };

    const resetJoystick = () => {
        joystickActiveRef.current = false;
        setKnobOffset({ x: 0, y: 0 });
        joystickDeltaRef.current = { x: 0, y: 0 };
    };

    if (!currentUser) {
        return (
            <div className="auth-backdrop">
                <div className="auth-card">
                    <h2 style={{ color: '#fde047', textAlign: 'center', marginBottom: 6 }}>
                        💒 ĐÁM CƯỚI ONLINE
                    </h2>
                    <p style={{ textAlign: 'center', fontSize: 13, color: '#fbcfe8', marginBottom: 16 }}>
                    </p>

                    <div
                        style={{
                            background: 'rgba(236, 72, 153, 0.14)',
                            border: '1.5px dashed #f472b6',
                            borderRadius: 14,
                            padding: 12,
                            marginBottom: 16
                        }}
                    >
                        <div
                            style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: '#fde047',
                                textAlign: 'center',
                                marginBottom: 8
                            }}
                        >
                            ⚡ VÀO CHƠI NGAY
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                type="button"
                                className="btn-gold"
                                style={{ flex: 1, justifyContent: 'center', padding: '10px 8px' }}
                                onClick={() => handleQuickPlay('♂')}
                            >
                                🤵 Chơi Ngay (Chú Rể ♂)
                            </button>
                            <button
                                type="button"
                                className="btn-pink"
                                style={{ flex: 1, justifyContent: 'center', padding: '10px 8px' }}
                                onClick={() => handleQuickPlay('♀')}
                            >
                                👰 Chơi Ngay (Cô Dâu ♀)
                            </button>
                        </div>
                    </div>

                    <div
                        style={{
                            textAlign: 'center',
                            fontSize: 12,
                            color: 'rgba(255,255,255,0.6)',
                            marginBottom: 12
                        }}
                    >
                        — HOẶC ĐĂNG NHẬP ĐỂ LƯU TIẾN ĐỘ VĨNH VIỄN —
                    </div>

                    <form onSubmit={handleAuthSubmit}>
                        <label style={{ fontSize: 13 }}>Tên tài khoản</label>
                        <input
                            className="input-field"
                            required
                            value={authForm.username}
                            onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                            placeholder="Ví dụ: chure99"
                        />

                        {authMode !== 'reset' && (
                            <>
                                <label style={{ fontSize: 13 }}>Mật khẩu</label>
                                <input
                                    className="input-field"
                                    type="password"
                                    required
                                    value={authForm.password}
                                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                                    placeholder="••••••••"
                                />
                            </>
                        )}

                        {authMode === 'register' && (
                            <>
                                <label style={{ fontSize: 13 }}>
                                    Tên nhân vật hiển thị (Để trống sẽ mặc định là Chú Rể / Cô Dâu)
                                </label>
                                <input
                                    className="input-field"
                                    value={authForm.displayName}
                                    onChange={(e) => setAuthForm({ ...authForm, displayName: e.target.value })}
                                    placeholder="Chú Rể hoặc Cô Dâu"
                                />
                                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                                    <button
                                        type="button"
                                        className={authForm.gender === '♂' ? 'btn-gold' : 'glass-panel'}
                                        style={{ flex: 1, justifyContent: 'center' }}
                                        onClick={() =>
                                            setAuthForm({ ...authForm, gender: '♂', displayName: 'Chú Rể' })
                                        }
                                    >
                                        ♂ Chú Rể / Nam
                                    </button>
                                    <button
                                        type="button"
                                        className={authForm.gender === '♀' ? 'btn-pink' : 'glass-panel'}
                                        style={{ flex: 1, justifyContent: 'center' }}
                                        onClick={() =>
                                            setAuthForm({ ...authForm, gender: '♀', displayName: 'Cô Dâu' })
                                        }
                                    >
                                        ♀ Cô Dâu / Nữ
                                    </button>
                                </div>
                                <label style={{ fontSize: 13 }}>Mã PIN khôi phục mật khẩu (4 số)</label>
                                <input
                                    className="input-field"
                                    required
                                    value={authForm.recoveryPin}
                                    onChange={(e) => setAuthForm({ ...authForm, recoveryPin: e.target.value })}
                                    placeholder="1234"
                                />
                            </>
                        )}

                        {authMode === 'reset' && (
                            <>
                                <label style={{ fontSize: 13 }}>Nhập mã PIN khôi phục</label>
                                <input
                                    className="input-field"
                                    required
                                    value={authForm.recoveryPin}
                                    onChange={(e) => setAuthForm({ ...authForm, recoveryPin: e.target.value })}
                                    placeholder="Mã PIN lúc đăng ký"
                                />
                                <label style={{ fontSize: 13 }}>Mật khẩu mới</label>
                                <input
                                    className="input-field"
                                    type="password"
                                    required
                                    value={authForm.newPassword}
                                    onChange={(e) => setAuthForm({ ...authForm, newPassword: e.target.value })}
                                />
                            </>
                        )}

                        {statusMsg && (
                            <p style={{ color: '#fda4af', fontSize: 13, marginBottom: 10 }}>{statusMsg}</p>
                        )}

                        <button
                            type="submit"
                            className="btn-gold"
                            style={{ width: '100%', justifyContent: 'center', padding: 12 }}
                        >
                            {authMode === 'login'
                                ? 'Đăng Nhập'
                                : authMode === 'register'
                                    ? 'Đăng Ký Tài Khoản Mới'
                                    : 'Khôi Phục Mật Khẩu'}
                        </button>
                    </form>

                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginTop: 14,
                            fontSize: 13
                        }}
                    >
                        <span
                            style={{ color: '#fde047', cursor: 'pointer' }}
                            onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                        >
                            {authMode === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
                        </span>
                        <span
                            style={{ color: '#f9a8d4', cursor: 'pointer' }}
                            onClick={() => setAuthMode('reset')}
                        >
                            Quên mật khẩu?
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <WeddingScene3D
                mapType={currentRoom === 'room_2' ? 'flower_forest' : 'village'}
                localPlayer={currentUser}
                remotePlayers={remotePlayers}
                simulatedBots={simulatedBots}
                joystickDelta={joystickDeltaRef}
                onMoveLocal={(pos) => {
                    const now = Date.now();
                    // Gửi tối đa 10 lần/giây: giảm tải khi nhiều người chơi.
                    if (now - lastMoveSentAtRef.current >= 100) {
                        lastMoveSentAtRef.current = now;
                        socketRef.current?.emit('move', pos);
                    }
                    // Không ghi MongoDB theo từng frame; lưu tối đa một lần/10 giây.
                    const activeUser = currentUserRef.current || currentUser;
                    if (!activeUser?.isGuest && now - lastPositionSaveAtRef.current >= 10000 &&
                        Number.isFinite(pos?.x) && Number.isFinite(pos?.z)) {
                        lastPositionSaveAtRef.current = now;
                        persistUser({
                            lastPosition: { x: pos.x, z: pos.z },
                            lastRoom: currentRoomRef.current
                        });
                    }
                }}
                onSeatClick={(seatKey, seatPos) => {
                    socketRef.current?.emit('claim_seat', { seatKey, seatPos });
                    addLog(`🪑 Bạn đã giành được ghế tại ${seatKey}! Bấm "Ăn Cỗ" để thưởng thức.`);
                }}
                onCatchBouquet={() => {
                    setBouquetState({ active: false, x: 0, z: 0 });
                    socketRef.current?.emit('catch_bouquet');
                    persistUser({
                        vowLuck: (currentUser.vowLuck || 10) + 50,
                        achievements: Array.from(
                            new Set([...(currentUser.achievements || []), 'Trùm Bắt Hoa Cưới'])
                        )
                    });
                    addLog('💐 Chúc mừng! Bạn đã bắt được hoa cưới (+50 Điểm Xin Vía)!');
                }}
                bouquetState={bouquetState}
                ceremonyStep={ceremonyStep}
                screenshotTrigger={screenshotCount}
                onNpcTalk={(line) => addLog(`👵 ${line}`)}
                coupleInfo={coupleInfo}
                stageTeleportTrigger={stageTeleportTrigger}
            />

            {/* POPUP LỜI CẦU HÔN */}
            {incomingProposal && (
                <div className="auth-backdrop" style={{ zIndex: 99 }}>
                    <div className="auth-card" style={{ textAlign: 'center', borderColor: '#ec4899' }}>
                        <h3 style={{ color: '#fde047', marginBottom: 8 }}>💍 LỜI CẦU HÔN NGỌT NGÀO</h3>
                        <p style={{ fontSize: 15, marginBottom: 16 }}>
                            Người chơi <b style={{ color: '#f472b6' }}>{incomingProposal.fromName}</b> (
                            {incomingProposal.fromGender}) muốn ghép đôi làm <b>Cô Dâu & Chú Rể</b> cùng bạn trên
                            sân khấu chính!
                        </p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                className="btn-pink"
                                style={{ flex: 1, justifyContent: 'center', padding: 12 }}
                                onClick={() => {
                                    socketRef.current?.emit('accept_proposal', {
                                        proposerId: incomingProposal.fromId
                                    });
                                    setIncomingProposal(null);
                                }}
                            >
                                💖 Đồng Ý Kết Hôn!
                            </button>
                            <button
                                className="btn-gold"
                                style={{ flex: 1, justifyContent: 'center', padding: 12 }}
                                onClick={() => setIncomingProposal(null)}
                            >
                                Để Sau Nhé
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Giao diện HUD */}
            <div className="hud-overlay">
                <div className="hud-top">
                    <div className="glass-panel">
                        <div style={{ fontWeight: 700, color: '#fde047', fontSize: 14 }}>
                            👑 {currentUser.displayName} ({currentUser.gender})
                            {currentUser.isGuest && (
                                <span
                                    style={{
                                        marginLeft: 6,
                                        fontSize: 10,
                                        background: '#be185d',
                                        color: '#fff',
                                        padding: '2px 6px',
                                        borderRadius: 6
                                    }}
                                >
                                    Chơi Ngay
                                </span>
                            )}
                        </div>
                        <div style={{ fontSize: 11, marginTop: 3, color: socketStatus === 'connected' ? '#86efac' : '#fda4af' }}>
                            {socketStatus === 'connected' ? '🟢 Đã vào phòng online' : socketStatus === 'connecting' ? '🟡 Đang kết nối phòng online...' : '🔴 Chưa kết nối realtime (chưa thấy người chơi khác)'}
                        </div>
                        <div style={{ fontSize: 11.5, marginTop: 3 }}>
                            💰 <b>{currentUser.xuHy?.toLocaleString()}</b> | 🍗 No: <b>{currentUser.fullness}%</b>{' '}
                            | 🌸 Vía: <b>{currentUser.vowLuck}</b>
                        </div>
                        <div style={{ fontSize: 11.5, color: '#fde047', marginTop: 2 }}>
                            💒 Cặp đôi: <b>{coupleInfo.groomName || 'Chú Rể'}</b> ❤️{' '}
                            <b>{coupleInfo.brideName || 'Cô Dâu'}</b> | 🧧 Quỹ:{' '}
                            <b>{(totalGiftPot / 1000000).toFixed(1)}Tr</b>
                        </div>
                    </div>

                    <div
                        className="glass-panel"
                        style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}
                    >
                        {/* Chọn nhanh giữa Map 1 (Nhà Quê) và Map 2 (Rừng Hoa) */}
                        <select
                            value={currentRoom}
                            onChange={(e) => handleSwitchRoom(e.target.value, e)}
                            style={{
                                background: '#1f122b',
                                color: '#fde047',
                                border: '1px solid #f59e0b',
                                borderRadius: 8,
                                padding: '5px 8px',
                                fontWeight: 700,
                                fontSize: 12
                            }}
                        >
                            <option value="room_1">🏡 Map 1: Nhà Quê (500 người)</option>
                            <option value="room_2">🌸 Map 2: Rừng Hoa (500 người)</option>
                        </select>
                        <button className="btn-pink" onClick={() => setActiveModal('matchmaking')}>
                            💞 Ghép Đôi
                        </button>
                        <button className="btn-gold" onClick={() => setActiveModal('customize')}>
                            👗 Trang Phục
                        </button>
                        <button className="btn-pink" onClick={() => setActiveModal('loadtest')}>
                            ⚡ {ccuTarget ? `${ccuTarget / 2}/500` : `${1 + Object.keys(remotePlayers).length}/500`}
                        </button>
                        <button
                            className="btn-gold"
                            onClick={async () => {
                                if (currentUserRef.current && !currentUserRef.current.isGuest) {
                                    await persistUser({ lastRoom: currentRoomRef.current });
                                }
                                localStorage.removeItem('dco_active_user');
                                localStorage.removeItem('dco_token');
                                setCurrentUser(null);
                                setRemotePlayers({});
                            }}
                        >
                            Thoát
                        </button>
                    </div>
                </div>

                {/* Khu vực điều khiển dưới cùng */}
                <div className="hud-bottom">
                    <div className="mobile-controls-row">
                        <div
                            className="joystick-zone"
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                e.currentTarget.setPointerCapture(e.pointerId);
                                joystickActiveRef.current = true;
                                updateJoystickFromPoint(e.clientX, e.clientY, e.currentTarget);
                            }}
                            onPointerMove={(e) => {
                                if (!joystickActiveRef.current) return;
                                e.stopPropagation();
                                updateJoystickFromPoint(e.clientX, e.clientY, e.currentTarget);
                            }}
                            onPointerUp={(e) => {
                                e.stopPropagation();
                                resetJoystick();
                            }}
                            onPointerCancel={resetJoystick}
                        >
                            <div
                                className="joystick-knob"
                                style={{
                                    transform: `translate(calc(-50% + ${knobOffset.x}px), calc(-50% + ${knobOffset.y}px))`
                                }}
                            />
                        </div>

                        <div
                            className="glass-panel event-log-box"
                            style={{ width: 260, maxHeight: 115, overflowY: 'auto', fontSize: 11.5 }}
                        >
                            <div style={{ fontWeight: 700, color: '#fde047', marginBottom: 3 }}>
                                📢 Tin Tức ({currentRoom === 'room_2' ? 'Map 2: Rừng Hoa' : 'Map 1: Nhà Quê'})
                            </div>
                            {eventLogs.slice(0, 4).map((log, i) => (
                                <div key={i} style={{ marginBottom: 3, opacity: 1 - i * 0.12 }}>
                                    {log}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div
                        className="glass-panel"
                        style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', maxWidth: 680 }}
                    >
                        <div className="action-buttons-scroll">
                            <button
                                className="btn-gold"
                                onClick={(e) => {
                                    const nextRoom = currentRoom === 'room_1' ? 'room_2' : 'room_1';
                                    handleSwitchRoom(nextRoom, e);
                                }}
                            >
                                {currentRoom === 'room_1' ? '🌸 Sang Map Rừng Hoa' : '🏡 Về Map Nhà Quê'}
                            </button>
                            <button className="btn-pink" onClick={() => setActiveModal('matchmaking')}>
                                💞 Ghép Đôi
                            </button>
                            <button className="btn-gold" onClick={handleEatFeast}>
                                🍗 Ăn Cỗ
                            </button>
                            <button className="btn-pink" onClick={() => setActiveModal('gift')}>
                                🧧 Phong Bì
                            </button>
                            <button className="btn-gold" onClick={handleToast}>
                                🍻 Dzô!
                            </button>
                            <button className="btn-gold" onClick={handleDance}>
                                💃 Nhảy
                            </button>
                            <button
                                className="btn-pink"
                                onClick={() => {
                                    const pos = { x: (Math.random() - 0.5) * 8, z: (Math.random() - 0.2) * 6 };
                                    setBouquetState({ active: true, ...pos });
                                    socketRef.current?.emit('toss_bouquet');
                                    addLog('💐 Đã tung hoa cưới! Nhấp vào bó hoa trên sân để bắt!');
                                }}
                            >
                                💐 Tung Hoa
                            </button>
                            <button className="btn-gold" onClick={handlePrayVow}>
                                🌸 Xin Vía
                            </button>
                            <button className="btn-pink" onClick={() => setActiveModal('ceremony')}>
                                💍 Nghi Lễ
                            </button>
                            <button className="btn-gold" onClick={() => setScreenshotCount((c) => c + 1)}>
                                📸 Chụp Ảnh
                            </button>
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (!chatInput.trim()) return;
                                const text = chatInput.trim();
                                persistUser({ chatText: text });
                                socketRef.current?.emit('chat', { text });
                                addLog(`💬 ${currentUser.displayName}: ${text}`);
                                setChatInput('');
                            }}
                            style={{ display: 'flex', gap: 6 }}
                        >
                            <input
                                className="input-field"
                                style={{ margin: 0, padding: '8px 10px', fontSize: 13 }}
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Gửi lời chúc hoặc rủ ghép đôi..."
                            />
                            <button type="submit" className="btn-gold">
                                Gửi
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* MODAL GHÉP ĐÔI */}
            {activeModal === 'matchmaking' && (
                <div className="auth-backdrop" onClick={() => setActiveModal(null)}>
                    <div className="auth-card" onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ color: '#fde047', marginBottom: 8 }}>
                            💞 Ghép Đôi Cô Dâu & Chú Rể Trên Sân Khấu
                        </h3>
                        <p style={{ fontSize: 13, color: '#fbcfe8', marginBottom: 12 }}>
                            Chọn một người chơi đang có mặt trong Map để gửi lời cầu hôn, hoặc ghép đôi nhanh lên
                            sân khấu chính!
                        </p>

                        <div style={{ maxHeight: 180, overflowY: 'auto', marginBottom: 14 }}>
                            {Object.values(remotePlayers).length === 0 ? (
                                <div
                                    style={{
                                        padding: 12,
                                        borderRadius: 10,
                                        background: 'rgba(255,255,255,0.06)',
                                        fontSize: 13,
                                        textAlign: 'center'
                                    }}
                                >
                                    Hiện chưa có người chơi thứ 2 trong Map này. Hãy mở thêm 1 tab hoặc bấm nút ghép
                                    đôi nhanh bên dưới!
                                </div>
                            ) : (
                                Object.values(remotePlayers).map((p) => (
                                    <div
                                        key={p.id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '8px 12px',
                                            marginBottom: 8,
                                            borderRadius: 10,
                                            background: 'rgba(255,255,255,0.08)'
                                        }}
                                    >
                                        <span>
                                            <b>{p.displayName}</b> ({p.gender})
                                        </span>
                                        <button
                                            className="btn-pink"
                                            onClick={() => {
                                                socketRef.current?.emit('send_proposal', { targetId: p.id });
                                                addLog(`💌 Đã gửi lời cầu hôn tới ${p.displayName}!`);
                                                setActiveModal(null);
                                            }}
                                        >
                                            💍 Cầu Hôn Ngay
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <button
                            className="btn-gold"
                            style={{ width: '100%', justifyContent: 'center', marginBottom: 8, padding: 11 }}
                            onClick={handleMatchWithPartnerBot}
                        >
                            ✨ Ghép Đôi Lên Sân Khấu Ngay Với{' '}
                            {currentUser.gender === '♂' ? 'Cô Dâu' : 'Chú Rể'}
                        </button>

                        <button
                            className="btn-pink"
                            style={{ width: '100%', justifyContent: 'center' }}
                            onClick={() => setActiveModal(null)}
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Đổi Trang Phục */}
            {activeModal === 'customize' && (
                <div className="auth-backdrop" onClick={() => setActiveModal(null)}>
                    <div className="auth-card" onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ color: '#fde047', marginBottom: 12 }}>👑 Tùy Chỉnh Nhân Vật Chibi</h3>
                        <label style={{ fontSize: 13 }}>Tên hiển thị</label>
                        <input
                            className="input-field"
                            value={currentUser.displayName}
                            onChange={(e) => persistUser({ displayName: e.target.value })}
                        />
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                            <button
                                className="btn-gold"
                                onClick={() =>
                                    persistUser({
                                        gender: '♂',
                                        role: 'groom',
                                        displayName:
                                            currentUser.displayName === 'Cô Dâu' ? 'Chú Rể' : currentUser.displayName,
                                        outfit: { ...currentUser.outfit, primaryColor: '#ffffff', hasCrown: true }
                                    })
                                }
                            >
                                🤵 Chú Rể
                            </button>
                            <button
                                className="btn-pink"
                                onClick={() =>
                                    persistUser({
                                        gender: '♀',
                                        role: 'bride',
                                        displayName:
                                            currentUser.displayName === 'Chú Rể' ? 'Cô Dâu' : currentUser.displayName,
                                        outfit: { ...currentUser.outfit, primaryColor: '#ffffff', hasCrown: true }
                                    })
                                }
                            >
                                👰 Cô Dâu
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                            <button
                                className="btn-gold"
                                onClick={() =>
                                    persistUser({
                                        role: 'tray',
                                        outfit: { ...currentUser.outfit, primaryColor: '#ef4444' }
                                    })
                                }
                            >
                                🧧 Đội Bê Tráp Áo Dài Đỏ
                            </button>
                            <button
                                className="btn-gold"
                                onClick={() =>
                                    persistUser({
                                        outfit: { ...currentUser.outfit, hasCrown: !currentUser.outfit?.hasCrown }
                                    })
                                }
                            >
                                👑 Bật/Tắt Vương Miện
                            </button>
                        </div>
                        <button
                            className="btn-gold"
                            style={{ width: '100%', justifyContent: 'center' }}
                            onClick={() => setActiveModal(null)}
                        >
                            Hoàn Tất
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Bỏ Phong Bì */}
            {activeModal === 'gift' && (
                <div className="auth-backdrop" onClick={() => setActiveModal(null)}>
                    <div className="auth-card" onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ color: '#fde047', marginBottom: 12 }}>🧧 Bỏ Phong Bì Mừng Cưới</h3>
                        <form onSubmit={handleSendGift}>
                            <label style={{ fontSize: 13 }}>Số tiền mừng (Xu Hỷ)</label>
                            <input
                                type="number"
                                className="input-field"
                                value={giftForm.amount}
                                onChange={(e) => setGiftForm({ ...giftForm, amount: e.target.value })}
                            />
                            <label style={{ fontSize: 13 }}>Lời chúc trăm năm</label>
                            <input
                                className="input-field"
                                value={giftForm.note}
                                onChange={(e) => setGiftForm({ ...giftForm, note: e.target.value })}
                            />
                            <button
                                type="submit"
                                className="btn-pink"
                                style={{ width: '100%', justifyContent: 'center' }}
                            >
                                Gửi Phong Bì Vào Thùng Tim
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Nghi Lễ */}
            {activeModal === 'ceremony' && (
                <div className="auth-backdrop" onClick={() => setActiveModal(null)}>
                    <div className="auth-card" onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ color: '#fde047', marginBottom: 12 }}>💍 Tổ Chức Nghi Lễ Thành Hôn</h3>
                        {[
                            'Bước 1: Rước Dâu qua Cổng Hoa',
                            'Bước 2: Cô Dâu & Chú Rể Trao Nhẫn Cưới',
                            'Bước 3: Cắt Bánh Cưới 3 Tầng & Rót Rượu Champagne',
                            'Bước 4: Tung Hoa Cưới & Nhảy Đầm Cùng Khách Mời'
                        ].map((label, idx) => (
                            <button
                                key={idx}
                                className="btn-gold"
                                style={{ width: '100%', marginBottom: 8, justifyContent: 'flex-start' }}
                                onClick={() => {
                                    setCeremonyStep(idx + 1);
                                    socketRef.current?.emit('ceremony_step', { step: idx + 1 });
                                    addLog(`🎊 MC Đám Cưới: Bắt đầu "${label}"!`);
                                    setActiveModal(null);
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal Kiểm Thử Tải 2 Map x 500 CCU */}
            {activeModal === 'loadtest' && (
                <div className="auth-backdrop" onClick={() => setActiveModal(null)}>
                    <div className="auth-card" onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ color: '#fde047', marginBottom: 10 }}>
                            ⚡ Kiểm Thử Tải 2 Map (500 Người / Map)
                        </h3>
                        <p style={{ fontSize: 13, marginBottom: 12 }}>
                            Hệ thống chia 1.000 người chơi vào 2 Map (Map 1: Nhà Quê - 500 người & Map 2: Rừng Hoa
                            - 500 người).
                        </p>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                            {[200, 500, 1000].map((count) => (
                                <button key={count} className="btn-pink" onClick={() => triggerLoadTest(count)}>
                                    Mô phỏng {count} CCU ({count / 2}/Map)
                                </button>
                            ))}
                            <button
                                className="btn-gold"
                                onClick={() => {
                                    setSimulatedBots([]);
                                    setCcuTarget(0);
                                }}
                            >
                                Tắt Bot Mô Phỏng
                            </button>
                        </div>
                        <button
                            className="btn-gold"
                            style={{ width: '100%', justifyContent: 'center' }}
                            onClick={() => setActiveModal(null)}
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}