'use client';

import { useState } from 'react';
import { PRODUCTS, type Product } from '@/lib/store';

interface ProductSelectorProps {
    selectedItems: { productId: number; quantity: number }[];
    onChange: (items: { productId: number; quantity: number }[]) => void;
}

export default function ProductSelector({
    selectedItems,
    onChange,
}: ProductSelectorProps) {
    const [activeProduct, setActiveProduct] = useState<number | null>(null);

    const getQty = (productId: number) => {
        return selectedItems.find((i) => i.productId === productId)?.quantity || 0;
    };

    const updateQty = (productId: number, delta: number) => {
        const current = [...selectedItems];
        const idx = current.findIndex((i) => i.productId === productId);
        const newQty = Math.max(0, getQty(productId) + delta);

        if (newQty === 0) {
            if (idx >= 0) current.splice(idx, 1);
        } else {
            if (idx >= 0) {
                current[idx] = { productId, quantity: newQty };
            } else {
                current.push({ productId, quantity: newQty });
            }
        }
        onChange(current);
    };

    const toggleProduct = (productId: number) => {
        if (activeProduct === productId) {
            setActiveProduct(null);
        } else {
            setActiveProduct(productId);
            if (getQty(productId) === 0) {
                updateQty(productId, 1);
            }
        }
    };

    return (
        <div className="flex-col">
            <div className="grid-3">
                {PRODUCTS.map((p) => {
                    const qty = getQty(p.id);
                    return (
                        <button
                            key={p.id}
                            type="button"
                            className={`btn-product ${qty > 0 ? 'selected' : ''}`}
                            onClick={() => toggleProduct(p.id)}
                        >
                            <span style={{ fontSize: '1.75rem' }}>{p.icon}</span>
                            <span className="product-name">{p.nameTh}</span>
                            {qty > 0 && (
                                <span
                                    className="badge badge-warning"
                                    style={{ fontSize: '0.875rem' }}
                                >
                                    × {qty}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {activeProduct && (
                <div
                    className="card"
                    style={{ marginTop: 'var(--space-md)', textAlign: 'center' }}
                >
                    <div style={{ marginBottom: 'var(--space-sm)' }}>
                        <span className="fw-bold">
                            {PRODUCTS.find((p) => p.id === activeProduct)?.nameTh}
                        </span>{' '}
                        <span className="text-muted">— ระบุจำนวน</span>
                    </div>
                    <div className="qty-stepper" style={{ justifyContent: 'center' }}>
                        <button
                            type="button"
                            onClick={() => updateQty(activeProduct, -1)}
                        >
                            −
                        </button>
                        <span className="qty-value">{getQty(activeProduct)}</span>
                        <button
                            type="button"
                            onClick={() => updateQty(activeProduct, 1)}
                        >
                            +
                        </button>
                    </div>
                </div>
            )}

            {selectedItems.length > 0 && (
                <div className="item-list mt-md">
                    {selectedItems.map((item) => {
                        const product = PRODUCTS.find((p) => p.id === item.productId);
                        return (
                            <div key={item.productId} className="item-row">
                                <span style={{ fontSize: '1.25rem' }}>{product?.icon}</span>
                                <span className="item-name">
                                    {product?.nameTh} × {item.quantity} {product?.unit}
                                </span>
                                <button
                                    type="button"
                                    className="item-remove"
                                    onClick={() => {
                                        onChange(
                                            selectedItems.filter(
                                                (i) => i.productId !== item.productId
                                            )
                                        );
                                        if (activeProduct === item.productId)
                                            setActiveProduct(null);
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
