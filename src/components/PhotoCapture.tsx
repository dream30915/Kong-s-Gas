'use client';

import { useRef, useState } from 'react';

interface PhotoCaptureProps {
    onCapture: (dataUrl: string) => void;
    label?: string;
    required?: boolean;
}

export default function PhotoCapture({
    onCapture,
    label = '📷 ถ่ายรูปหลักฐาน',
    required = false,
}: PhotoCaptureProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;

            // Compress image
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxSize = 800;
                let w = img.width;
                let h = img.height;

                if (w > maxSize || h > maxSize) {
                    if (w > h) {
                        h = (h / w) * maxSize;
                        w = maxSize;
                    } else {
                        w = (w / h) * maxSize;
                        h = maxSize;
                    }
                }

                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, w, h);
                const compressed = canvas.toDataURL('image/jpeg', 0.7);
                setPreview(compressed);
                onCapture(compressed);
            };
            img.src = result;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleChange}
                style={{ display: 'none' }}
                required={required}
            />

            {preview ? (
                <div
                    className="capture-zone has-content"
                    onClick={() => inputRef.current?.click()}
                >
                    <img src={preview} alt="Captured" />
                </div>
            ) : (
                <div
                    className="capture-zone"
                    onClick={() => inputRef.current?.click()}
                >
                    <span className="capture-icon">📷</span>
                    <span className="capture-text">{label}</span>
                    {required && (
                        <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>
                            * จำเป็นต้องถ่ายรูป
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
