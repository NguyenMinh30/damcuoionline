
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createChibiCharacterTexture } from '../utils/chibiRenderer';

const NPCS = [
    {
        id: 'npc_co_ba',
        displayName: 'Hàng Xóm',
        gender: '♀',
        role: 'guest',
        hasCrown: false,
        primaryColor: '#d946ef',
        x: -5.2,
        z: 6.5,
        quotes: [
            'Cô dâu chú rể đẹp đôi quá, đúng là lứa đôi hoàn hảo nhất cái xóm này!',
            'Đám cưới to và hoành tráng nhất khu phố rồi',
            'Đúng là gái ngoan trai giỏi gặp nhau, nhìn hai đứa quá hợp nhau!'
        ]
    },
    {
        id: 'npc_chu_bay',
        displayName: 'Trưởng Họ',
        gender: '♂',
        role: 'guest',
        hasCrown: false,
        primaryColor: '#eab308',
        x: 5.5,
        z: 5.0,
        quotes: [
            '1, 2, 3 Dzô! Trăm phần trăm nhé các cháu!',
            'Chú rể phong độ, cô dâu nết na, thật xứng danh con cháu gia đình có giáo dục!',
            'Không khí hỉ sự tưng bừng thế này thì gia đình mình năm nay cầm chắc tài lộc, may mắn rồi'
        ]
    }
];

function createBannerTexture(title, subtitle, bgColor = '#b91c1c', borderColor = '#fde047') {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Viền kép họa tiết cung đình
    ctx.lineWidth = 12;
    ctx.strokeStyle = borderColor;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 68px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, canvas.width / 2, 115);

    if (subtitle) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 40px "Segoe UI", sans-serif';
        ctx.fillText(subtitle, canvas.width / 2, 192);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
}

// Huy hiệu tròn chữ Song Hỷ (囍) gắn trên đỉnh vòm cổng cưới
function createSongHyCrestTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.arc(128, 128, 116, 0, Math.PI * 2);
    ctx.fillStyle = '#dc2626';
    ctx.fill();
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#fde047';
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 135px "Segoe UI", serif';
    ctx.textAlign = 'center';
    ctx.fillText('囍', 128, 176);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
}

function createStageBackdropTexture(
    groomName = 'Chú Rể',
    brideName = 'Cô Dâu',
    mapType = 'village'
) {
    const cleanGroom =
        !groomName || groomName === 'Hải Tuân' ? 'Chú Rể' : String(groomName).slice(0, 12);
    const cleanBride =
        !brideName || brideName === 'Là Em Đây' ? 'Cô Dâu' : String(brideName).slice(0, 12);

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (mapType === 'flower_forest') {
        grad.addColorStop(0, '#fdf2f8');
        grad.addColorStop(1, '#fbcfe8');
    } else {
        grad.addColorStop(0, '#fffbeb');
        grad.addColorStop(1, '#fde68a');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 18;
    ctx.strokeStyle = mapType === 'flower_forest' ? '#ec4899' : '#d97706';
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    ctx.beginPath();
    ctx.arc(canvas.width / 2, 135, 90, 0, Math.PI * 2);
    ctx.fillStyle = mapType === 'flower_forest' ? '#db2777' : '#dc2626';
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#fde047';
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 110px "Segoe UI", serif';
    ctx.textAlign = 'center';
    ctx.fillText('囍', canvas.width / 2, 174);

    ctx.fillStyle = mapType === 'flower_forest' ? '#831843' : '#991b1b';
    ctx.font = 'bold 48px "Segoe UI", sans-serif';
    ctx.fillText(
        mapType === 'flower_forest' ? 'LỄ THÀNH HÔN RỪNG HOA' : 'LỄ THÀNH HÔN',
        canvas.width / 2,
        285
    );

    ctx.fillStyle = '#be185d';
    ctx.font = 'bold 60px "Segoe UI", sans-serif';
    ctx.fillText(`${cleanGroom}  ❤️  ${cleanBride}`, canvas.width / 2, 360);

    ctx.fillStyle = mapType === 'flower_forest' ? '#9d174d' : '#78350f';
    ctx.font = 'italic 31px "Segoe UI", sans-serif';
    ctx.fillText('Trăm Năm Tình Viên Mãn - Bạc Đầu Nghĩa Phu Thê', canvas.width / 2, 420);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
}

function createCourtyardTileTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#431407';
    ctx.lineWidth = 4;
    for (let x = 0; x <= 256; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 256);
        ctx.stroke();
    }
    for (let y = 0; y <= 256; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y);
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(14, 14);
    return tex;
}

function createFlowerMeadowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#132a1f';
    ctx.fillRect(0, 0, 256, 256);

    const leafColors = ['#15803d', '#166534', '#14532d'];
    for (let i = 0; i < 90; i++) {
        ctx.fillStyle = leafColors[i % leafColors.length];
        ctx.fillRect((i * 29) % 256, (i * 53) % 256, 3, 7);
    }

    const petalColors = ['#f472b6', '#fbcfe8', '#fde047', '#f9a8d4', '#fb7185'];
    for (let i = 0; i < 45; i++) {
        ctx.beginPath();
        ctx.arc((i * 41) % 256, (i * 67) % 256, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = petalColors[i % petalColors.length];
        ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(14, 14);
    return tex;
}

// 1. Dựng một dây Tua Rua (Tassel) có hạt ngọc, bầu tua rua và đuôi lụa mềm
function createSilkTassel({ x = 0, y = 0, z = 0, color = '#ef4444', length = 0.65 }) {
    const tasselGroup = new THREE.Group();
    const goldMat = new THREE.MeshStandardMaterial({
        color: '#fde047',
        emissive: '#b45309',
        emissiveIntensity: 0.3,
        roughness: 0.3
    });
    const silkMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.22,
        roughness: 0.5
    });

    // Dây treo vàng kim phía trên
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.18, 8), goldMat);
    cord.position.y = -0.09;
    tasselGroup.add(cord);

    // Hạt nút thắt ngọc vàng
    const knot = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 1), goldMat);
    knot.position.y = -0.19;
    tasselGroup.add(knot);

    // Cổ tua rua bọc chỉ vàng
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.075, 0.08, 10), goldMat);
    collar.position.y = -0.26;
    tasselGroup.add(collar);

    // Thân chùm tơ lụa xòe nhẹ phía dưới
    const fringe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.11, length, 12),
        silkMat
    );
    fringe.position.y = -0.3 - length / 2;
    tasselGroup.add(fringe);

    tasselGroup.position.set(x, y, z);
    return tasselGroup;
}

// 2. Dựng Đèn Lồng Cung Đình kèm Đuôi Tua Rua Lụa Dài
function createPalaceLanternWithTassel({ x, y, z, mainColor = '#ef4444' }) {
    const group = new THREE.Group();
    const goldMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.3 });
    const bodyMat = new THREE.MeshStandardMaterial({
        color: mainColor,
        emissive: mainColor,
        emissiveIntensity: 0.65,
        roughness: 0.4
    });

    // Móc treo & Nắp trên đèn lồng
    const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.25, 8), goldMat);
    hook.position.y = -0.12;
    const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.1, 12), goldMat);
    topCap.position.y = -0.26;

    // Bầu đèn lồng 8 múi
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.52, 12), bodyMat);
    body.position.y = -0.55;

    // Đế dưới đèn lồng
    const botCap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.16, 0.1, 12), goldMat);
    botCap.position.y = -0.84;

    // Đuôi tua rua vàng rủ dài dưới đáy đèn lồng
    const bottomTassel = createSilkTassel({
        x: 0,
        y: -0.88,
        z: 0,
        color: '#fde047',
        length: 0.62
    });

    group.add(hook, topCap, body, botCap, bottomTassel);
    group.position.set(x, y, z);
    return group;
}

// 3. Dựng Cổng Cưới Hoàng Gia Đầy Đủ Mái Vòm Song Hỷ & Dàn Tua Rua
function createOrnateWeddingGate(isFlowerForest) {
    const gateGroup = new THREE.Group();
    const swayingTassels = [];

    const gateHeight = isFlowerForest ? 6.4 : 5.4;
    const bannerY = isFlowerForest ? 6.1 : 5.1;
    const mainThemeColor = isFlowerForest ? '#be185d' : '#b91c1c';
    const secondaryColor = isFlowerForest ? '#ec4899' : '#dc2626';
    const goldMat = new THREE.MeshStandardMaterial({
        color: '#fbbf24',
        emissive: '#92400e',
        emissiveIntensity: 0.2,
        roughness: 0.35
    });

    // Đế trụ đá hoa cương kê 2 cột cổng
    [-3.2, 3.2].forEach((px) => {
        const pedestal = new THREE.Mesh(
            new THREE.BoxGeometry(0.95, 0.55, 0.95),
            new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.7 })
        );
        pedestal.position.set(px, 0.275, 13.5);

        const goldTrim = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.1, 1.02), goldMat);
        goldTrim.position.set(px, 0.56, 13.5);
        gateGroup.add(pedestal, goldTrim);

        // Thân cột chính sơn son thếp vàng
        const pillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.34, gateHeight, 16),
            new THREE.MeshStandardMaterial({ color: mainThemeColor, roughness: 0.45 })
        );
        pillar.position.set(px, gateHeight / 2, 13.5);
        gateGroup.add(pillar);

        // Vòng đai vàng trang trí thân cột
        [1.6, 3.0, 4.2].forEach((ry) => {
            const ring = new THREE.Mesh(
                new THREE.CylinderGeometry(0.35, 0.35, 0.1, 16),
                goldMat
            );
            ring.position.set(px, ry, 13.5);
            gateGroup.add(ring);
        });

        // Giữ tua rua vàng, đã xóa hai dải rèm đỏ chéo
        const curtainTassel = createSilkTassel({
            x: px + (px < 0 ? 0.35 : -0.35),
            y: bannerY - 2.6,
            z: 13.78,
            color: '#fde047',
            length: 0.55
        });
        gateGroup.add(curtainTassel);
        swayingTassels.push(curtainTassel);
    });

    // Bảng hiệu chính "LỄ THÀNH HÔN / VƯỜN HOA TÌNH YÊU"
    const gateBannerTex = createBannerTexture(
        isFlowerForest ? 'VƯỜN HOA TÌNH YÊU' : 'LỄ THÀNH HÔN',
        'TRĂM NĂM HẠNH PHÚC',
        mainThemeColor,
        '#fde047'
    );
    const archBanner = new THREE.Mesh(
        new THREE.BoxGeometry(7.4, 1.45, 0.45),
        new THREE.MeshStandardMaterial({ map: gateBannerTex, roughness: 0.4 })
    );
    archBanner.position.set(0, bannerY, 13.5);
    gateGroup.add(archBanner);

    // MÁI CỔNG UỐN VÒM CUNG ĐÌNH & HUY HIỆU SONG HỶ
    const lowerEave = new THREE.Mesh(
        new THREE.BoxGeometry(8.2, 0.22, 0.85),
        goldMat
    );
    lowerEave.position.set(0, bannerY + 0.82, 13.5);
    gateGroup.add(lowerEave);

    // Mái ngói đỏ / hồng 2 dốc thoải thanh thoát trên đỉnh cổng
    const leftRoofSlope = new THREE.Mesh(
        new THREE.BoxGeometry(4.4, 0.2, 0.78),
        new THREE.MeshStandardMaterial({ color: secondaryColor, roughness: 0.5 })
    );
    leftRoofSlope.position.set(-1.95, bannerY + 1.18, 13.5);
    leftRoofSlope.rotation.z = 0.18;

    const rightRoofSlope = new THREE.Mesh(
        new THREE.BoxGeometry(4.4, 0.2, 0.78),
        new THREE.MeshStandardMaterial({ color: secondaryColor, roughness: 0.5 })
    );
    rightRoofSlope.position.set(1.95, bannerY + 1.18, 13.5);
    rightRoofSlope.rotation.z = -0.18;

    // Đầu đao uốn cong vút nhẹ ở 2 đầu mái cổng kèm 2 dây tua rua góc mái
    [-4.1, 4.1].forEach((tipX) => {
        const roofTip = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.82), goldMat);
        roofTip.position.set(tipX, bannerY + 0.92, 13.5);
        roofTip.rotation.z = tipX < 0 ? -0.35 : 0.35;
        gateGroup.add(roofTip);

        const eaveTassel = createSilkTassel({
            x: tipX,
            y: bannerY + 0.82,
            z: 13.5,
            color: isFlowerForest ? '#f472b6' : '#ef4444',
            length: 0.58
        });
        gateGroup.add(eaveTassel);
        swayingTassels.push(eaveTassel);
    });

    // Huy hiệu tròn chữ Song Hỷ (囍) tỏa sáng ở chính giữa đỉnh cổng
    const crestTex = createSongHyCrestTexture();
    const centerCrest = new THREE.Mesh(
        new THREE.CylinderGeometry(0.62, 0.62, 0.16, 28),
        new THREE.MeshStandardMaterial({ map: crestTex })
    );
    centerCrest.rotation.x = Math.PI / 2;
    centerCrest.position.set(0, bannerY + 1.48, 13.55);
    gateGroup.add(leftRoofSlope, rightRoofSlope, centerCrest);

    // DÀN TUA RUA LỤA VÀNG & ĐỎ/HỒNG RỦ DỌC DƯỚI BẢNG HIỆU
    const fringeBottomY = bannerY - 0.72;
    for (let i = -6; i <= 6; i++) {
        const tx = i * 0.48;
        const isGold = i % 2 === 0;
        const tasselLen = 0.42 + Math.cos((i / 6) * Math.PI) * 0.18;
        const tassel = createSilkTassel({
            x: tx,
            y: fringeBottomY,
            z: 13.68,
            color: isGold ? '#fde047' : isFlowerForest ? '#f472b6' : '#ef4444',
            length: tasselLen
        });
        gateGroup.add(tassel);
        swayingTassels.push(tassel);
    }

    // 2 Đèn Lồng Cung Đình kèm Đuôi Tua Rua Dài
    [-2.35, 2.35].forEach((lx) => {
        const lantern = createPalaceLanternWithTassel({
            x: lx,
            y: fringeBottomY,
            z: 13.5,
            mainColor: isFlowerForest ? '#ec4899' : '#ef4444'
        });
        gateGroup.add(lantern);
        swayingTassels.push(lantern);
    });

    return { gateGroup, swayingTassels };
}

// 4. Dựng cây thân gỗ có rễ, cành vươn ra và nhiều tầng tán lá đa giác tự nhiên
function createNaturalTree({
    x = 0,
    z = 0,
    scale = 1,
    trunkColor = '#4a2c11',
    foliageColors = ['#15803d', '#16a34a', '#22c55e'],
    emissiveColor = '#052e16',
    emissiveIntensity = 0.12,
    hasHangingVines = false
}) {
    const group = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({
        color: trunkColor,
        roughness: 0.9,
        flatShading: true
    });

    const baseRoot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32 * scale, 0.58 * scale, 0.9 * scale, 7),
        trunkMat
    );
    baseRoot.position.y = 0.45 * scale;
    group.add(baseRoot);

    const mainTrunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18 * scale, 0.34 * scale, 3.2 * scale, 7),
        trunkMat
    );
    mainTrunk.position.y = 2.0 * scale;
    mainTrunk.rotation.z = 0.04;
    group.add(mainTrunk);

    const branchConfigs = [
        { rx: 0.45, rz: 0.52, y: 2.7, dx: -0.55, dz: 0.45, len: 1.8 },
        { rx: -0.42, rz: -0.48, y: 2.85, dx: 0.58, dz: -0.42, len: 1.9 },
        { rx: 0.5, rz: -0.38, y: 3.1, dx: 0.45, dz: 0.55, len: 1.6 },
        { rx: -0.48, rz: 0.42, y: 3.2, dx: -0.48, dz: -0.52, len: 1.7 }
    ];

    branchConfigs.forEach((b) => {
        const branch = new THREE.Mesh(
            new THREE.CylinderGeometry(0.07 * scale, 0.15 * scale, b.len * scale, 6),
            trunkMat
        );
        branch.position.set(b.dx * scale, b.y * scale, b.dz * scale);
        branch.rotation.set(b.rx, 0, b.rz);
        group.add(branch);
    });

    const puffOffsets = [
        { x: 0, y: 4.5, z: 0, sx: 1.65, sy: 0.85, sz: 1.55, r: 0.2 },
        { x: -1.15, y: 3.65, z: 0.75, sx: 1.25, sy: 0.72, sz: 1.15, r: 0.5 },
        { x: 1.2, y: 3.75, z: -0.65, sx: 1.3, sy: 0.75, sz: 1.2, r: 1.1 },
        { x: 0.85, y: 3.55, z: 0.95, sx: 1.15, sy: 0.7, sz: 1.15, r: 2.0 },
        { x: -0.95, y: 3.8, z: -0.85, sx: 1.2, sy: 0.75, sz: 1.1, r: 0.8 },
        { x: -0.55, y: 4.35, z: 0.45, sx: 1.1, sy: 0.75, sz: 1.05, r: 1.4 },
        { x: 0.65, y: 4.25, z: -0.45, sx: 1.15, sy: 0.78, sz: 1.05, r: 2.5 },
        { x: 0, y: 3.35, z: 1.25, sx: 0.95, sy: 0.62, sz: 0.95, r: 0.4 },
        { x: 0, y: 3.4, z: -1.25, sx: 0.98, sy: 0.65, sz: 0.95, r: 1.7 }
    ];

    const puffGeo = new THREE.DodecahedronGeometry(1.0 * scale, 1);
    const puffMats = foliageColors.map(
        (c) =>
            new THREE.MeshStandardMaterial({
                color: c,
                emissive: emissiveColor,
                emissiveIntensity,
                roughness: 0.75,
                flatShading: true
            })
    );

    puffOffsets.forEach((p, idx) => {
        const puff = new THREE.Mesh(puffGeo, puffMats[idx % puffMats.length]);
        puff.position.set(p.x * scale, p.y * scale, p.z * scale);
        puff.scale.set(p.sx, p.sy, p.sz);
        puff.rotation.set(p.r * 0.3, p.r, p.r * 0.2);
        group.add(puff);
    });

    if (hasHangingVines) {
        const vineGeo = new THREE.ConeGeometry(0.14 * scale, 1.1 * scale, 5);
        const vineMat = new THREE.MeshStandardMaterial({
            color: foliageColors[0],
            emissive: foliageColors[0],
            emissiveIntensity: 0.35,
            flatShading: true
        });
        [
            { x: -1.1, y: 2.9, z: 0.7 },
            { x: 1.1, y: 3.0, z: -0.6 },
            { x: 0.7, y: 2.8, z: 0.9 },
            { x: -0.8, y: 3.1, z: -0.8 }
        ].forEach((v) => {
            const vine = new THREE.Mesh(vineGeo, vineMat);
            vine.position.set(v.x * scale, v.y * scale, v.z * scale);
            vine.rotation.x = Math.PI;
            group.add(vine);
        });
    }

    group.position.set(x, 0, z);
    return group;
}

// 5. Dựng khóm Trúc / Tre làng Việt Nam cho Map 1
function createBambooCluster(x, z) {
    const group = new THREE.Group();
    const stalkMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.6 });
    const leafMat = new THREE.MeshStandardMaterial({
        color: '#22c55e',
        roughness: 0.7,
        flatShading: true
    });

    const offsets = [
        { dx: 0, dz: 0, h: 5.2, leanX: 0.04, leanZ: 0.02 },
        { dx: -0.35, dz: 0.25, h: 4.6, leanX: -0.06, leanZ: 0.05 },
        { dx: 0.38, dz: -0.2, h: 4.9, leanX: 0.05, leanZ: -0.06 },
        { dx: -0.2, dz: -0.35, h: 4.2, leanX: -0.04, leanZ: -0.05 },
        { dx: 0.25, dz: 0.35, h: 4.5, leanX: 0.07, leanZ: 0.04 }
    ];

    offsets.forEach((st) => {
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, st.h, 8), stalkMat);
        stalk.position.set(st.dx, st.h / 2, st.dz);
        stalk.rotation.set(st.leanX, 0, st.leanZ);
        group.add(stalk);

        [st.h * 0.65, st.h * 0.85, st.h].forEach((ly, idx) => {
            const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55 - idx * 0.08, 0), leafMat);
            foliage.scale.set(1.4, 0.42, 1.1);
            foliage.position.set(st.dx * 1.2, ly, st.dz * 1.2);
            foliage.rotation.y = idx * 1.1;
            group.add(foliage);
        });
    });

    group.position.set(x, 0, z);
    return group;
}

// 6. Dựng Khóm Bụi Lá Xanh Đính Hoa Nhiều Cánh
function createNaturalFlowerBush({ x, z, seed = 0 }) {
    const group = new THREE.Group();
    const leafGeo = new THREE.DodecahedronGeometry(0.68, 1);
    const leafMatDark = new THREE.MeshStandardMaterial({
        color: '#14532d',
        roughness: 0.85,
        flatShading: true
    });
    const leafMatLight = new THREE.MeshStandardMaterial({
        color: '#166534',
        roughness: 0.8,
        flatShading: true
    });

    [
        { dx: 0, dy: 0.45, dz: 0, sx: 1.35, sy: 0.72, sz: 1.15, mat: leafMatDark },
        { dx: -0.45, dy: 0.38, dz: 0.22, sx: 1.05, sy: 0.62, sz: 0.95, mat: leafMatLight },
        { dx: 0.48, dy: 0.4, dz: -0.2, sx: 1.1, sy: 0.65, sz: 0.95, mat: leafMatLight }
    ].forEach((b, i) => {
        const mesh = new THREE.Mesh(leafGeo, b.mat);
        mesh.position.set(b.dx, b.dy, b.dz);
        mesh.scale.set(b.sx, b.sy, b.sz);
        mesh.rotation.y = seed + i * 0.8;
        group.add(mesh);
    });

    const blossomPalette = ['#f472b6', '#fde047', '#fb7185', '#e879f9', '#ffffff'];
    const flowerGeo = new THREE.DodecahedronGeometry(0.16, 0);

    for (let i = 0; i < 9; i++) {
        const angle = (i / 9) * Math.PI * 2 + seed;
        const radius = (i % 3) * 0.28 + 0.15;
        const fx = Math.cos(angle) * radius * 1.3;
        const fz = Math.sin(angle) * radius;
        const fy = 0.68 + (i % 2) * 0.14;

        const fColor = blossomPalette[(i + Math.round(seed)) % blossomPalette.length];
        const flower = new THREE.Mesh(
            flowerGeo,
            new THREE.MeshStandardMaterial({
                color: fColor,
                emissive: fColor,
                emissiveIntensity: 0.35,
                flatShading: true
            })
        );
        flower.scale.set(1.2, 0.65, 1.2);
        flower.position.set(fx, fy, fz);
        flower.rotation.set(0.2, angle, 0.1);
        group.add(flower);
    }

    group.position.set(x, 0, z);
    return group;
}

// 7. Trụ Hoa Tươi Dẫn Lối Dọc Thảm Đỏ
function createAisleFloralStand(x, z) {
    const group = new THREE.Group();

    const base = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.14, 0.46),
        new THREE.MeshStandardMaterial({ color: '#fef3c7' })
    );
    base.position.y = 0.07;

    const column = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.16, 1.25, 10),
        new THREE.MeshStandardMaterial({ color: '#fffbeb' })
    );
    column.position.y = 0.7;

    const topPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.1, 0.42),
        new THREE.MeshStandardMaterial({ color: '#fde68a' })
    );
    topPlate.position.y = 1.35;

    const leafBase = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.36, 1),
        new THREE.MeshStandardMaterial({ color: '#15803d', flatShading: true })
    );
    leafBase.scale.set(1.15, 0.65, 1.15);
    leafBase.position.y = 1.5;

    group.add(base, column, topPlate, leafBase);

    const flowerColors = ['#f472b6', '#fb7185', '#fff1f2', '#fde047', '#ec4899'];
    [
        { dx: 0, dy: 1.76, dz: 0, s: 0.16 },
        { dx: -0.18, dy: 1.62, dz: 0.14, s: 0.13 },
        { dx: 0.18, dy: 1.62, dz: -0.14, s: 0.13 },
        { dx: 0.16, dy: 1.64, dz: 0.16, s: 0.12 },
        { dx: -0.16, dy: 1.64, dz: -0.16, s: 0.12 },
        { dx: 0.24, dy: 1.52, dz: 0, s: 0.11 },
        { dx: -0.24, dy: 1.52, dz: 0, s: 0.11 }
    ].forEach((f, idx) => {
        const blossom = new THREE.Mesh(
            new THREE.DodecahedronGeometry(f.s, 0),
            new THREE.MeshStandardMaterial({
                color: flowerColors[idx % flowerColors.length],
                emissive: flowerColors[idx % flowerColors.length],
                emissiveIntensity: 0.28,
                flatShading: true
            })
        );
        blossom.position.set(f.dx, f.dy, f.dz);
        group.add(blossom);
    });

    group.position.set(x, 0, z);
    return group;
}

export default function WeddingScene3D({
    mapType = 'village',
    localPlayer,
    remotePlayers,
    simulatedBots,
    joystickDelta,
    onMoveLocal,
    onSeatClick,
    onCatchBouquet,
    bouquetState,
    ceremonyStep,
    screenshotTrigger,
    onNpcTalk,
    coupleInfo,
    stageTeleportTrigger
}) {
    const mountRef = useRef(null);
    const backdropMeshRef = useRef(null);
    const keysRef = useRef({});
    const cameraAngleRef = useRef({
        yaw: 0,
        pitch: 0.34,
        distance: window.innerHeight > window.innerWidth ? 14.5 : 11.8
    });
    const localPosRef = useRef({
        x: Number(localPlayer?.lastPosition?.x) || 0,
        y: 0,
        z: Number(localPlayer?.lastPosition?.z) || 8,
        rotY: 0,
        facing: 'front'
    });
    const playerSpritesRef = useRef({});
    const seatMeshesRef = useRef([]);

    const latestDataRef = useRef({
        localPlayer,
        remotePlayers,
        simulatedBots,
        bouquetState,
        ceremonyStep,
        onMoveLocal,
        onSeatClick,
        onCatchBouquet,
        onNpcTalk
    });

    useEffect(() => {
        latestDataRef.current = {
            localPlayer,
            remotePlayers,
            simulatedBots,
            bouquetState,
            ceremonyStep,
            onMoveLocal,
            onSeatClick,
            onCatchBouquet,
            onNpcTalk
        };
    }, [
        localPlayer,
        remotePlayers,
        simulatedBots,
        bouquetState,
        ceremonyStep,
        onMoveLocal,
        onSeatClick,
        onCatchBouquet,
        onNpcTalk
    ]);

    useEffect(() => {
        localPosRef.current = {
            x: Number(localPlayer?.lastPosition?.x) || 0,
            y: 0,
            z: Number(localPlayer?.lastPosition?.z) || 8,
            rotY: 0,
            facing: 'front'
        };
    }, [localPlayer?.username]);

    useEffect(() => {
        if (!backdropMeshRef.current) return;
        const oldTex = backdropMeshRef.current.material.map;
        if (oldTex) oldTex.dispose();
        backdropMeshRef.current.material.map = createStageBackdropTexture(
            coupleInfo?.groomName,
            coupleInfo?.brideName,
            mapType
        );
        backdropMeshRef.current.material.needsUpdate = true;
    }, [coupleInfo?.groomName, coupleInfo?.brideName, mapType]);

    useEffect(() => {
        if (!stageTeleportTrigger) return;
        localPosRef.current.x = stageTeleportTrigger.x;
        localPosRef.current.z = stageTeleportTrigger.z;
        localPosRef.current.facing = 'front';
    }, [stageTeleportTrigger]);

    useEffect(() => {
        const container = mountRef.current;
        if (!container) return;

        playerSpritesRef.current = {};

        const isFlowerForest = mapType === 'flower_forest';

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(isFlowerForest ? '#190a28' : '#130924');
        scene.fog = new THREE.FogExp2(isFlowerForest ? '#190a28' : '#130924', 0.011);

        const isPortrait = container.clientHeight > container.clientWidth;
        const camera = new THREE.PerspectiveCamera(
            isPortrait ? 68 : 55,
            container.clientWidth / container.clientHeight,
            0.1,
            220
        );

        const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        container.innerHTML = '';
        container.appendChild(renderer.domElement);

        const particleGeo = new THREE.BufferGeometry();
        const particleCount = isFlowerForest ? 550 : 350;
        const particlePositions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            particlePositions[i * 3] = (Math.random() - 0.5) * (isFlowerForest ? 60 : 110);
            particlePositions[i * 3 + 1] = isFlowerForest
                ? 1.2 + Math.random() * 18
                : 14 + Math.random() * 30;
            particlePositions[i * 3 + 2] = (Math.random() - 0.5) * (isFlowerForest ? 60 : 110);
        }
        particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        const particles = new THREE.Points(
            particleGeo,
            new THREE.PointsMaterial({
                color: isFlowerForest ? '#f9a8d4' : '#fef08a',
                size: isFlowerForest ? 0.35 : 0.3
            })
        );
        scene.add(particles);

        scene.add(new THREE.AmbientLight(isFlowerForest ? '#fce7f3' : '#ffedd5', 1.08));

        const stageSpot = new THREE.PointLight(isFlowerForest ? '#f472b6' : '#ffcf70', 2.8, 42);
        stageSpot.position.set(0, 8.5, -8.5);
        scene.add(stageSpot);

        const courtyardLight = new THREE.PointLight(
            isFlowerForest ? '#e879f9' : '#fed7aa',
            2.2,
            36
        );
        courtyardLight.position.set(0, 7.5, 4);
        scene.add(courtyardLight);

        const outerGrass = new THREE.Mesh(
            new THREE.PlaneGeometry(120, 120),
            new THREE.MeshStandardMaterial({
                color: isFlowerForest ? '#0f291e' : '#14261c',
                roughness: 0.95
            })
        );
        outerGrass.rotation.x = -Math.PI / 2;
        outerGrass.position.y = -0.02;
        scene.add(outerGrass);

        if (!isFlowerForest) {
            // ================== MAP 1: ĐÁM CƯỚI NHÀ QUÊ 3 GIAN ==================
            const courtyardTex = createCourtyardTileTexture();
            const courtyard = new THREE.Mesh(
                new THREE.PlaneGeometry(31.0, 28.5),
                new THREE.MeshStandardMaterial({ map: courtyardTex, roughness: 0.8 })
            );
            courtyard.rotation.x = -Math.PI / 2;
            courtyard.position.set(0, 0, -0.75);
            scene.add(courtyard);

            const houseGroup = new THREE.Group();
            const houseBase = new THREE.Mesh(
                new THREE.BoxGeometry(23.2, 0.8, 7.8),
                new THREE.MeshStandardMaterial({ color: '#78350f' })
            );
            houseBase.position.set(0, 0.4, -18.4);
            houseGroup.add(houseBase);

            const mainWall = new THREE.Mesh(
                new THREE.BoxGeometry(22.4, 5.8, 7.2),
                new THREE.MeshStandardMaterial({ color: '#fde68a', roughness: 0.7 })
            );
            mainWall.position.set(0, 3.6, -18.4);
            houseGroup.add(mainWall);

            const atticWall = new THREE.Mesh(
                new THREE.BoxGeometry(22.2, 1.35, 4.2),
                new THREE.MeshStandardMaterial({ color: '#fcd34d', roughness: 0.7 })
            );
            atticWall.position.set(0, 7.1, -18.4);
            houseGroup.add(atticWall);

            [-10, -6, -2, 2, 6, 10].forEach((cx) => {
                const col = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.28, 0.3, 5.8, 12),
                    new THREE.MeshStandardMaterial({ color: '#451a03' })
                );
                col.position.set(cx, 3.6, -14.6);
                houseGroup.add(col);
            });

            [-3.8, 0, 3.8].forEach((dx) => {
                const door = new THREE.Mesh(
                    new THREE.BoxGeometry(2.6, 4.2, 0.2),
                    new THREE.MeshStandardMaterial({ color: '#78350f' })
                );
                door.position.set(dx, 2.9, -14.75);
                houseGroup.add(door);
            });

            [-8.2, 8.2].forEach((wx) => {
                const winFrame = new THREE.Mesh(
                    new THREE.BoxGeometry(2.2, 2.2, 0.22),
                    new THREE.MeshStandardMaterial({
                        color: '#fef08a',
                        emissive: '#f59e0b',
                        emissiveIntensity: 0.7
                    })
                );
                winFrame.position.set(wx, 3.6, -14.75);
                houseGroup.add(winFrame);
            });

            const roofEaves = new THREE.Mesh(
                new THREE.BoxGeometry(24.8, 0.38, 9.0),
                new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 0.6 })
            );
            roofEaves.position.set(0, 6.5, -18.4);
            houseGroup.add(roofEaves);

            const roofSlopeMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.55 });
            const roofFront = new THREE.Mesh(new THREE.BoxGeometry(24.6, 0.4, 4.9), roofSlopeMat);
            roofFront.position.set(0, 7.55, -16.35);
            roofFront.rotation.x = 0.45;

            const roofBack = new THREE.Mesh(new THREE.BoxGeometry(24.6, 0.4, 4.9), roofSlopeMat);
            roofBack.position.set(0, 7.55, -20.45);
            roofBack.rotation.x = -0.45;

            const roofRidge = new THREE.Mesh(
                new THREE.BoxGeometry(25.0, 0.48, 0.65),
                new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.5 })
            );
            roofRidge.position.set(0, 8.55, -18.4);

            houseGroup.add(roofFront, roofBack, roofRidge);
            scene.add(houseGroup);

            const sideHouse = new THREE.Group();
            const sideWall = new THREE.Mesh(
                new THREE.BoxGeometry(3.4, 4.2, 11.5),
                new THREE.MeshStandardMaterial({ color: '#fef3c7' })
            );
            sideWall.position.set(-13.5, 2.1, -2.5);

            const sideRoof = new THREE.Mesh(
                new THREE.BoxGeometry(4.0, 1.1, 12.2),
                new THREE.MeshStandardMaterial({ color: '#b91c1c' })
            );
            sideRoof.position.set(-13.5, 4.75, -2.5);

            [-5.5, 0.5].forEach((sz) => {
                const sWin = new THREE.Mesh(
                    new THREE.BoxGeometry(0.22, 1.5, 1.8),
                    new THREE.MeshStandardMaterial({
                        color: '#fde047',
                        emissive: '#f59e0b',
                        emissiveIntensity: 0.6
                    })
                );
                sWin.position.set(-11.78, 2.3, sz);
                sideHouse.add(sWin);
            });
            sideHouse.add(sideWall, sideRoof);
            scene.add(sideHouse);

            const wallMat = new THREE.MeshStandardMaterial({ color: '#9a3412', roughness: 0.85 });
            const capMat = new THREE.MeshStandardMaterial({ color: '#7c2d12', roughness: 0.7 });

            const rightFence = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.2, 28.5), wallMat);
            rightFence.position.set(15.5, 1.1, -0.75);

            const leftFence = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.2, 28.5), wallMat);
            leftFence.position.set(-15.5, 1.1, -0.75);

            const frontFenceLeft = new THREE.Mesh(new THREE.BoxGeometry(12.2, 2.2, 0.5), wallMat);
            frontFenceLeft.position.set(-9.4, 1.1, 13.5);

            const frontFenceRight = new THREE.Mesh(new THREE.BoxGeometry(12.2, 2.2, 0.5), wallMat);
            frontFenceRight.position.set(9.4, 1.1, 13.5);

            const backFenceLeft = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.2, 0.5), wallMat);
            backFenceLeft.position.set(-13.25, 1.1, -15.0);

            const backFenceRight = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.2, 0.5), wallMat);
            backFenceRight.position.set(13.25, 1.1, -15.0);

            scene.add(
                rightFence,
                leftFence,
                frontFenceLeft,
                frontFenceRight,
                backFenceLeft,
                backFenceRight
            );

            [
                { x: -15.5, z: 13.5 },
                { x: 15.5, z: 13.5 },
                { x: -15.5, z: -15.0 },
                { x: 15.5, z: -15.0 }
            ].forEach((corner) => {
                const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.5, 0.75), wallMat);
                pillar.position.set(corner.x, 1.25, corner.z);
                const pillarCap = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.9), capMat);
                pillarCap.position.set(corner.x, 2.55, corner.z);
                scene.add(pillar, pillarCap);
            });

            scene.add(
                createNaturalTree({
                    x: -13.2,
                    z: 11.0,
                    scale: 0.95,
                    foliageColors: ['#15803d', '#16a34a', '#166534']
                })
            );
            scene.add(
                createNaturalTree({
                    x: 13.4,
                    z: 11.0,
                    scale: 1.0,
                    foliageColors: ['#166534', '#15803d', '#22c55e']
                })
            );
            scene.add(createBambooCluster(13.6, 3.5));
            scene.add(createBambooCluster(13.6, -4.5));
            scene.add(createBambooCluster(-13.6, -11.5));

            const marqueeGroup = new THREE.Group();
            [-10.8, 10.8].forEach((mx) => {
                [-9, -3, 3, 9].forEach((mz) => {
                    const pole = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.18, 0.18, 6.8, 12),
                        new THREE.MeshStandardMaterial({ color: '#fbcfe8' })
                    );
                    pole.position.set(mx, 3.4, mz);
                    const ribbon = new THREE.Mesh(
                        new THREE.DodecahedronGeometry(0.32, 0),
                        new THREE.MeshStandardMaterial({ color: '#ec4899', flatShading: true })
                    );
                    ribbon.position.set(mx, 2.6, mz);
                    marqueeGroup.add(pole, ribbon);
                });
            });

            const canopyRoof = new THREE.Mesh(
                new THREE.PlaneGeometry(22.0, 22),
                new THREE.MeshStandardMaterial({
                    color: '#fdf2f8',
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.35
                })
            );
            canopyRoof.rotation.x = Math.PI / 2;
            canopyRoof.position.set(0, 6.85, 0);
            marqueeGroup.add(canopyRoof);
            scene.add(marqueeGroup);
        } else {
            // ================== MAP 2: ĐÁM CƯỚI RỪNG HOA CỔ TÍCH ==================
            const meadowTex = createFlowerMeadowTexture();
            const meadow = new THREE.Mesh(
                new THREE.PlaneGeometry(30.8, 30.6),
                new THREE.MeshStandardMaterial({ map: meadowTex, roughness: 0.85 })
            );
            meadow.rotation.x = -Math.PI / 2;
            meadow.position.set(0, 0, -1.3);
            scene.add(meadow);

            const motherSakuraTree = createNaturalTree({
                x: 0,
                z: -15.2,
                scale: 2.35,
                trunkColor: '#3e1f0d',
                foliageColors: ['#f472b6', '#fbcfe8', '#ec4899', '#fda4af'],
                emissiveColor: '#831843',
                emissiveIntensity: 0.22,
                hasHangingVines: true
            });
            scene.add(motherSakuraTree);

            const archRadius = 4.2;
            const pillarHeight = 4.4;
            const blossomColors = ['#f472b6', '#fbcfe8', '#ec4899', '#fde047', '#fda4af'];

            [-4.0, 0.5, 5.0, 9.5].forEach((az, idx) => {
                const frameMat = new THREE.MeshStandardMaterial({
                    color: '#fff1f2',
                    roughness: 0.4
                });
                const vineLeafMat = new THREE.MeshStandardMaterial({
                    color: '#15803d',
                    flatShading: true
                });

                [-archRadius, archRadius].forEach((px) => {
                    const vPillar = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.14, 0.18, pillarHeight, 10),
                        frameMat
                    );
                    vPillar.position.set(px, pillarHeight / 2, az);
                    scene.add(vPillar);

                    [1.0, 2.1, 3.2, 4.1].forEach((py, rIdx) => {
                        const leafCluster = new THREE.Mesh(
                            new THREE.DodecahedronGeometry(0.28, 0),
                            vineLeafMat
                        );
                        leafCluster.scale.set(1.2, 0.6, 1.2);
                        leafCluster.position.set(px, py, az);
                        scene.add(leafCluster);

                        const smallFlower = new THREE.Mesh(
                            new THREE.DodecahedronGeometry(0.18, 0),
                            new THREE.MeshStandardMaterial({
                                color: blossomColors[(idx + rIdx) % blossomColors.length],
                                emissive: '#be185d',
                                emissiveIntensity: 0.3,
                                flatShading: true
                            })
                        );
                        smallFlower.position.set(
                            px + (px < 0 ? 0.15 : -0.15),
                            py + 0.12,
                            az + 0.12
                        );
                        scene.add(smallFlower);
                    });
                });

                const archTorus = new THREE.Mesh(
                    new THREE.TorusGeometry(archRadius, 0.12, 10, 32, Math.PI),
                    frameMat
                );
                archTorus.position.set(0, pillarHeight, az);
                scene.add(archTorus);

                for (let a = 0.15; a <= Math.PI - 0.15; a += 0.32) {
                    const fx = Math.cos(a) * archRadius;
                    const fy = Math.sin(a) * archRadius + pillarHeight;

                    const archLeaf = new THREE.Mesh(
                        new THREE.DodecahedronGeometry(0.26, 0),
                        vineLeafMat
                    );
                    archLeaf.scale.set(1.3, 0.6, 1.1);
                    archLeaf.position.set(fx, fy, az);
                    archLeaf.rotation.z = a;
                    scene.add(archLeaf);

                    const archBlossom = new THREE.Mesh(
                        new THREE.DodecahedronGeometry(0.2, 0),
                        new THREE.MeshStandardMaterial({
                            color: blossomColors[Math.floor(a * 5) % blossomColors.length],
                            emissive: '#be185d',
                            emissiveIntensity: 0.32,
                            flatShading: true
                        })
                    );
                    archBlossom.position.set(fx, fy - 0.12, az + 0.14);
                    scene.add(archBlossom);
                }
            });

            const sakuraPalettes = [
                ['#f472b6', '#fbcfe8', '#ec4899'],
                ['#e879f9', '#f5d0fe', '#c084fc'],
                ['#fb7185', '#ffe4e6', '#f43f5e'],
                ['#f9a8d4', '#fdf2f8', '#db2777']
            ];

            const perimeterTrees = [
                { x: -14.2, z: -14.2, s: 1.05 },
                { x: -14.5, z: -8.2, s: 0.95 },
                { x: -14.2, z: -2.2, s: 1.1 },
                { x: -14.5, z: 3.8, s: 0.95 },
                { x: -14.2, z: 9.8, s: 1.05 },
                { x: 14.2, z: -14.2, s: 1.05 },
                { x: 14.5, z: -8.2, s: 0.95 },
                { x: 14.2, z: -2.2, s: 1.1 },
                { x: 14.5, z: 3.8, s: 0.95 },
                { x: 14.2, z: 9.8, s: 1.05 },
                { x: -10.5, z: -15.8, s: 1.0 },
                { x: -5.8, z: -16.0, s: 1.12 },
                { x: 5.8, z: -16.0, s: 1.12 },
                { x: 10.5, z: -15.8, s: 1.0 },
                { x: -9.5, z: 13.2, s: 0.95 },
                { x: 9.5, z: 13.2, s: 0.95 }
            ];

            perimeterTrees.forEach((pos, idx) => {
                const tree = createNaturalTree({
                    x: pos.x,
                    z: pos.z,
                    scale: pos.s,
                    trunkColor: '#4a2511',
                    foliageColors: sakuraPalettes[idx % sakuraPalettes.length],
                    emissiveColor: '#701a75',
                    emissiveIntensity: 0.18,
                    hasHangingVines: idx % 2 === 0
                });
                tree.rotation.y = (idx * 1.3) % (Math.PI * 2);
                scene.add(tree);
            });

            for (let z = -16.2; z <= 13.6; z += 2.2) {
                scene.add(createNaturalFlowerBush({ x: -15.0, z, seed: z }));
                scene.add(createNaturalFlowerBush({ x: 15.0, z, seed: z + 2 }));
            }

            for (let x = -14.8; x <= 14.8; x += 2.2) {
                scene.add(createNaturalFlowerBush({ x, z: -16.2, seed: x }));
                if (Math.abs(x) > 3.6) {
                    scene.add(createNaturalFlowerBush({ x, z: 13.6, seed: x + 3 }));
                }
            }
        }

        // ======================== HẠNG MỤC CHUNG: THẢM, TRỤ HOA, SÂN KHẤU & CỔNG TUA RUA ========================
        const carpetBorder = new THREE.Mesh(
            new THREE.PlaneGeometry(3.8, 23.0),
            new THREE.MeshStandardMaterial({
                color: isFlowerForest ? '#ec4899' : '#f59e0b',
                roughness: 0.4
            })
        );
        carpetBorder.rotation.x = -Math.PI / 2;
        carpetBorder.position.set(0, 0.015, 2.0);
        scene.add(carpetBorder);

        const carpet = new THREE.Mesh(
            new THREE.PlaneGeometry(3.3, 22.8),
            new THREE.MeshStandardMaterial({
                color: isFlowerForest ? '#fbcfe8' : '#b91c1c',
                roughness: 0.55
            })
        );
        carpet.rotation.x = -Math.PI / 2;
        carpet.position.set(0, 0.025, 2.0);
        scene.add(carpet);

        [-3.5, 0.5, 4.5, 8.5].forEach((zPos) => {
            [-2.1, 2.1].forEach((xPos) => {
                scene.add(createAisleFloralStand(xPos, zPos));
            });
        });

        const playerRing = new THREE.Mesh(
            new THREE.RingGeometry(0.65, 0.88, 32),
            new THREE.MeshBasicMaterial({ color: '#fde047', side: THREE.DoubleSide })
        );
        playerRing.rotation.x = -Math.PI / 2;
        playerRing.position.set(localPosRef.current.x, 0.04, localPosRef.current.z);
        scene.add(playerRing);

        const stageRim = new THREE.Mesh(
            new THREE.CylinderGeometry(5.85, 6.0, 0.62, 48),
            new THREE.MeshStandardMaterial({
                color: isFlowerForest ? '#ec4899' : '#d97706'
            })
        );
        stageRim.position.set(0, 0.31, -9.5);
        scene.add(stageRim);

        const stage = new THREE.Mesh(
            new THREE.CylinderGeometry(5.6, 5.75, 0.66, 48),
            new THREE.MeshStandardMaterial({
                color: isFlowerForest ? '#fff1f2' : '#f3d5a5',
                roughness: 0.45
            })
        );
        stage.position.set(0, 0.33, -9.5);
        scene.add(stage);

        const backdropTex = createStageBackdropTexture(
            coupleInfo?.groomName,
            coupleInfo?.brideName,
            mapType
        );
        const backdrop = new THREE.Mesh(
            new THREE.BoxGeometry(10.8, 6.2, 0.28),
            new THREE.MeshStandardMaterial({ map: backdropTex, roughness: 0.4 })
        );
        backdrop.position.set(0, 3.7, -13.4);
        scene.add(backdrop);
        backdropMeshRef.current = backdrop;

        [-6.6, 6.6].forEach((xPos) => {
            const speaker = new THREE.Mesh(
                new THREE.BoxGeometry(1.3, 2.8, 1.1),
                new THREE.MeshStandardMaterial({ color: '#1e1b4b' })
            );
            speaker.position.set(xPos, 1.4, -11.5);
            const coneTop = new THREE.Mesh(
                new THREE.CylinderGeometry(0.38, 0.25, 0.15, 16),
                new THREE.MeshStandardMaterial({ color: '#f59e0b' })
            );
            coneTop.rotation.x = Math.PI / 2;
            coneTop.position.set(xPos, 2.0, -10.92);
            const coneBot = coneTop.clone();
            coneBot.position.set(xPos, 1.0, -10.92);
            scene.add(speaker, coneTop, coneBot);
        });

        const cakeGroup = new THREE.Group();
        [1.0, 0.72, 0.46].forEach((radius, idx) => {
            const layer = new THREE.Mesh(
                new THREE.CylinderGeometry(radius, radius, 0.48, 24),
                new THREE.MeshStandardMaterial({ color: idx % 2 === 0 ? '#fff8eb' : '#ffe4e6' })
            );
            layer.position.y = 0.85 + idx * 0.46;
            cakeGroup.add(layer);
        });
        cakeGroup.position.set(-3.2, 0, -9.8);
        scene.add(cakeGroup);

        const champagneGroup = new THREE.Group();
        [0.88, 0.62, 0.38].forEach((radius, idx) => {
            const glassTier = new THREE.Mesh(
                new THREE.CylinderGeometry(radius, radius, 0.38, 20),
                new THREE.MeshStandardMaterial({
                    color: '#fef08a',
                    emissive: '#f59e0b',
                    emissiveIntensity: 0.4,
                    transparent: true,
                    opacity: 0.85
                })
            );
            glassTier.position.y = 0.82 + idx * 0.4;
            champagneGroup.add(glassTier);
        });
        champagneGroup.position.set(3.2, 0, -9.8);
        scene.add(champagneGroup);

        // Dựng Cổng Cưới Hoàng Gia kèm Dàn Tua Rua đung đưa
        const { gateGroup, swayingTassels } = createOrnateWeddingGate(isFlowerForest);
        scene.add(gateGroup);

        const tablePositions = [
            { x: -6.8, z: -2.5 },
            { x: -6.8, z: 3.0 },
            { x: -6.8, z: 8.5 },
            { x: 6.8, z: -2.5 },
            { x: 6.8, z: 3.0 },
            { x: 6.8, z: 8.5 }
        ];

        seatMeshesRef.current = [];
        tablePositions.forEach((tPos, tIdx) => {
            const tableBase = new THREE.Mesh(
                new THREE.CylinderGeometry(1.55, 1.65, 0.84, 24),
                new THREE.MeshStandardMaterial({
                    color: isFlowerForest ? '#db2777' : '#e11d48'
                })
            );
            tableBase.position.set(tPos.x, 0.42, tPos.z);

            const tableTop = new THREE.Mesh(
                new THREE.CylinderGeometry(1.48, 1.48, 0.06, 24),
                new THREE.MeshStandardMaterial({ color: '#fff1f2' })
            );
            tableTop.position.set(tPos.x, 0.86, tPos.z);
            scene.add(tableBase, tableTop);

            const xoiGac = new THREE.Mesh(
                new THREE.CylinderGeometry(0.32, 0.35, 0.14, 16),
                new THREE.MeshStandardMaterial({ color: '#dc2626' })
            );
            xoiGac.position.set(tPos.x - 0.38, 0.94, tPos.z - 0.2);

            const gaLuoc = new THREE.Mesh(
                new THREE.CylinderGeometry(0.35, 0.38, 0.14, 16),
                new THREE.MeshStandardMaterial({ color: '#f59e0b' })
            );
            gaLuoc.position.set(tPos.x + 0.38, 0.94, tPos.z + 0.2);

            const loHoa = new THREE.Mesh(
                new THREE.CylinderGeometry(0.12, 0.15, 0.45, 12),
                new THREE.MeshStandardMaterial({ color: '#f472b6' })
            );
            loHoa.position.set(tPos.x, 1.08, tPos.z);

            scene.add(xoiGac, gaLuoc, loHoa);

            for (let sIdx = 0; sIdx < 6; sIdx++) {
                const angle = (sIdx / 6) * Math.PI * 2;
                const sx = tPos.x + Math.cos(angle) * 2.25;
                const sz = tPos.z + Math.sin(angle) * 2.25;
                const seatMesh = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.36, 0.36, 0.48, 16),
                    new THREE.MeshStandardMaterial({ color: '#fde047' })
                );
                seatMesh.position.set(sx, 0.24, sz);
                seatMesh.userData = {
                    seatKey: `table_${tIdx}_seat_${sIdx}`,
                    seatPos: { x: sx, z: sz }
                };
                scene.add(seatMesh);
                seatMeshesRef.current.push(seatMesh);
            }
        });

        const wishingPeachTree = createNaturalTree({
            x: 9.8,
            z: -7.5,
            scale: 1.15,
            trunkColor: '#5c3a21',
            foliageColors: ['#f472b6', '#ec4899', '#fbcfe8'],
            emissiveColor: '#9d174d',
            emissiveIntensity: 0.28,
            hasHangingVines: true
        });
        scene.add(wishingPeachTree);

        [-7, -2, 3, 8].forEach((zRow) => {
            for (let xPos = -10; xPos <= 10; xPos += 2.5) {
                const sag = Math.cos((xPos / 10) * (Math.PI / 2)) * 0.55;
                const bulb = new THREE.Mesh(
                    new THREE.SphereGeometry(0.15, 10, 10),
                    new THREE.MeshBasicMaterial({ color: xPos % 5 === 0 ? '#f472b6' : '#fef08a' })
                );
                bulb.position.set(xPos, 6.5 - sag, zRow);
                scene.add(bulb);
            }
        });

        const bouquetMesh = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.42, 1),
            new THREE.MeshStandardMaterial({
                color: '#ff4d94',
                emissive: '#ff1493',
                emissiveIntensity: 0.6,
                flatShading: true
            })
        );
        bouquetMesh.visible = false;
        scene.add(bouquetMesh);

        const npcSprites = NPCS.map((npc) => {
            const tex = createChibiCharacterTexture({
                displayName: npc.displayName,
                gender: npc.gender,
                role: npc.role,
                hasCrown: false,
                primaryColor: npc.primaryColor,
                chatText: npc.quotes[0],
                walkPhase: 0,
                facing: 'front'
            });
            const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
            const sprite = new THREE.Sprite(mat);
            sprite.scale.set(2.8, 3.5, 1);
            sprite.position.set(npc.x, 1.42, npc.z);
            scene.add(sprite);
            return { npc, sprite };
        });

        const onKeyDown = (e) => {
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
            keysRef.current[e.key.toLowerCase()] = true;
        };
        const onKeyUp = (e) => {
            keysRef.current[e.key.toLowerCase()] = false;
        };

        let isDragging = false;
        let prevMouse = { x: 0, y: 0 };
        let pinchStartDist = 0;
        let pinchStartCamDist = cameraAngleRef.current.distance;

        const onWheel = (e) => {
            e.preventDefault();
            const zoomDelta = e.deltaY * 0.01;
            cameraAngleRef.current.distance = Math.max(
                4.0,
                Math.min(24.0, cameraAngleRef.current.distance + zoomDelta)
            );
        };

        const onTouchStart = (e) => {
            if (e.touches.length === 2) {
                isDragging = false;
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                pinchStartDist = Math.hypot(dx, dy);
                pinchStartCamDist = cameraAngleRef.current.distance;
            }
        };

        const onTouchMove = (e) => {
            if (e.touches.length === 2 && pinchStartDist > 0) {
                e.preventDefault();
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const curDist = Math.hypot(dx, dy);
                const scale = pinchStartDist / Math.max(20, curDist);
                cameraAngleRef.current.distance = Math.max(
                    4.0,
                    Math.min(24.0, pinchStartCamDist * scale)
                );
            }
        };

        const onTouchEnd = () => {
            pinchStartDist = 0;
        };

        const onPointerDown = (e) => {
            if (!e.isPrimary) return;
            isDragging = true;
            prevMouse = { x: e.clientX, y: e.clientY };

            const rect = renderer.domElement.getBoundingClientRect();
            const mouse = new THREE.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1
            );
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, camera);

            if (bouquetMesh.visible) {
                const hitBouquet = raycaster.intersectObject(bouquetMesh);
                if (hitBouquet.length > 0) {
                    latestDataRef.current.onCatchBouquet?.();
                    return;
                }
            }

            const hitSeats = raycaster.intersectObjects(seatMeshesRef.current);
            if (hitSeats.length > 0) {
                const { seatKey, seatPos } = hitSeats[0].object.userData;
                localPosRef.current.x = seatPos.x;
                localPosRef.current.z = seatPos.z;
                localPosRef.current.facing = 'front';
                latestDataRef.current.onSeatClick?.(seatKey, seatPos);
            }
        };

        const onPointerMove = (e) => {
            if (!isDragging || !e.isPrimary || pinchStartDist > 0) return;
            const dx = e.clientX - prevMouse.x;
            const dy = e.clientY - prevMouse.y;
            prevMouse = { x: e.clientX, y: e.clientY };
            cameraAngleRef.current.yaw -= dx * 0.007;
            cameraAngleRef.current.pitch = Math.max(
                0.12,
                Math.min(1.2, cameraAngleRef.current.pitch + dy * 0.005)
            );
        };

        const onPointerUp = () => {
            isDragging = false;
        };

        const domElem = renderer.domElement;
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        domElem.addEventListener('wheel', onWheel, { passive: false });
        domElem.addEventListener('touchstart', onTouchStart, { passive: false });
        domElem.addEventListener('touchmove', onTouchMove, { passive: false });
        domElem.addEventListener('touchend', onTouchEnd);
        domElem.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);

        const buildCharacterFrames = (p) => {
            const makeSet = (facingDir) =>
                [0, 1, 2].map((phase) =>
                    createChibiCharacterTexture({
                        displayName: p.displayName || (p.gender === '♀' ? 'Cô Dâu' : 'Chú Rể'),
                        gender: p.gender || '♂',
                        role: p.role || 'groom',
                        hasCrown: p.outfit?.hasCrown !== false,
                        primaryColor: p.outfit?.primaryColor || '#ffffff',
                        accentColor: p.outfit?.accentColor || '#ff69b4',
                        chatText: p.chatText || '',
                        action: p.action || 'idle',
                        walkPhase: phase,
                        facing: facingDir
                    })
                );

            return {
                front: makeSet('front'),
                back: makeSet('back')
            };
        };

        let animId;
        const clock = new THREE.Clock();

        const animate = () => {
            animId = requestAnimationFrame(animate);
            const dt = Math.min(clock.getDelta(), 0.1);
            const elapsed = clock.getElapsedTime();

            if (isFlowerForest) {
                particles.rotation.y = elapsed * 0.05;
            }

            // Hiệu ứng đung đưa nhẹ theo gió đêm cho Tua Rua & Đèn Lồng
            swayingTassels.forEach((tasselObj, idx) => {
                tasselObj.rotation.z = Math.sin(elapsed * 2.6 + idx * 0.55) * 0.09;
                tasselObj.rotation.x = Math.cos(elapsed * 2.0 + idx * 0.4) * 0.05;
            });

            const {
                localPlayer: curLocalPlayer,
                remotePlayers: curRemotePlayers,
                simulatedBots: curBots,
                bouquetState: curBouquet,
                onMoveLocal: curOnMoveLocal,
                onNpcTalk: curOnNpcTalk
            } = latestDataRef.current;

            const speed = 6.2;
            let moveX = joystickDelta.current?.x || 0;
            let moveZ = joystickDelta.current?.y || 0;

            if (keysRef.current['w'] || keysRef.current['arrowup']) moveZ -= 1;
            if (keysRef.current['s'] || keysRef.current['arrowdown']) moveZ += 1;
            if (keysRef.current['a'] || keysRef.current['arrowleft']) moveX -= 1;
            if (keysRef.current['d'] || keysRef.current['arrowright']) moveX += 1;

            const isLocalMovingInput = Math.abs(moveX) > 0.01 || Math.abs(moveZ) > 0.01;

            if (isLocalMovingInput) {
                if (moveZ < -0.05) {
                    localPosRef.current.facing = 'back';
                } else if (moveZ > 0.05) {
                    localPosRef.current.facing = 'front';
                }

                const yaw = cameraAngleRef.current.yaw;
                const forwardX = Math.sin(yaw);
                const forwardZ = Math.cos(yaw);
                const rightX = Math.cos(yaw);
                const rightZ = -Math.sin(yaw);

                const worldDx = (rightX * moveX + forwardX * moveZ) * speed * dt;
                const worldDz = (rightZ * moveX + forwardZ * moveZ) * speed * dt;

                localPosRef.current.x = Math.max(-11.2, Math.min(13.5, localPosRef.current.x + worldDx));
                localPosRef.current.z = Math.max(-12.5, Math.min(12.6, localPosRef.current.z + worldDz));

                curOnMoveLocal?.({
                    x: localPosRef.current.x,
                    y: 0,
                    z: localPosRef.current.z,
                    rotY: yaw
                });

                npcSprites.forEach(({ npc }) => {
                    const dist = Math.hypot(localPosRef.current.x - npc.x, localPosRef.current.z - npc.z);
                    if (dist < 2.2 && Math.random() < 0.03) {
                        const randomQuote = npc.quotes[Math.floor(Math.random() * npc.quotes.length)];
                        curOnNpcTalk?.(`${npc.displayName}: "${randomQuote}"`);
                    }
                });
            }

            const localOnStage =
                localPosRef.current.z < -6.2 && Math.abs(localPosRef.current.x) < 5.2 ? 0.68 : 0.04;
            playerRing.position.set(localPosRef.current.x, localOnStage, localPosRef.current.z);

            const allPlayers = [
                {
                    ...curLocalPlayer,
                    id: 'local_player',
                    x: localPosRef.current.x,
                    z: localPosRef.current.z
                },
                ...Object.values(curRemotePlayers || {}),
                ...(curBots || [])
            ];

            const activeIds = new Set();
            allPlayers.forEach((p) => {
                if (!p) return;
                activeIds.add(p.id);
                const signature = `${p.displayName}_${p.gender}_${p.role}_${p.outfit?.hasCrown}_${p.outfit?.primaryColor}_${p.chatText || ''}_${p.action || ''}`;

                const px = Number(p.x) || 0;
                const pz = Number(p.z) || 0;

                if (!playerSpritesRef.current[p.id]) {
                    const frameSets = buildCharacterFrames(p);
                    const mat = new THREE.SpriteMaterial({ map: frameSets.front[0], transparent: true });
                    const sprite = new THREE.Sprite(mat);
                    sprite.scale.set(2.9, 3.6, 1);
                    scene.add(sprite);
                    playerSpritesRef.current[p.id] = {
                        sprite,
                        signature,
                        frameSets,
                        lastX: px,
                        lastZ: pz,
                        facing: 'front',
                        movingUntil: 0
                    };
                } else if (playerSpritesRef.current[p.id].signature !== signature) {
                    const entry = playerSpritesRef.current[p.id];
                    entry.frameSets?.front.forEach((t) => t.dispose());
                    entry.frameSets?.back.forEach((t) => t.dispose());
                    entry.frameSets = buildCharacterFrames(p);
                    entry.signature = signature;
                }

                const entry = playerSpritesRef.current[p.id];

                const dz = pz - entry.lastZ;
                const distMoved = Math.hypot(px - entry.lastX, dz);
                entry.lastX = px;
                entry.lastZ = pz;

                if (p.id === 'local_player') {
                    entry.facing = localPosRef.current.facing;
                    if (p.action === 'dance' || p.action === 'toast') {
                        entry.facing = 'front';
                    }
                } else if (distMoved > 0.002) {
                    if (dz < -0.002) entry.facing = 'back';
                    else if (dz > 0.002) entry.facing = 'front';
                }

                if ((p.id === 'local_player' && isLocalMovingInput) || distMoved > 0.002) {
                    entry.movingUntil = elapsed + 0.16;
                }

                const isWalking = elapsed < entry.movingUntil || p.action === 'dance';
                const activeFrameIdx = isWalking ? (Math.floor(elapsed * 8.5) % 2) + 1 : 0;
                const dirSet =
                    entry.facing === 'back' ? entry.frameSets.back : entry.frameSets.front;

                if (entry.sprite.material.map !== dirSet[activeFrameIdx]) {
                    entry.sprite.material.map = dirSet[activeFrameIdx];
                }

                const walkBounce = isWalking ? Math.abs(Math.sin(elapsed * 16)) * 0.05 : 0;
                const danceBounce = p.action === 'dance' ? Math.abs(Math.sin(elapsed * 8)) * 0.35 : 0;
                const onStageLift = pz < -6.2 && Math.abs(px) < 5.2 ? 0.66 : 0;

                entry.sprite.position.set(px, 1.45 + onStageLift + walkBounce + danceBounce, pz);
            });

            Object.keys(playerSpritesRef.current).forEach((id) => {
                if (!activeIds.has(id)) {
                    const entry = playerSpritesRef.current[id];
                    entry.frameSets?.front.forEach((t) => t.dispose());
                    entry.frameSets?.back.forEach((t) => t.dispose());
                    scene.remove(entry.sprite);
                    delete playerSpritesRef.current[id];
                }
            });

            if (curBouquet?.active) {
                bouquetMesh.visible = true;
                bouquetMesh.position.set(
                    curBouquet.x,
                    1.1 + Math.sin(elapsed * 5) * 0.35,
                    curBouquet.z
                );
            } else {
                bouquetMesh.visible = false;
            }

            const { yaw, pitch, distance } = cameraAngleRef.current;
            const targetX = localPosRef.current.x;
            const targetZ = localPosRef.current.z;
            camera.position.set(
                targetX + Math.sin(yaw) * Math.cos(pitch) * distance,
                Math.sin(pitch) * distance + 1.4,
                targetZ + Math.cos(yaw) * Math.cos(pitch) * distance
            );
            camera.lookAt(targetX, 1.4, targetZ);

            renderer.render(scene, camera);
        };

        animate();

        const handleResize = () => {
            if (!container) return;
            const portraitMode = container.clientHeight > container.clientWidth;
            camera.fov = portraitMode ? 68 : 55;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            domElem.removeEventListener('wheel', onWheel);
            domElem.removeEventListener('touchstart', onTouchStart);
            domElem.removeEventListener('touchmove', onTouchMove);
            domElem.removeEventListener('touchend', onTouchEnd);
            domElem.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('resize', handleResize);
            Object.values(playerSpritesRef.current).forEach((entry) => {
                entry.frameSets?.front.forEach((t) => t.dispose());
                entry.frameSets?.back.forEach((t) => t.dispose());
            });
            playerSpritesRef.current = {};
            renderer.dispose();
        };
    }, [mapType]);

    useEffect(() => {
        if (!screenshotTrigger) return;
        const canvas = mountRef.current?.querySelector('canvas');
        if (!canvas) return;
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `dam-cuoi-online-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
    }, [screenshotTrigger]);

    return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />;
}
