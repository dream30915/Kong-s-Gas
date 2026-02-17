'use client';

import { CUSTOMERS } from '@/lib/store';

interface CustomerSelectorProps {
    value: number | null;
    onChange: (customerId: number) => void;
}

export default function CustomerSelector({
    value,
    onChange,
}: CustomerSelectorProps) {
    return (
        <div className="select-wrapper">
            <select
                className="form-select"
                value={value || ''}
                onChange={(e) => onChange(Number(e.target.value))}
            >
                <option value="" disabled>
                    — เลือกลูกค้า —
                </option>
                {CUSTOMERS.map((c) => (
                    <option key={c.id} value={c.id}>
                        {c.nameTh} ({c.name})
                    </option>
                ))}
            </select>
        </div>
    );
}
