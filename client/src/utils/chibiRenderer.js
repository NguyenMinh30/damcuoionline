import * as THREE from 'three';

export function createChibiCharacterTexture({
    displayName = 'Hải Tuân',
    gender = '♂',
    role = 'groom',
    hasCrown = true,
    primaryColor = '#ffffff',
    accentColor = '#ff69b4',
    chatText = '',
    action = 'idle',
    walkPhase = 0, // 0: Đứng yên, 1: Bước chân trái, 2: Bước chân phải
    facing = 'front' // 'front': Nhìn về camera, 'back': Quay lưng khi đi vào trong
}) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isBack = facing === 'back';

    // Độ lệch chân & tay theo nhịp bước đi (walkPhase)
    const leftLegLift = walkPhase === 1 ? -18 : walkPhase === 2 ? 4 : 0;
    const rightLegLift = walkPhase === 2 ? -18 : walkPhase === 1 ? 4 : 0;
    const leftLegShiftX = walkPhase === 1 ? -6 : walkPhase === 2 ? 4 : 0;
    const rightLegShiftX = walkPhase === 2 ? 6 : walkPhase === 1 ? -4 : 0;
    const skirtSway = walkPhase === 1 ? -10 : walkPhase === 2 ? 10 : 0;
    const leftArmSwing = walkPhase === 1 ? 14 : walkPhase === 2 ? -14 : 0;
    const rightArmSwing = walkPhase === 1 ? -14 : walkPhase === 2 ? 14 : 0;
    const bodyBob = walkPhase !== 0 ? -4 : 0;

    // Hạ thấp trọng tâm nhân vật xuống gần đáy Canvas để chân chạm sát mặt đất
    const centerX = 256;
    const headY = 278 + bodyBob;

    // 1. Bong bóng chat phía trên đỉnh đầu (nếu có)
    if (chatText) {
        ctx.save();
        ctx.font = 'bold 22px "Segoe UI", sans-serif';
        const textWidth = Math.min(ctx.measureText(chatText).width + 36, 460);
        const bx = 256 - textWidth / 2;
        const by = 45;
        roundRect(ctx, bx, by, textWidth, 48, 22);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#f59e0b';
        ctx.stroke();

        ctx.fillStyle = '#1f122b';
        ctx.textAlign = 'center';
        ctx.fillText(chatText.slice(0, 32), 256, by + 31);
        ctx.restore();
    }

    // Bóng đổ tiếp đất ngay dưới hai bàn chân (Giúp nhân vật bám mặt sàn 3D)
    ctx.save();
    ctx.translate(centerX, 514);
    ctx.scale(2.4, 0.45);
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fill();
    ctx.restore();

    // 2. Lớp khăn voan lót phía sau (Khi nhân vật nhìn thẳng 'front')
    if (!isBack && (role === 'bride' || gender === '♀')) {
        drawBrideVeil(ctx, centerX, headY, skirtSway, 0.82);
    }

    // 3. Thân, Đôi Chân & Đôi Tay Chibi
    ctx.save();
    if (role === 'bride' || gender === '♀') {
        // Hai bàn chân & giày cưới trắng hồng chạm sát mốc mặt đất (y = 514)
        ctx.save();
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#5c3a28';

        roundRect(ctx, centerX - 44 + leftLegShiftX, headY + 214 + leftLegLift, 32, 22, 10);
        ctx.fillStyle = '#ffe4e6';
        ctx.fill();
        ctx.stroke();

        roundRect(ctx, centerX + 12 + rightLegShiftX, headY + 214 + rightLegLift, 32, 22, 10);
        ctx.fillStyle = '#ffe4e6';
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Hai cánh tay cô dâu
        drawChibiArm(
            ctx,
            centerX - 66,
            headY + 76 + leftArmSwing,
            24,
            58,
            0.22,
            primaryColor || '#ffffff',
            '#ffe4d6'
        );
        drawChibiArm(
            ctx,
            centerX + 42,
            headY + 76 + rightArmSwing,
            24,
            58,
            -0.22,
            primaryColor || '#ffffff',
            '#ffe4d6'
        );

        // Váy cưới phồng công chúa đung đưa theo bước chân
        ctx.beginPath();
        ctx.moveTo(centerX - 36, headY + 65);
        ctx.quadraticCurveTo(
            centerX - 116 + skirtSway,
            headY + 175,
            centerX - 100 + skirtSway,
            headY + 222
        );
        ctx.quadraticCurveTo(
            centerX + skirtSway,
            headY + 238,
            centerX + 100 + skirtSway,
            headY + 222
        );
        ctx.quadraticCurveTo(centerX + 116 + skirtSway, headY + 175, centerX + 36, headY + 65);
        ctx.closePath();
        ctx.fillStyle = primaryColor || '#ffffff';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#5c3a28';
        ctx.stroke();

        if (isBack) {
            drawBow(ctx, centerX + skirtSway * 0.4, headY + 122, accentColor || '#ff69b4', 1.6);
            drawBow(ctx, centerX - 35 + skirtSway * 0.5, headY + 178, '#ff85c0', 1.0);
            drawBow(ctx, centerX + 35 + skirtSway * 0.5, headY + 178, '#ff85c0', 1.0);
        } else {
            drawBow(ctx, centerX - 38 + skirtSway * 0.5, headY + 145, accentColor, 1.0);
            drawBow(ctx, centerX + 42 + skirtSway * 0.5, headY + 170, accentColor, 1.0);
            drawBow(ctx, centerX + skirtSway * 0.3, headY + 112, '#ff85c0', 1.0);

            ctx.beginPath();
            ctx.arc(centerX + 54, headY + 128 + rightArmSwing * 0.6, 22, 0, Math.PI * 2);
            ctx.fillStyle = '#ffd6e7';
            ctx.fill();
            ctx.stroke();
            drawBow(ctx, centerX + 54, headY + 128 + rightArmSwing * 0.6, '#f43f5e', 0.8);
        }
    } else {
        // CHÚ RỂ / NAM: Quần âu + Đôi giày tây chạm sát mốc mặt đất (y = 514)
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#4a2e1b';

        const leftLegH = Math.max(46, 66 + leftLegLift);
        roundRect(ctx, centerX - 38 + leftLegShiftX, headY + 158, 32, leftLegH, 10);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.stroke();

        roundRect(ctx, centerX - 42 + leftLegShiftX, headY + 158 + leftLegH - 6, 36, 20, 8);
        ctx.fillStyle = '#1f1610';
        ctx.fill();

        const rightLegH = Math.max(46, 66 + rightLegLift);
        roundRect(ctx, centerX + 6 + rightLegShiftX, headY + 158, 32, rightLegH, 10);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.stroke();

        roundRect(ctx, centerX + 6 + rightLegShiftX, headY + 158 + rightLegH - 6, 36, 20, 8);
        ctx.fillStyle = '#1f1610';
        ctx.fill();

        // Hai cánh tay chú rể
        drawChibiArm(
            ctx,
            centerX - 72,
            headY + 72 + leftArmSwing,
            26,
            64,
            0.18,
            primaryColor || '#ffffff',
            '#ffe4d6'
        );
        drawChibiArm(
            ctx,
            centerX + 46,
            headY + 72 + rightArmSwing,
            26,
            64,
            -0.18,
            primaryColor || '#ffffff',
            '#ffe4d6'
        );

        // Thân áo vest trắng
        roundRect(ctx, centerX - 48, headY + 64, 96, 104, 22);
        ctx.fillStyle = primaryColor || '#ffffff';
        ctx.fill();
        ctx.stroke();

        if (isBack) {
            ctx.beginPath();
            ctx.moveTo(centerX, headY + 68);
            ctx.lineTo(centerX, headY + 166);
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#cbd5e1';
            ctx.stroke();

            roundRect(ctx, centerX - 28, headY + 60, 56, 12, 5);
            ctx.fillStyle = '#334155';
            ctx.fill();
        } else {
            drawBow(ctx, centerX, headY + 82, '#ff4d94', 1.0);
            ctx.beginPath();
            ctx.arc(centerX - 20, headY + 112, 9, 0, Math.PI * 2);
            ctx.fillStyle = '#ff85c0';
            ctx.fill();

            const boxY = headY + 114 + leftArmSwing;
            roundRect(ctx, centerX - 88, boxY, 32, 32, 8);
            ctx.fillStyle = '#3b2f4a';
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(centerX - 72, boxY + 16, 7.5, 0, Math.PI * 2);
            ctx.fillStyle = '#e0f2fe';
            ctx.fill();
        }
    }

    if (action === 'toast') {
        roundRect(ctx, centerX + 58, headY + 55, 24, 42, 6);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
    }
    ctx.restore();

    // 4. Đầu & Tóc
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, headY, 74, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe4d6';
    ctx.fill();
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = '#52301c';
    ctx.stroke();

    if (isBack) {
        ctx.beginPath();
        ctx.arc(centerX, headY - 4, 76, 0, Math.PI * 2);
        ctx.fillStyle = role === 'bride' || gender === '♀' ? '#e6dec8' : '#59331d';
        ctx.fill();
        ctx.lineWidth = 4.5;
        ctx.strokeStyle = '#52301c';
        ctx.stroke();

        if (role === 'bride' || gender === '♀') {
            drawBow(ctx, centerX, headY + 25, '#ff69b4', 1.3);
            drawBrideVeil(ctx, centerX, headY, skirtSway, 0.72);
        } else {
            roundRect(ctx, centerX - 26, headY + 58, 52, 16, 8);
            ctx.fillStyle = '#ffe4d6';
            ctx.fill();
        }
    } else {
        ctx.beginPath();
        if (role === 'bride' || gender === '♀') {
            ctx.arc(centerX, headY - 12, 78, Math.PI * 0.95, Math.PI * 2.05);
            ctx.fillStyle = '#e6dec8';
        } else {
            ctx.arc(centerX, headY - 14, 78, Math.PI * 0.92, Math.PI * 2.08);
            ctx.fillStyle = '#59331d';
        }
        ctx.fill();
        ctx.stroke();

        drawChibiEye(ctx, centerX - 28, headY + 8);
        drawChibiEye(ctx, centerX + 28, headY + 8);

        drawCheekBlush(ctx, centerX - 42, headY + 26);
        drawCheekBlush(ctx, centerX + 42, headY + 26);

        ctx.beginPath();
        ctx.arc(centerX, headY + 28, 12, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.fillStyle = '#e11d48';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#52301c';
        ctx.stroke();
    }
    ctx.restore();

    // 5. Vương miện hoàng gia
    if (hasCrown) {
        ctx.save();
        const cy = headY - 76;
        ctx.beginPath();
        ctx.moveTo(centerX - 38, cy);
        ctx.lineTo(centerX - 44, cy - 38);
        ctx.lineTo(centerX - 18, cy - 18);
        ctx.lineTo(centerX, cy - 46);
        ctx.lineTo(centerX + 18, cy - 18);
        ctx.lineTo(centerX + 44, cy - 38);
        ctx.lineTo(centerX + 38, cy);
        ctx.closePath();
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#78350f';
        ctx.stroke();

        if (!isBack) {
            ctx.beginPath();
            ctx.arc(centerX, cy - 16, 7, 0, Math.PI * 2);
            ctx.fillStyle = '#38bdf8';
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
    }

    // 6. Bảng tên đặt ngay sát dưới đế giày (y = 532)
    ctx.save();
    const badgeW = 320;
    const badgeH = 52;
    const badgeX = centerX - badgeW / 2;
    const badgeY = 532;

    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 26);
    ctx.fillStyle = 'rgba(116, 86, 34, 0.92)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fde68a';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(badgeX + 29, badgeY + 26, 19, 0, Math.PI * 2);
    ctx.fillStyle = gender === '♀' ? '#ec4899' : '#2563eb';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.font = 'bold 24px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    const label = `${displayName.slice(0, 12)} ${gender}`;
    ctx.fillText(label, centerX + 14, badgeY + 34);
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

function drawChibiArm(ctx, x, y, w, h, angle, sleeveColor, skinColor) {
    ctx.save();
    ctx.translate(x + w / 2, y);
    ctx.rotate(angle);

    roundRect(ctx, -w / 2, 0, w, h - 12, 11);
    ctx.fillStyle = sleeveColor;
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#4a2e1b';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, h - 6, 11, 0, Math.PI * 2);
    ctx.fillStyle = skinColor;
    ctx.fill();
    ctx.stroke();

    ctx.restore();
}

function drawBrideVeil(ctx, centerX, headY, skirtSway, opacity) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(centerX, headY - 75);
    ctx.quadraticCurveTo(
        centerX - 135 + skirtSway * 0.6,
        headY + 35,
        centerX - 115 + skirtSway,
        headY + 205
    );
    ctx.quadraticCurveTo(centerX, headY + 235, centerX + 115 + skirtSway, headY + 205);
    ctx.quadraticCurveTo(centerX + 135 + skirtSway * 0.6, headY + 35, centerX, headY - 75);
    ctx.fillStyle = `rgba(255, 240, 248, ${opacity})`;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.stroke();
    ctx.restore();
}

function drawCheekBlush(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1.6, 0.9);
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 120, 150, 0.55)';
    ctx.fill();
    ctx.restore();
}

function drawChibiEye(ctx, x, y) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fillStyle = '#3b1d11';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x - 4, y - 4, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x + 4, y + 4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawBow(ctx, x, y, color, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = color;

    ctx.save();
    ctx.translate(-9, 0);
    ctx.rotate(-0.2);
    ctx.scale(1.4, 0.9);
    ctx.beginPath();
    ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(9, 0);
    ctx.rotate(0.2);
    ctx.scale(1.4, 0.9);
    ctx.beginPath();
    ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}