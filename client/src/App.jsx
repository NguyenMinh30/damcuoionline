import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import WeddingScene3D from './components/WeddingScene3D';

const BACKEND_URL = 'http://localhost:4000';

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

    const addLog = (msg) => {
        setEventLogs((prev) => [msg, ...prev.slice(0, 7)]);
    };

    useEffect(() => {
        const savedSession = localStorage.getItem('dco_active_user');
        if (savedSession) {
            try {
                const parsed = JSON.parse(savedSession);
                if (parsed && !parsed.isGuest) {
                    setCurrentUser({
                        ...parsed,
                        lastPosition: {
                            x: Number(parsed.lastPosition?.x) || 0,
                            z: Number(parsed.lastPosition?.z) || 8
                        }
                    });
                }
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    const persistUser = async (updatedUser) => {
        setCurrentUser(updatedUser);
        if (updatedUser.isGuest) return;

        localStorage.setItem('dco_active_user', JSON.stringify(updatedUser));
        localStorage.setItem(`dco_user_${updatedUser.username}`, JSON.stringify(updatedUser));

        const token = localStorage.getItem('dco_token');
        if (token) {
            try {
                await fetch(`${BACKEND_URL}/api/user/save`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(updatedUser)
                });
            } catch {
                // Lưu cục bộ an toàn
            }
        }
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
            lastPosition: { x: 0, z: 8 }
        };

        setCurrentUser(guestUser);
        addLog('⚡ Bạn đang ở chế độ Chơi Ngay (Tiến trình sẽ không được lưu khi thoát).');
    };

    useEffect(() => {
        if (!currentUser) return;

        const socket = io(BACKEND_URL, { reconnectionAttempts: 3 });
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('join_room', { roomId: currentRoom, playerProfile: currentUser });
        });

        socket.on('room_state', (data) => {
            const others = { ...data.players };
            delete others[socket.id];
            setRemotePlayers(others);
            setTotalGiftPot(data.totalGiftPot);
            setCeremonyStep(data.ceremonyStep);
            if (data.couple) setCoupleInfo(data.couple);
        });

        socket.on('player_joined', (p) => {
            setRemotePlayers((prev) => ({ ...prev, [p.id]: p }));
            addLog(`👋 ${p.displayName} vừa bước vào ${currentRoom === 'room_2' ? 'Rừng Hoa' : 'Rạp Cưới Quê'}!`);
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
                setCurrentUser((prev) => ({
                    ...prev,
                    role: 'groom',
                    outfit: { ...prev.outfit, hasCrown: true, primaryColor: '#ffffff' },
                    chatText: `💍 Anh đồng ý! Mãi yêu ${couple.brideName}!`
                }));
            } else if (socket.id === bridePos.id) {
                setStageTeleportTrigger({ x: bridePos.x, z: bridePos.z, t: Date.now() });
                setCurrentUser((prev) => ({
                    ...prev,
                    role: 'bride',
                    outfit: { ...prev.outfit, hasCrown: true, primaryColor: '#ffffff' },
                    chatText: `💍 Em đồng ý! Trăm năm hạnh phúc bên ${couple.groomName}!`
                }));
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

        return () => socket.disconnect();
    }, [currentUser?.username, currentRoom]);

    async function sha256(str) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
        return Array.from(new Uint8Array(buf))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    }

    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        setStatusMsg('');
        const uname = authForm.username.trim().toLowerCase();
        const finalDisplayName =
            authForm.displayName.trim() || (authForm.gender === '♀' ? 'Cô Dâu' : 'Chú Rể');

        try {
            const endpoint =
                authMode === 'register'
                    ? '/api/auth/register'
                    : authMode === 'login'
                        ? '/api/auth/login'
                        : '/api/auth/reset-password';

            const bodyData = { ...authForm, displayName: finalDisplayName };
            const res = await fetch(`${BACKEND_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Lỗi xác thực');

            if (authMode === 'reset') {
                setStatusMsg(data.message);
                setAuthMode('login');
                return;
            }

            localStorage.setItem('dco_token', data.token);
            persistUser({
                ...data.user,
                isGuest: false,
                lastPosition: {
                    x: Number(data.user?.lastPosition?.x) || 0,
                    z: Number(data.user?.lastPosition?.z) || 8
                }
            });
        } catch {
            const key = `dco_user_${uname}`;
            const existingRaw = localStorage.getItem(key);

            if (authMode === 'register') {
                if (existingRaw) {
                    setStatusMsg('Tài khoản này đã tồn tại!');
                    return;
                }
                const passHash = await sha256(authForm.password);
                const pinHash = await sha256(authForm.recoveryPin);
                const newUser = {
                    isGuest: false,
                    username: uname,
                    passHash,
                    pinHash,
                    displayName: finalDisplayName,
                    gender: authForm.gender,
                    role: authForm.gender === '♀' ? 'bride' : 'groom',
                    outfit: {
                        hasCrown: true,
                        primaryColor: '#ffffff',
                        accentColor: '#ff69b4'
                    },
                    xuHy: 500000,
                    fullness: 60,
                    vowLuck: 15,
                    inventory: ['Vương miện Hoàng Gia', 'Nhẫn Kim Cương', 'Phong bì Đỏ'],
                    achievements: ['Khách mời danh dự'],
                    friends: ['Chú Rể', 'Cô Dâu'],
                    weddingHistory: [],
                    lastPosition: { x: 0, z: 8 }
                };
                persistUser(newUser);
            } else if (authMode === 'login') {
                if (!existingRaw) {
                    setStatusMsg('Tài khoản chưa được đăng ký!');
                    return;
                }
                const saved = JSON.parse(existingRaw);
                const passHash = await sha256(authForm.password);
                if (saved.passHash !== passHash) {
                    setStatusMsg('Mật khẩu không chính xác!');
                    return;
                }
                persistUser({
                    ...saved,
                    isGuest: false,
                    lastPosition: {
                        x: Number(saved.lastPosition?.x) || 0,
                        z: Number(saved.lastPosition?.z) || 8
                    }
                });
            } else if (authMode === 'reset') {
                if (!existingRaw) {
                    setStatusMsg('Không tìm thấy tài khoản!');
                    return;
                }
                const saved = JSON.parse(existingRaw);
                const pinHash = await sha256(authForm.recoveryPin);
                if (saved.pinHash !== pinHash) {
                    setStatusMsg('Mã PIN khôi phục không đúng!');
                    return;
                }
                saved.passHash = await sha256(authForm.newPassword);
                localStorage.setItem(key, JSON.stringify(saved));
                setStatusMsg('Đặt lại mật khẩu thành công! Mời bạn đăng nhập.');
                setAuthMode('login');
            }
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
            ...currentUser,
            role: isPlayerMale ? 'groom' : 'bride',
            outfit: { ...currentUser.outfit, hasCrown: true, primaryColor: '#ffffff' },
            chatText: `💍 Sánh đôi cùng ${partnerName}!`
        });
        addLog(`💒 Bạn đã ghép đôi làm lễ cùng "${partnerName}" ngay trên sân khấu chính!`);
        setActiveModal(null);
    };

    const handleEatFeast = () => {
        const updated = {
            ...currentUser,
            fullness: Math.min(100, (currentUser.fullness || 50) + 20),
            xuHy: currentUser.xuHy + 20000,
            chatText: '🍗 Gà luộc lá chanh + xôi gấc ngon tuyệt!'
        };
        persistUser(updated);
        addLog('🍗 Bạn vừa thưởng thức mâm cỗ (+20% No bụng, +20.000 Xu Hỷ)!');
    };

    const handleToast = () => {
        const updated = {
            ...currentUser,
            action: 'toast',
            chatText: '🍻 1, 2, 3 Dzôôô! Trăm năm hạnh phúc!'
        };
        persistUser(updated);
        socketRef.current?.emit('chat', { text: updated.chatText });
    };

    const handleDance = () => {
        const nextAction = currentUser.action === 'dance' ? 'idle' : 'dance';
        const updated = {
            ...currentUser,
            action: nextAction,
            chatText: nextAction === 'dance' ? '💃 Nhạc đám cưới cực sung!' : ''
        };
        persistUser(updated);
    };

    const handlePrayVow = () => {
        const updated = {
            ...currentUser,
            vowLuck: (currentUser.vowLuck || 10) + 15,
            chatText: '🌸 Xin vía năm nay thoát ế, cưới liền tay!'
        };
        persistUser(updated);
        addLog(`🌸 Điểm Duyên Phận của bạn tăng lên ${updated.vowLuck} điểm!`);
    };

    const handleSendGift = (e) => {
        e.preventDefault();
        const amount = Number(giftForm.amount) || 0;
        if (amount <= 0 || currentUser.xuHy < amount) {
            alert('Số dư Xu Hỷ của bạn không đủ!');
            return;
        }
        const updated = {
            ...currentUser,
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
        };
        persistUser(updated);
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
                    socketRef.current?.emit('move', pos);
                }}
                onSeatClick={(seatKey, seatPos) => {
                    socketRef.current?.emit('claim_seat', { seatKey, seatPos });
                    addLog(`🪑 Bạn đã giành được ghế tại ${seatKey}! Bấm "Ăn Cỗ" để thưởng thức.`);
                }}
                onCatchBouquet={() => {
                    setBouquetState({ active: false, x: 0, z: 0 });
                    socketRef.current?.emit('catch_bouquet');
                    const updated = {
                        ...currentUser,
                        vowLuck: (currentUser.vowLuck || 10) + 50,
                        achievements: Array.from(
                            new Set([...(currentUser.achievements || []), 'Trùm Bắt Hoa Cưới'])
                        )
                    };
                    persistUser(updated);
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
                            onChange={(e) => {
                                setCurrentRoom(e.target.value);
                                addLog(
                                    e.target.value === 'room_2'
                                        ? '🌸 Đã chuyển sang Map 2: Đám Cưới Rừng Hoa (Tối đa 500 người)!'
                                        : '🏡 Đã chuyển sang Map 1: Đám Cưới Nhà Quê (Tối đa 500 người)!'
                                );
                            }}
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
                            onClick={() => {
                                if (!currentUser.isGuest) {
                                    localStorage.removeItem('dco_active_user');
                                }
                                setCurrentUser(null);
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
                                onClick={() =>
                                    setCurrentRoom((prev) => (prev === 'room_1' ? 'room_2' : 'room_1'))
                                }
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
                                const updated = { ...currentUser, chatText: chatInput.trim() };
                                persistUser(updated);
                                socketRef.current?.emit('chat', { text: chatInput.trim() });
                                addLog(`💬 ${currentUser.displayName}: ${chatInput.trim()}`);
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
                            onChange={(e) => persistUser({ ...currentUser, displayName: e.target.value })}
                        />
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                            <button
                                className="btn-gold"
                                onClick={() =>
                                    persistUser({
                                        ...currentUser,
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
                                        ...currentUser,
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
                                        ...currentUser,
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
                                        ...currentUser,
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