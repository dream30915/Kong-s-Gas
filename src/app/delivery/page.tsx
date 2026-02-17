'use client';

import { useState } from 'react';
import Link from 'next/link';
import CustomerSelector from '@/components/CustomerSelector';
import ProductSelector from '@/components/ProductSelector';
import PhotoCapture from '@/components/PhotoCapture';
import SignaturePad from '@/components/SignaturePad';
import { processDelivery, CUSTOMERS, PRODUCTS, generateReceiptData } from '@/lib/store';
import { getCurrentPosition } from '@/lib/gps';
import { generateReceiptImage, sendLineNotification } from '@/lib/line';

type Step = 'customer' | 'products' | 'proof' | 'success';

export default function DeliveryPage() {
    const [step, setStep] = useState<Step>('customer');
    const [customerId, setCustomerId] = useState<number | null>(null);
    const [items, setItems] = useState<{ productId: number; quantity: number }[]>([]);
    const [photo, setPhoto] = useState('');
    const [signature, setSignature] = useState('');
    const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);

    const stepIndex = ['customer', 'products', 'proof', 'success'].indexOf(step);

    const captureGPS = async () => {
        setGpsLoading(true);
        try {
            const pos = await getCurrentPosition();
            setGps(pos);
        } catch (e) {
            console.error(e);
        }
        setGpsLoading(false);
    };

    const handleSubmit = async () => {
        if (!customerId || items.length === 0 || !photo || !signature) return;

        setSubmitting(true);
        try {
            let finalGps = gps;
            if (!finalGps) {
                finalGps = await getCurrentPosition();
                setGps(finalGps);
            }

            const tx = processDelivery(
                customerId,
                items,
                photo,
                signature,
                finalGps?.lat,
                finalGps?.lng
            );

            try {
                const lineToken = process.env.NEXT_PUBLIC_LINE_CHANNEL_TOKEN;
                const lineGroup = process.env.NEXT_PUBLIC_LINE_GROUP_ID;
                if (lineToken && lineGroup) {
                    sendLineNotification(tx, lineToken, lineGroup);
                }
            } catch (e) {
                console.warn('LINE notification skipped');
            }

            setResult(tx);
            setStep('success');
        } catch (e) {
            console.error(e);
            alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
        }
        setSubmitting(false);
    };

    const canProceedFromProducts = items.length > 0;
    const canSubmit = !!photo && !!signature;

    if (step === 'success' && result) {
        const customer = CUSTOMERS.find((c) => c.id === result.customerId);
        return (
            <div className="page-container">
                <div className="result-screen">
                    <div className="result-icon">✅</div>
                    <h1 className="result-title">บันทึกสำเร็จ!</h1>
                    <p style={{ marginBottom: 'var(--space-lg)' }}>
                        ส่งของให้ {customer?.nameTh} เรียบร้อย
                    </p>

                    <div className="card mb-lg" style={{ textAlign: 'left' }}>
                        <div className="flex-between mb-md">
                            <span className="text-muted fs-sm">เลขที่</span>
                            <span className="fs-sm" style={{ fontFamily: 'var(--font-mono)' }}>
                                #{result.id.slice(0, 8)}
                            </span>
                        </div>
                        {result.items.map((item: any) => {
                            const product = PRODUCTS.find((p) => p.id === item.productId);
                            return (
                                <div key={item.productId} className="flex-between mb-md">
                                    <span>
                                        {product?.icon} {product?.nameTh}
                                    </span>
                                    <span className="fw-bold text-accent">
                                        × {item.quantity} {product?.unit}
                                    </span>
                                </div>
                            );
                        })}
                        {gps && (
                            <div className="mt-md">
                                <a
                                    href={`https://www.google.com/maps?q=${gps.lat},${gps.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: 'var(--info)', fontSize: '0.875rem' }}
                                >
                                    📍 ดูตำแหน่งบน Google Maps
                                </a>
                            </div>
                        )}
                    </div>

                    <div className="flex-col">
                        <Link href="/delivery" style={{ textDecoration: 'none' }}>
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    setStep('customer');
                                    setCustomerId(null);
                                    setItems([]);
                                    setPhoto('');
                                    setSignature('');
                                    setGps(null);
                                    setResult(null);
                                }}
                            >
                                📦 เบิกรายการใหม่
                            </button>
                        </Link>
                        <Link href="/" style={{ textDecoration: 'none' }}>
                            <button className="btn btn-secondary">🏠 กลับหน้าหลัก</button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <Link href="/">
                    <button className="back-btn" type="button">←</button>
                </Link>
                <h1>📦 เบิกสินค้า / ส่งของ</h1>
            </div>

            <div className="step-indicator">
                {['customer', 'products', 'proof'].map((s, i) => (
                    <div
                        key={s}
                        className={`step-dot ${i === stepIndex ? 'active' : i < stepIndex ? 'completed' : ''}`}
                    />
                ))}
            </div>

            {step === 'customer' && (
                <div>
                    <p className="step-title">ขั้นตอนที่ 1 — เลือกลูกค้า</p>
                    <div className="form-group">
                        <label className="form-label">👤 ลูกค้า / ไซต์งาน</label>
                        <CustomerSelector value={customerId} onChange={setCustomerId} />
                    </div>
                    <button
                        className="btn btn-primary mt-lg"
                        disabled={!customerId}
                        onClick={() => setStep('products')}
                    >
                        ถัดไป →
                    </button>
                </div>
            )}

            {step === 'products' && (
                <div>
                    <p className="step-title">ขั้นตอนที่ 2 — เลือกสินค้า & จำนวน</p>
                    <div className="form-group">
                        <label className="form-label">📋 เลือกรายการ</label>
                        <ProductSelector selectedItems={items} onChange={setItems} />
                    </div>
                    <div className="grid-2 mt-lg">
                        <button className="btn btn-secondary" onClick={() => setStep('customer')}>
                            ← ย้อนกลับ
                        </button>
                        <button
                            className="btn btn-primary"
                            disabled={!canProceedFromProducts}
                            onClick={() => { captureGPS(); setStep('proof'); }}
                        >
                            ถัดไป →
                        </button>
                    </div>
                </div>
            )}

            {step === 'proof' && (
                <div>
                    <p className="step-title">ขั้นตอนที่ 3 — หลักฐานการส่ง</p>

                    <div className="form-group">
                        <label className="form-label">📍 พิกัด GPS</label>
                        <div className="card" style={{ padding: 'var(--space-md)' }}>
                            {gpsLoading ? (
                                <div className="flex-row">
                                    <div className="spinner" />
                                    <span className="text-muted">กำลังหาพิกัด...</span>
                                </div>
                            ) : gps ? (
                                <div>
                                    <span className="badge badge-success">✓ จับพิกัดได้แล้ว</span>
                                    <p className="text-muted fs-sm mt-sm">
                                        {gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}
                                    </p>
                                </div>
                            ) : (
                                <button
                                    className="btn btn-secondary"
                                    onClick={captureGPS}
                                    style={{ width: 'auto' }}
                                >
                                    📍 จับพิกัดอีกครั้ง
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">📷 ถ่ายรูปหลักฐาน *</label>
                        <PhotoCapture onCapture={setPhoto} required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">✍️ ลายเซ็นผู้รับ *</label>
                        <SignaturePad onSignature={setSignature} />
                    </div>

                    <div className="grid-2 mt-lg">
                        <button className="btn btn-secondary" onClick={() => setStep('products')}>
                            ← ย้อนกลับ
                        </button>
                        <button
                            className="btn btn-primary"
                            disabled={!canSubmit || submitting}
                            onClick={handleSubmit}
                        >
                            {submitting ? (
                                <span className="flex-row" style={{ justifyContent: 'center' }}>
                                    <span className="spinner" /> กำลังบันทึก...
                                </span>
                            ) : (
                                '✅ ยืนยันส่งของ'
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
