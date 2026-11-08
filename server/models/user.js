const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
    {
        username: { type: String, required: true, unique: true, trim: true, lowercase: true },
        passwordHash: { type: String, required: true },
        recoveryPinHash: { type: String, required: true },
        displayName: { type: String, required: true, trim: true },
        gender: { type: String, enum: ['♂', '♀'], default: '♂' },
        role: { type: String, enum: ['groom', 'bride', 'guest', 'tray'], default: 'groom' },
        outfit: {
            style: { type: String, default: 'royal_wedding' }, // royal_wedding, ao_dai_do, vest_lich_lam, ba_ba
            primaryColor: { type: String, default: '#ffffff' },
            accentColor: { type: String, default: '#ff69b4' },
            hasCrown: { type: Boolean, default: true },
            prop: { type: String, default: 'ring_box' } // ring_box, bouquet, wine_glass, tray
        },
        xuHy: { type: Number, default: 500000 },
        fullness: { type: Number, default: 50 },
        vowLuck: { type: Number, default: 10 },
        inventory: {
            type: [String],
            default: ['Vương miện Hoàng Gia', 'Nhẫn Kim Cương Vĩnh Cửu', 'Phong bì đỏ may mắn']
        },
        achievements: {
            type: [String],
            default: ['Khách mời danh dự']
        },
        friends: {
            type: [String],
            default: ['Hải Tuân', 'Là Em Đây']
        },
        weddingHistory: [
            {
                groomName: String,
                brideName: String,
                giftAmount: Number,
                note: String,
                timestamp: { type: Date, default: Date.now }
            }
        ],
        lastRoom: { type: String, default: 'room_1' },
        lastPosition: {
            x: { type: Number, default: 0 },
            z: { type: Number, default: 8 }
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);