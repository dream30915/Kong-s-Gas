'use client';

import { useState } from 'react';
import Link from 'next/link';
import CustomerSelector from '@/components/CustomerSelector';
import ProductSelector from '@/components/ProductSelector';
import PhotoCapture from '@/components/PhotoCapture';
import { processReturn, CUSTOMERS, PRODUCTS } from '@/lib/store';

type Step = 'customer' | 'products' | 'success';

export default function ReturnPage() {
    const [step, setStep] = useState<Step>('customer');
    const [customerId, setCustomerId] = useState<number | null>(null);
    const [items, setItems] = useState<{ productId: number; quantity: number }[]>([]);
    const [damageFlags, setDamageFlags] = useState<Record<number, boolean>>({});
    const [damagePhoto, setDamagePhoto] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);

    const hasDamaged = Object.values(damageFlags).some((v) => v);
    const needsDamagePhoto = hasDamaged && !damagePhoto;

    const toggleDamage = (productId: number) => {
        setDamageFlags((prev) => ({ ...prev, [productId]: !prev[productId] }));
    };

    const handleSubmit = async () => {
        if (!customerId || items.length === 0) return;
        if (needsDamagePhoto) {
            alert('กรุณาถ่ายรูปถังที่ชำรุด');
            return;
        }

        setSubmitting(true);
        try {
            const returnItems = items.map((item) => ({
                ...item,
                isDamaged: damageFlags[item.productId] || false,
            }));

            const tx = processReturn(customerId, returnItems, damagePhoto || undefined);
            setResult(tx);
            setStep('success');
        } catch (e) {
            console.error(e);
            alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
        }
        setSubmitting(false);
    };

    if (step === 'success' && result) {
        const customer = CUSTOMERS.find((c) => c.id === result.customerId);
        return (
            <div className="page-container">
                <div className="result-screen">
                    <div className="result-icon">♻️</div>
                    <h1 className="result-title">รับคืนสำเร็จ!</h1>
                    <p style={{ marginBottom: 'var(--space-lg)' }}>
                        รับถังคืนจาก {customer?.nameTh} เรียบร้อย
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
                                        {item.isDamaged && (
                                            <span className="badge badge-danger" style={{ marginLeft: '8px' }}>
                                                ชำรุด
                                            </span>
                                        )}
                                    </span>
                                    <span className="fw-bold text-accent">
                                        × {item.quantity} {product?.unit}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex-col">
                        <Link href="/return" style={{ textDecoration: 'none' }}>
                            <button
                                className="btn btn-success"
                                onClick={() => {
                                    setStep('customer');
                                    setCustomerId(null);
                                    setItems([]);
                                    setDamageFlags({});
                                    setDamagePhoto('');
                                    setResult(null);
                                }}
                            >
                                ♻️ รับคืนรายการใหม่
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
                <h1>♻️ รับถังคืน</h1>
            </div>

            {step === 'customer' && (
                <div>
                    <p className="step-title">เลือกลูกค้าที่จะรับคืน</p>
                    <div className="form-group">
                        <label className="form-label">👤 ลูกค้า / ไซต์งาน</label>
                        <CustomerSelector value={customerId} onChange={setCustomerId} />
                    </div>
                    <button
                        className="btn btn-success mt-lg"
                        disabled={!customerId}
                        onClick={() => setStep('products')}
                    >
                        ถัดไป →
                    </button>
                </div>
            )}

            {step === 'products' && (
                <div>
                    <p className="step-title">เลือกรายการ & เช็คสภาพ</p>

                    <div className="form-group">
                        <label className="form-label">📋 เลือกสินค้าที่รับคืน</label>
                        <ProductSelector selectedItems={items} onChange={setItems} />
                    </div>

                    {items.length > 0 && (
                        <div className="form-group">
                            <label className="form-label">🔍 เช็คสภาพถัง</label>
                            <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
                                {items.map((item) => {
                                    const product = PRODUCTS.find((p) => p.id === item.productId);
                                    const isDamaged = damageFlags[item.productId] || false;
                                    return (
                                        <label
                                            key={item.productId}
                                            className="toggle-group"
                                            style={
                                                isDamaged
                                                    ? { borderColor: 'var(--danger)', background: 'var(--danger-bg)' }
                                                    : {}
                                            }
                                        >
                                            <div className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={isDamaged}
                                                    onChange={() => toggleDamage(item.productId)}
                                                />
                                                <span className="toggle-slider" />
                                            </div>
                                            <div>
                                                <div className="toggle-label">
                                                    {product?.icon} {product?.nameTh} — ถังชำรุด?
                                                </div>
                                                <div className="toggle-sublabel">
                                                    {isDamaged
                                                        ? '⚠️ จะส่งเข้าซ่อม'
                                                        : '✓ สภาพดี — เข้าสต็อกถังเปล่า'}
                                                </div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {hasDamaged && (
                        <div className="form-group">
                            <label className="form-label">📷 ถ่ายรูปถังชำรุด *</label>
                            <PhotoCapture
                                onCapture={setDamagePhoto}
                                label="📷 ถ่ายรูปถังที่เสียหาย"
                                required
                            />
                        </div>
                    )}

                    <div className="grid-2 mt-lg">
                        <button className="btn btn-secondary" onClick={() => setStep('customer')}>
                            ← ย้อนกลับ
                        </button>
                        <button
                            className="btn btn-success"
                            disabled={items.length === 0 || needsDamagePhoto || submitting}
                            onClick={handleSubmit}
                        >
                            {submitting ? (
                                <span className="flex-row" style={{ justifyContent: 'center' }}>
                                    <span className="spinner" /> กำลังบันทึก...
                                </span>
                            ) : (
                                '✅ ยืนยันรับคืน'
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
