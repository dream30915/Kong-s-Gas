'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    getAssetMatrix,
    getStockSummary,
    getTransactions,
    CUSTOMERS,
    PRODUCTS,
    type Transaction,
} from '@/lib/store';

type Tab = 'matrix' | 'stock' | 'history';

export default function AdminPage() {
    const [authenticated, setAuthenticated] = useState(false);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState(false);
    const [tab, setTab] = useState<Tab>('matrix');
    const [viewTx, setViewTx] = useState<Transaction | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const handlePin = () => {
        if (pin === '00000') {
            setAuthenticated(true);
            setPinError(false);
        } else {
            setPinError(true);
            setPin('');
        }
    };

    const refresh = () => setRefreshKey((k) => k + 1);

    if (!authenticated) {
        return (
            <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80dvh' }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-lg)' }}>🔐</div>
                <h2 style={{ marginBottom: 'var(--space-sm)' }}>แดชบอร์ดเถ้าแก่</h2>
                <p className="text-muted" style={{ marginBottom: 'var(--space-xl)' }}>ใส่รหัส PIN เพื่อเข้าใช้งาน</p>
                <div style={{ width: '100%', maxWidth: '280px' }}>
                    <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        className="form-input"
                        style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em', fontFamily: 'var(--font-mono)' }}
                        value={pin}
                        onChange={(e) => { setPin(e.target.value); setPinError(false); }}
                        onKeyDown={(e) => e.key === 'Enter' && handlePin()}
                        placeholder="••••"
                        autoFocus
                    />
                    {pinError && (
                        <p className="text-danger text-center mt-sm" style={{ fontSize: '0.875rem' }}>
                            ❌ รหัสไม่ถูกต้อง
                        </p>
                    )}
                    <button className="btn btn-primary mt-md" onClick={handlePin}>
                        เข้าสู่ระบบ
                    </button>
                    <Link href="/" style={{ textDecoration: 'none' }}>
                        <button className="btn btn-ghost mt-sm">← กลับหน้าหลัก</button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <Link href="/"><button className="back-btn" type="button">←</button></Link>
                <h1>🔐 แดชบอร์ดเถ้าแก่</h1>
                <button className="btn-ghost" onClick={refresh} style={{ width: 'auto', padding: '8px', fontSize: '1.25rem' }}>🔄</button>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-lg)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '4px' }}>
                {[
                    { key: 'matrix' as Tab, label: '📊 ยอดค้าง' },
                    { key: 'stock' as Tab, label: '📦 สต็อก' },
                    { key: 'history' as Tab, label: '📜 ประวัติ' },
                ].map((t) => (
                    <button
                        key={t.key}
                        className={tab === t.key ? 'btn btn-primary' : 'btn btn-ghost'}
                        style={{ flex: 1, minHeight: '44px', fontSize: '0.8rem', padding: '8px' }}
                        onClick={() => setTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'matrix' && <AssetMatrixTab key={refreshKey} />}
            {tab === 'stock' && <StockTab key={refreshKey} />}
            {tab === 'history' && <HistoryTab onView={setViewTx} key={refreshKey} />}

            {viewTx && (
                <TransactionModal tx={viewTx} onClose={() => setViewTx(null)} />
            )}
        </div>
    );
}

function AssetMatrixTab() {
    const [matrix, setMatrix] = useState<Awaited<ReturnType<typeof getAssetMatrix>>>([]);

    useEffect(() => {
        (async () => {
            setMatrix(await getAssetMatrix());
        })();
    }, []);

    const totalDebt = matrix.reduce((sum, m) => sum + m.total, 0);

    return (
        <div>
            <div className="card card-glow mb-lg" style={{ textAlign: 'center' }}>
                <div className="stat-value" style={{ fontSize: '2.5rem' }}>{totalDebt}</div>
                <div className="stat-label">ถังค้างทั้งหมด</div>
            </div>

            <div className="flex-col">
                {matrix.map((row) => (
                    <div key={row.customer.id} className="card" style={{ padding: 'var(--space-md)' }}>
                        <div className="flex-between mb-sm">
                            <h3>{row.customer.nameTh}</h3>
                            {row.total > 0 ? (
                                <span className="badge badge-warning">{row.total} ถัง</span>
                            ) : (
                                <span className="badge badge-success">เคลียร์แล้ว</span>
                            )}
                        </div>
                        {row.debts.length > 0 ? (
                            <div>
                                {row.debts.map((d) => (
                                    <div key={d.product.id} className="flex-between" style={{ padding: '4px 0' }}>
                                        <span className="text-secondary fs-sm">
                                            {d.product.icon} {d.product.nameTh}
                                        </span>
                                        <span className="fw-bold text-accent">
                                            {d.quantity} {d.product.unit}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted fs-sm">ไม่มียอดค้าง</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function StockTab() {
    const [stocks, setStocks] = useState<Awaited<ReturnType<typeof getStockSummary>>>([]);

    useEffect(() => {
        (async () => {
            setStocks(await getStockSummary());
        })();
    }, []);

    return (
        <div>
            <div className="flex-col">
                {stocks.map((s) => (
                    <div key={s.product.id} className="card" style={{ padding: 'var(--space-md)' }}>
                        <div className="flex-between mb-md">
                            <h3>{s.product.icon} {s.product.nameTh}</h3>
                            {s.isLow && <span className="badge badge-danger">⚠️ เหลือน้อย!</span>}
                        </div>
                        <div className="grid-3" style={{ gap: 'var(--space-sm)' }}>
                            <div className="stat-card">
                                <div className={`stat-value ${s.isLow ? 'stock-low' : ''}`} style={{ fontSize: '1.5rem' }}>
                                    {s.full}
                                </div>
                                <div className="stat-label">ถังเต็ม</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value" style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>
                                    {s.empty}
                                </div>
                                <div className="stat-label">ถังเปล่า</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value" style={{ fontSize: '1.5rem', color: s.repair > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                                    {s.repair}
                                </div>
                                <div className="stat-label">ซ่อม</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function HistoryTab({ onView }: { onView: (tx: Transaction) => void }) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        (async () => {
            setTransactions(await getTransactions());
        })();
    }, []);

    if (transactions.length === 0) {
        return (
            <div className="text-center" style={{ padding: 'var(--space-2xl) 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)', opacity: 0.4 }}>📜</div>
                <p className="text-muted">ยังไม่มีรายการ</p>
            </div>
        );
    }

    return (
        <div>
            {transactions.slice(0, 50).map((tx) => {
                const customer = CUSTOMERS.find((c) => c.id === tx.customerId);
                const date = new Date(tx.createdAt);
                const dateStr = date.toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                });

                return (
                    <div key={tx.id} className="tx-card" onClick={() => onView(tx)} style={{ cursor: 'pointer' }}>
                        <div className="tx-header">
                            <span className="fw-bold">
                                {tx.type === 'delivery' ? '📦' : '♻️'} {customer?.nameTh}
                            </span>
                            <span className={`badge ${tx.type === 'delivery' ? 'badge-warning' : 'badge-success'}`}>
                                {tx.type === 'delivery' ? 'ส่ง' : 'คืน'}
                            </span>
                        </div>
                        <div className="tx-items">
                            {tx.items.map((item, i) => {
                                const product = PRODUCTS.find((p) => p.id === item.productId);
                                return (
                                    <span key={i}>
                                        {product?.nameTh} ×{item.quantity}
                                        {i < tx.items.length - 1 ? ', ' : ''}
                                    </span>
                                );
                            })}
                        </div>
                        <div className="tx-meta">
                            <span>🕐 {dateStr}</span>
                            {tx.photoUrl && <span>📷</span>}
                            {tx.signatureUrl && <span>✍️</span>}
                            {tx.gpsLat && <span>📍</span>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function TransactionModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
    const customer = CUSTOMERS.find((c) => c.id === tx.customerId);
    const date = new Date(tx.createdAt);
    const dateStr = date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-handle" />

                <div className="flex-between mb-lg">
                    <h2>{tx.type === 'delivery' ? '📦 ใบส่งของ' : '♻️ ใบรับคืน'}</h2>
                    <button className="btn-ghost" onClick={onClose} style={{ width: 'auto', fontSize: '1.5rem' }}>✕</button>
                </div>

                <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
                    <div className="flex-between">
                        <span className="text-muted">เลขที่</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>#{tx.id.slice(0, 12)}</span>
                    </div>
                    <div className="flex-between">
                        <span className="text-muted">วันที่</span>
                        <span>{dateStr}</span>
                    </div>
                    <div className="flex-between">
                        <span className="text-muted">ลูกค้า</span>
                        <span className="fw-bold">{customer?.nameTh}</span>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)' }}>
                        <span className="form-label">รายการ</span>
                        {tx.items.map((item, i) => {
                            const product = PRODUCTS.find((p) => p.id === item.productId);
                            return (
                                <div key={i} className="flex-between" style={{ padding: '4px 0' }}>
                                    <span>{product?.icon} {product?.nameTh}</span>
                                    <span className="fw-bold text-accent">
                                        × {item.quantity}
                                        {item.isDamaged && <span className="badge badge-danger" style={{ marginLeft: '8px' }}>ชำรุด</span>}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {tx.gpsLat && tx.gpsLng && (
                        <div>
                            <span className="form-label">📍 ตำแหน่ง</span>
                            <a
                                href={`https://www.google.com/maps?q=${tx.gpsLat},${tx.gpsLng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary"
                                style={{ fontSize: '0.875rem' }}
                            >
                                🗺️ เปิด Google Maps
                            </a>
                        </div>
                    )}

                    {tx.photoUrl && (
                        <div>
                            <span className="form-label">📷 รูปถ่าย</span>
                            <img
                                src={tx.photoUrl}
                                alt="Delivery photo"
                                style={{ width: '100%', borderRadius: 'var(--radius-md)', maxHeight: '300px', objectFit: 'contain', background: 'var(--bg-input)' }}
                            />
                        </div>
                    )}

                    {tx.signatureUrl && (
                        <div>
                            <span className="form-label">✍️ ลายเซ็นผู้รับ</span>
                            <div style={{ background: 'white', borderRadius: 'var(--radius-md)', padding: 'var(--space-sm)' }}>
                                <img
                                    src={tx.signatureUrl}
                                    alt="Signature"
                                    style={{ width: '100%', maxHeight: '150px', objectFit: 'contain' }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
