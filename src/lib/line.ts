// LINE Messaging API Integration
import { type Transaction, CUSTOMERS, PRODUCTS } from '@/lib/store';

const LINE_API = 'https://api.line.me/v2/bot/message/push';

export async function sendLineNotification(
    tx: Transaction,
    channelToken: string,
    groupId: string
): Promise<boolean> {
    const customer = CUSTOMERS.find((c) => c.id === tx.customerId);
    const items = tx.items.map((item) => {
        const product = PRODUCTS.find((p) => p.id === item.productId);
        return { name: product?.nameTh || '-', quantity: item.quantity, unit: product?.unit || '' };
    });
    const date = new Date(tx.createdAt);
    const dateStr = date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const mapsLink = tx.gpsLat && tx.gpsLng ? `https://www.google.com/maps?q=${tx.gpsLat},${tx.gpsLng}` : null;
    const itemLines = items.map((i) => `  • ${i.name} × ${i.quantity} ${i.unit}`).join('\n');
    const typeLabel = tx.type === 'delivery' ? '📦 ส่งของ' : '♻️ รับคืน';
    let message = `${typeLabel}\n━━━━━━━━━━━━━━━\n📅 ${dateStr}\n👤 ลูกค้า: ${customer?.nameTh || '-'}\n━━━━━━━━━━━━━━━\nรายการ:\n${itemLines}\n━━━━━━━━━━━━━━━`;
    if (mapsLink) { message += `\n📍 ตำแหน่ง: ${mapsLink}`; }
    message += `\n\n✅ บันทึกเรียบร้อย #${tx.id.slice(0, 8)}`;
    try {
        const response = await fetch(LINE_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${channelToken}` },
            body: JSON.stringify({ to: groupId, messages: [{ type: 'text', text: message }] }),
        });
        return response.ok;
    } catch (error) {
        console.error('LINE notification failed:', error);
        return false;
    }
}

export function generateReceiptImage(tx: Transaction): Promise<string> {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 800;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 600, 800);
        ctx.fillStyle = '#1a1d2e';
        ctx.fillRect(0, 0, 600, 80);
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🔥 Pro Gas Management', 300, 50);
        const typeLabel = tx.type === 'delivery' ? '📦 ใบส่งของ' : '♻️ ใบรับคืน';
        ctx.fillStyle = tx.type === 'delivery' ? '#f59e0b' : '#10b981';
        ctx.fillRect(180, 95, 240, 36);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(typeLabel, 300, 120);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#333333';
        let y = 170;
        const customer = CUSTOMERS.find((c) => c.id === tx.customerId);
        const date = new Date(tx.createdAt);
        const dateStr = date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#888888';
        ctx.fillText('วันที่:', 40, y);
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(dateStr, 120, y);
        y += 35;
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#888888';
        ctx.fillText('ลูกค้า:', 40, y);
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(customer?.nameTh || '-', 120, y);
        y += 45;
        ctx.strokeStyle = '#eeeeee';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(560, y);
        ctx.stroke();
        y += 25;
        ctx.fillStyle = '#888888';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('รายการสินค้า', 40, y);
        y += 25;
        tx.items.forEach((item) => {
            const product = PRODUCTS.find((p) => p.id === item.productId);
            ctx.fillStyle = '#333333';
            ctx.font = '18px sans-serif';
            ctx.fillText(`${product?.icon} ${product?.nameTh || '-'}`, 60, y);
            ctx.textAlign = 'right';
            ctx.font = 'bold 18px sans-serif';
            ctx.fillStyle = '#f59e0b';
            ctx.fillText(`× ${item.quantity} ${product?.unit || ''}`, 560, y);
            ctx.textAlign = 'left';
            y += 32;
        });
        y += 15;
        if (tx.gpsLat && tx.gpsLng) {
            ctx.strokeStyle = '#eeeeee';
            ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(560, y); ctx.stroke();
            y += 25;
            ctx.fillStyle = '#888888';
            ctx.font = '14px sans-serif';
            ctx.fillText(`📍 พิกัด: ${tx.gpsLat.toFixed(4)}, ${tx.gpsLng.toFixed(4)}`, 40, y);
            y += 30;
        }
        if (tx.signatureUrl) {
            y += 10;
            ctx.strokeStyle = '#eeeeee';
            ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(560, y); ctx.stroke();
            y += 20;
            ctx.fillStyle = '#888888';
            ctx.font = '14px sans-serif';
            ctx.fillText('ลายเซ็นผู้รับ:', 40, y);
            y += 10;
            const sigImg = new Image();
            sigImg.onload = () => {
                ctx.drawImage(sigImg, 40, y, 200, 100);
                ctx.fillStyle = '#cccccc';
                ctx.font = '12px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`Ref: ${tx.id.slice(0, 12)} | Pro Gas Management System`, 300, 750);
                resolve(canvas.toDataURL('image/png'));
            };
            sigImg.onerror = () => { resolve(canvas.toDataURL('image/png')); };
            sigImg.src = tx.signatureUrl;
        } else {
            ctx.fillStyle = '#cccccc';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`Ref: ${tx.id.slice(0, 12)} | Pro Gas Management System`, 300, 750);
            resolve(canvas.toDataURL('image/png'));
        }
    });
}
