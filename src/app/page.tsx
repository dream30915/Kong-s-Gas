'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getStockSummary } from '@/lib/store';

export default function HomePage() {
    const [showAdmin, setShowAdmin] = useState(false);
    const [tapCount, setTapCount] = useState(0);
    const [stockWarning, setStockWarning] = useState(false);

    useEffect(() => {
        const summary = getStockSummary();
        setStockWarning(summary.some((s) => s.isLow));
    }, []);

    const handleLogoTap = () => {
        const next = tapCount + 1;
        setTapCount(next);
        if (next >= 5) {
            setShowAdmin(true);
            setTapCount(0);
        }
        setTimeout(() => setTapCount(0), 2000);
    };

    return (
        <div className="page-container">
            <div style={{ textAlign: 'center', padding: 'var(--space-xl) 0' }}>
                <div
                    onClick={handleLogoTap}
                    style={{ cursor: 'default', userSelect: 'none' }}
                >
                    <div style={{ fontSize: '4rem', marginBottom: 'var(--space-md)' }}>
                        🔥
                    </div>
                    <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-xs)' }}>
                        Pro Gas Management
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        ระบบจัดการแก๊สมืออาชีพ
                    </p>
                </div>

                {stockWarning && (
                    <div
                        className="badge badge-danger mt-md"
                        style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                    >
                        ⚠️ สต็อกเหลือน้อย
                    </div>
                )}
            </div>

            <div className="flex-col" style={{ gap: 'var(--space-lg)' }}>
                <Link href="/delivery" style={{ textDecoration: 'none' }}>
                    <button className="btn btn-mega btn-primary" type="button">
                        <span className="btn-icon">📦</span>
                        <span>เบิกสินค้า / ส่งของ</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 400, opacity: 0.8 }}>
                            Smart Delivery
                        </span>
                    </button>
                </Link>

                <Link href="/return" style={{ textDecoration: 'none' }}>
                    <button className="btn btn-mega btn-success" type="button">
                        <span className="btn-icon">♻️</span>
                        <span>รับถังคืน</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 400, opacity: 0.8 }}>
                            Smart Return
                        </span>
                    </button>
                </Link>
            </div>

            {showAdmin && (
                <div style={{ marginTop: 'var(--space-xl)', animationName: 'fade-in', animationDuration: '0.3s' }}>
                    <Link href="/admin" style={{ textDecoration: 'none' }}>
                        <button className="btn btn-secondary" type="button">
                            🔐 แดชบอร์ดเถ้าแก่ (Admin)
                        </button>
                    </Link>
                </div>
            )}

            <div style={{ textAlign: 'center', marginTop: 'var(--space-2xl)', paddingTop: 'var(--space-lg)' }}>
                <p className="text-muted" style={{ fontSize: '0.75rem' }}>
                    v1.0 • Pro Gas & Asset Management
                </p>
            </div>
        </div>
    );
}
